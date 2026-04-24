import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Save, Loader2, Link2, Plus, ImageIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeProfileField, sanitizeUrl } from "@/lib/sanitize";

const BIO_MAX_LENGTH = 150;

type CropMode = "avatar" | "cover" | null;

const EditProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile, updateProfile, uploadAvatar, uploadCover } = useProfile();

  const fileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const croppedAvatarFileRef = useRef<File | null>(null);

  const [formData, setFormData] = useState({
    display_name: "",
    username: "",
    bio: "",
    website: "",
  });

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<CropMode>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [bioError, setBioError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) navigate("/auth");
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        website: profile.website || "",
      });
      if (profile.website) setShowLinkInput(true);
    }
  }, [profile, user]);

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSelectImage = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCropMode("avatar");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
  };

  const handleSelectCover = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCropMode("cover");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
  };

  const createImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
    });

  const getCroppedImg = async () => {
    const image = await createImage(imageSrc!);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);
    return new Promise<File>((resolve) => {
      canvas.toBlob((blob) => {
        const name = cropMode === "avatar" ? "avatar.jpg" : "cover.jpg";
        resolve(new File([blob!], name, { type: "image/jpeg" }));
      }, "image/jpeg");
    });
  };

  const handleCropDone = async () => {
    if (!croppedAreaPixels || !cropMode) return;
    const croppedFile = await getCroppedImg();
    if (cropMode === "avatar") {
      croppedAvatarFileRef.current = croppedFile;
      setAvatarPreviewUrl(URL.createObjectURL(croppedFile));
    } else {
      setCoverPreview(URL.createObjectURL(croppedFile));
      setCoverFile(croppedFile);
    }
    setImageSrc(null);
    setCropMode(null);
  };

  const handleBioChange = (value: string) => {
    if (value.length > BIO_MAX_LENGTH) {
      setBioError(`Bio cannot exceed ${BIO_MAX_LENGTH} characters`);
    } else {
      setBioError("");
    }
    setFormData({ ...formData, bio: value });
  };

  const checkUsernameTaken = async (username: string): Promise<boolean> => {
    if (!username.trim()) return false;
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", username.trim())
      .neq("user_id", user?.id || "")
      .maybeSingle();
    return !!data;
  };

  const handleSave = async () => {
    if (formData.bio.length > BIO_MAX_LENGTH) {
      setBioError(`Bio cannot exceed ${BIO_MAX_LENGTH} characters. Currently ${formData.bio.length}.`);
      return;
    }

    try {
      setSaving(true);
      setUsernameError("");

      if (formData.username.trim() && formData.username !== profile?.username) {
        const taken = await checkUsernameTaken(formData.username);
        if (taken) {
          setUsernameError("This username is already taken.");
          setSaving(false);
          return;
        }
      }

      let avatar_url = profile?.avatar_url;
      if (croppedAvatarFileRef.current) {
        const uploaded = await uploadAvatar(croppedAvatarFileRef.current);
        avatar_url = uploaded;
      }

      let cover_url = profile?.cover_url;
      if (coverFile) {
        const uploaded = await uploadCover(coverFile);
        cover_url = uploaded;
      }

      await updateProfile.mutateAsync({
        display_name: sanitizeProfileField(formData.display_name || '', 100),
        username: sanitizeProfileField(formData.username || '', 50),
        bio: sanitizeProfileField(formData.bio || '', BIO_MAX_LENGTH),
        website: sanitizeUrl(formData.website || ''),
        avatar_url,
        cover_url,
      });

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved!");
      navigate("/profile");
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const displayAvatarUrl = avatarPreviewUrl || profile?.avatar_url;
  const displayCoverUrl = coverPreview || profile?.cover_url;

  return (
    <MainLayout>
      <div className="min-h-screen pb-20">
        {/* Header */}
        <div className="flex justify-between items-center p-4">
          <Button variant="ghost" onClick={() => navigate("/profile")}>
            <ArrowLeft />
          </Button>
          <h1 className="text-base font-semibold">Edit Profile</h1>
          <Button onClick={handleSave} disabled={saving || formData.bio.length > BIO_MAX_LENGTH}>
            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : "Save"}
            {!saving && <Save className="w-4 h-4 ml-2" />}
          </Button>
        </div>

        {/* Cover Photo Section */}
        <div className="relative h-44 mx-4 rounded-xl overflow-hidden mb-4">
          {displayCoverUrl ? (
            <img src={displayCoverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs opacity-70">Add Cover Photo</p>
              </div>
            </div>
          )}
          <button
            onClick={() => coverFileRef.current?.click()}
            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1.5 hover:bg-black/80 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            {displayCoverUrl ? "Change Cover" : "Add Cover"}
          </button>
          <input ref={coverFileRef} type="file" accept="image/*" hidden onChange={handleSelectCover} />
        </div>

        {/* Avatar overlapping cover */}
        <div className="flex justify-center -mt-10 mb-2 relative z-10">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-background">
              <AvatarImage src={displayAvatarUrl || undefined} />
              <AvatarFallback className="bg-muted text-foreground text-2xl">
                {formData.display_name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-background"
            >
              <Camera className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleSelectImage} />
        </div>

        {/* Cropper Modal */}
        {imageSrc && cropMode && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
            <div className="flex items-center justify-between p-4">
              <Button variant="ghost" className="text-white" onClick={() => { setImageSrc(null); setCropMode(null); }}>
                Cancel
              </Button>
              <p className="text-white font-medium">
                {cropMode === "avatar" ? "Crop Avatar" : "Crop Cover Photo"}
              </p>
              <Button variant="ghost" className="text-primary font-semibold" onClick={handleCropDone}>
                Done
              </Button>
            </div>
            <div className="flex-1 relative">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={cropMode === "avatar" ? 1 : 16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape={cropMode === "avatar" ? "round" : "rect"}
              />
            </div>
            <div className="p-4 pb-8">
              <input type="range" min={1} max={3} step={0.1} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
            </div>
          </div>
        )}

        {/* Form */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 px-4 mt-4">
          <Input
            placeholder="Display Name"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          />
          <div>
            <Input
              placeholder="Username"
              value={formData.username}
              onChange={(e) => { setFormData({ ...formData, username: e.target.value }); setUsernameError(""); }}
              className={usernameError ? "border-destructive" : ""}
            />
            {usernameError && (
              <span className="text-xs text-destructive font-medium mt-1 block">{usernameError}</span>
            )}
          </div>

          <div>
            <Textarea
              placeholder="Bio"
              value={formData.bio}
              onChange={(e) => handleBioChange(e.target.value)}
              maxLength={BIO_MAX_LENGTH + 10}
              className={bioError ? "border-destructive" : ""}
            />
            <div className="flex justify-between items-center mt-1">
              {bioError ? (
                <span className="text-xs text-destructive font-medium">{bioError}</span>
              ) : (
                <span className="text-xs text-muted-foreground" />
              )}
              <span className={`text-xs tabular-nums ${formData.bio.length > BIO_MAX_LENGTH ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                {formData.bio.length}/{BIO_MAX_LENGTH}
              </span>
            </div>
          </div>

          {showLinkInput ? (
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="https://your-link.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                type="url"
              />
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowLinkInput(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default EditProfile;
