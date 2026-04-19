import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Sound {
  id: string;
  title: string;
  creator_id: string;
  audio_url: string;
  duration: number;
  use_count: number;
  genre: string;
  is_original: boolean;
  source_video_id: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  is_saved?: boolean;
}

type SortMode = "trending" | "recent" | "favorites";

export const useSoundLibrary = () => {
  const { user } = useAuth();
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("trending");
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const fetchSavedIds = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_sounds")
      .select("sound_id")
      .eq("user_id", user.id);
    if (data) setSavedIds(new Set(data.map((d: any) => d.sound_id)));
  }, [user]);

  const fetchSounds = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sound_library")
        .select("*")
        .order(
          sortMode === "recent" ? "created_at" : "use_count",
          { ascending: false }
        )
        .limit(100);

      if (genre && genre !== "all") {
        query = query.eq("genre", genre);
      }

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        setSounds([]);
        setLoading(false);
        return;
      }

      // Fetch creator profiles
      const creatorIds = [...new Set(data.map((s: any) => s.creator_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", creatorIds);

      const profileMap = new Map<string, any>();
      profiles?.forEach((p: any) => profileMap.set(p.user_id, p));

      let enriched: Sound[] = data.map((s: any) => ({
        ...s,
        creator: profileMap.get(s.creator_id) || null,
        is_saved: savedIds.has(s.id),
      }));

      // Filter favorites
      if (sortMode === "favorites") {
        enriched = enriched.filter((s) => savedIds.has(s.id));
      }

      setSounds(enriched);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [sortMode, search, genre, savedIds]);

  useEffect(() => {
    fetchSavedIds();
  }, [fetchSavedIds]);

  useEffect(() => {
    fetchSounds();
  }, [fetchSounds]);

  const toggleSave = async (soundId: string) => {
    if (!user) {
      toast.error("Please sign in to save sounds");
      return;
    }

    const isSaved = savedIds.has(soundId);
    if (isSaved) {
      await supabase
        .from("saved_sounds")
        .delete()
        .eq("user_id", user.id)
        .eq("sound_id", soundId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(soundId);
        return next;
      });
      toast.success("Sound removed from favorites");
    } else {
      await supabase
        .from("saved_sounds")
        .insert({ user_id: user.id, sound_id: soundId });
      setSavedIds((prev) => new Set(prev).add(soundId));
      toast.success("Sound saved to favorites");
    }

    // Update local state
    setSounds((prev) =>
      prev.map((s) =>
        s.id === soundId ? { ...s, is_saved: !isSaved } : s
      )
    );
  };

  const uploadCustomSound = async (file: File, title: string) => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }

    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Audio file must be less than 20MB");
      return;
    }

    try {
      const fileName = `${user.id}/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("sounds")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("sounds").getPublicUrl(uploadData.path);

      // Get audio duration
      const audio = new Audio();
      const durationPromise = new Promise<number>((resolve) => {
        audio.onloadedmetadata = () => resolve(Math.floor(audio.duration));
        audio.onerror = () => resolve(30);
        audio.src = URL.createObjectURL(file);
      });
      const duration = await durationPromise;

      const { error: insertError } = await supabase.from("sound_library").insert({
        title: title || file.name.replace(/\.[^/.]+$/, ""),
        creator_id: user.id,
        audio_url: urlData.publicUrl,
        duration,
        is_original: true,
        genre: "custom",
      });

      if (insertError) throw insertError;

      toast.success("Sound uploaded successfully!");
      fetchSounds();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload sound");
    }
  };

  return {
    sounds,
    loading,
    sortMode,
    setSortMode,
    search,
    setSearch,
    genre,
    setGenre,
    toggleSave,
    uploadCustomSound,
    refetch: fetchSounds,
    savedIds,
  };
};
