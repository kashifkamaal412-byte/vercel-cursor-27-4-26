import { useState, useCallback, useEffect } from "react";
import { Video } from "./useVideos";

// IndexedDB for in-app video storage
const DB_NAME = "VideoDownloadsDB";
const DB_VERSION = 1;
const STORE_NAME = "videos";

interface DownloadedVideo {
  id: string;
  videoId: string;
  blob: Blob;
  thumbnail: string | null;
  caption: string | null;
  duration: number;
  creatorName: string | null;
  creatorAvatar: string | null;
  downloadedAt: number;
  videoType: "short" | "long";
}

interface DownloadProgress {
  videoId: string;
  progress: number;
  status: "pending" | "downloading" | "paused" | "complete" | "error";
}

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("videoId", "videoId", { unique: true });
        store.createIndex("downloadedAt", "downloadedAt", { unique: false });
      }
    };
  });
};

export const useDownloadManager = () => {
  const [downloads, setDownloads] = useState<Map<string, DownloadProgress>>(new Map());
  const [downloadedVideos, setDownloadedVideos] = useState<DownloadedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  // Load downloaded videos from IndexedDB
  const loadDownloadedVideos = useCallback(async () => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const videos = request.result as DownloadedVideo[];
        // Sort by download date, newest first
        videos.sort((a, b) => b.downloadedAt - a.downloadedAt);
        setDownloadedVideos(videos);
        setLoading(false);
      };

      request.onerror = () => {
        console.error("Failed to load downloads");
        setLoading(false);
      };
    } catch (error) {
      console.error("IndexedDB error:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDownloadedVideos();
  }, [loadDownloadedVideos]);

  // Check if video is downloaded
  const isDownloaded = useCallback(
    (videoId: string): boolean => {
      return downloadedVideos.some((v) => v.videoId === videoId);
    },
    [downloadedVideos]
  );

  // Get download progress
  const getProgress = useCallback(
    (videoId: string): DownloadProgress | null => {
      return downloads.get(videoId) || null;
    },
    [downloads]
  );

  // Download a video
  const downloadVideo = useCallback(
    async (
      video: Video,
      onProgress?: (progress: number) => void
    ): Promise<boolean> => {
      const videoId = video.id;

      // Check if already downloaded
      if (isDownloaded(videoId)) {
        return true;
      }

      // Check if already downloading
      const existingProgress = downloads.get(videoId);
      if (existingProgress && existingProgress.status === "downloading") {
        return false;
      }

      // Start download
      setDownloads((prev) => {
        const next = new Map(prev);
        next.set(videoId, { videoId, progress: 0, status: "downloading" });
        return next;
      });

      try {
        const response = await fetch(video.video_url);
        if (!response.ok) throw new Error("Fetch failed");

        const contentLength = Number(response.headers.get("content-length")) || 0;
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const chunks: ArrayBuffer[] = [];
        let receivedLength = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Convert Uint8Array to ArrayBuffer
          chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
          receivedLength += value.length;

          const progress = contentLength > 0 
            ? Math.round((receivedLength / contentLength) * 100)
            : Math.min(Math.round(receivedLength / 1024 / 1024), 99); // Estimate if no content-length

          setDownloads((prev) => {
            const next = new Map(prev);
            next.set(videoId, { videoId, progress, status: "downloading" });
            return next;
          });
          
          onProgress?.(progress);
        }

        // Combine chunks into blob
        const blob = new Blob(chunks, { type: "video/mp4" });

        // Store in IndexedDB
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        const downloadedVideo: DownloadedVideo = {
          id: crypto.randomUUID(),
          videoId: video.id,
          blob,
          thumbnail: video.thumbnail_url,
          caption: video.caption,
          duration: video.duration,
          creatorName: video.profile?.display_name || video.profile?.username || null,
          creatorAvatar: video.profile?.avatar_url || null,
          downloadedAt: Date.now(),
          videoType: video.video_type === "long" ? "long" : "short",
        };

        store.add(downloadedVideo);

        // Update state
        setDownloads((prev) => {
          const next = new Map(prev);
          next.set(videoId, { videoId, progress: 100, status: "complete" });
          return next;
        });

        setDownloadedVideos((prev) => [downloadedVideo, ...prev]);
        onProgress?.(100);

        return true;
      } catch (error) {
        console.error("Download failed:", error);
        setDownloads((prev) => {
          const next = new Map(prev);
          next.set(videoId, { videoId, progress: 0, status: "error" });
          return next;
        });
        return false;
      }
    },
    [downloads, isDownloaded]
  );

  // Delete a downloaded video
  const deleteDownload = useCallback(async (videoId: string): Promise<boolean> => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("videoId");
      const request = index.getKey(videoId);

      request.onsuccess = () => {
        if (request.result) {
          store.delete(request.result);
        }
      };

      setDownloadedVideos((prev) => prev.filter((v) => v.videoId !== videoId));
      setDownloads((prev) => {
        const next = new Map(prev);
        next.delete(videoId);
        return next;
      });

      return true;
    } catch (error) {
      console.error("Delete failed:", error);
      return false;
    }
  }, []);

  // Get video blob for playback
  const getVideoBlob = useCallback(
    (videoId: string): Blob | null => {
      const video = downloadedVideos.find((v) => v.videoId === videoId);
      return video?.blob || null;
    },
    [downloadedVideos]
  );

  // Get object URL for video playback
  const getVideoUrl = useCallback(
    (videoId: string): string | null => {
      const blob = getVideoBlob(videoId);
      return blob ? URL.createObjectURL(blob) : null;
    },
    [getVideoBlob]
  );

  return {
    downloadedVideos,
    loading,
    downloadVideo,
    deleteDownload,
    isDownloaded,
    getProgress,
    getVideoBlob,
    getVideoUrl,
    refetch: loadDownloadedVideos,
  };
};
