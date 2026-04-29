import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_EXPIRY = 3600; // 1 hour
const urlCache = new Map<string, { url: string; expiry: number }>();

/**
 * Extract the storage path from a full Supabase public URL or return as-is if already a path.
 * Handles both old full URLs and new relative paths.
 */
function extractStoragePath(urlOrPath: string, bucket: string): string {
  // If it's already a relative path (no http), return as-is
  if (!urlOrPath.startsWith("http")) return urlOrPath;

  // Extract path from full public URL patterns:
  // .../storage/v1/object/public/videos/userId/file.mp4
  // .../storage/v1/object/sign/videos/userId/file.mp4
  const patterns = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
    `/storage/v1/object/${bucket}/`,
  ];

  for (const pattern of patterns) {
    const idx = urlOrPath.indexOf(pattern);
    if (idx !== -1) {
      const path = urlOrPath.slice(idx + pattern.length);
      // Remove query params
      return path.split("?")[0];
    }
  }

  // Fallback: return the original URL (might be external)
  return urlOrPath;
}

/**
 * Check if a URL is a Supabase storage URL for the given bucket
 */
function isStorageUrl(url: string, bucket: string): boolean {
  // Data URLs (Base64) are not storage URLs and should be used as‑is
  if (url.startsWith("data:")) return false;
  // Relative paths (no protocol) are considered storage URLs
  if (!url.startsWith("http")) return true;
  // Full Supabase storage URLs contain the storage path and bucket name
  return url.includes(`/storage/`) && url.includes(`/${bucket}/`);
}

/**
 * Resolve a video URL to a signed URL if it's from Supabase storage.
 * Returns the original URL for external URLs.
 * Uses in-memory cache to avoid re-signing within the expiry window.
 */
export async function resolveSignedUrl(
  urlOrPath: string | null | undefined,
  bucket = "videos"
): Promise<string | null> {
  if (!urlOrPath) return null;

  // Skip non-storage URLs (e.g., external CDN links, data URLs, draft files)
  if (urlOrPath.startsWith("data:")) return urlOrPath;
  if (urlOrPath.startsWith("http") && !isStorageUrl(urlOrPath, bucket)) {
    return urlOrPath;
  }

  // Skip draft files (they don't exist in storage)
  const storagePath = extractStoragePath(urlOrPath, bucket);
  if (storagePath.includes("draft_") || storagePath.includes("/draft")) {
    console.warn(`[storageUrl] Skipping draft file: ${storagePath}`);
    return null;
  }

  // Check cache
  const cached = urlCache.get(`${bucket}:${storagePath}`);
  if (cached && cached.expiry > Date.now()) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    // Object not found (404) or other error - return null to trigger fallback UI
    if (error?.message?.includes("Object not found") || error?.status === 400) {
      console.warn(`[storageUrl] Object not found: ${bucket}/${storagePath}`);
      return null;
    }
    console.warn(`[storageUrl] Failed to sign ${bucket}/${storagePath}:`, error?.message);
    // Return original as fallback for non-critical errors
    return urlOrPath;
  }

  // Cache with 5-minute buffer before actual expiry
  urlCache.set(`${bucket}:${storagePath}`, {
    url: data.signedUrl,
    expiry: Date.now() + (SIGNED_URL_EXPIRY - 300) * 1000,
  });

  return data.signedUrl;
}

/**
 * Batch-resolve signed URLs for an array of videos.
 * Resolves both video_url and thumbnail_url fields.
 */
export async function resolveVideoUrls<T extends { video_url: string; thumbnail_url?: string | null }>(
  videos: T[]
): Promise<T[]> {
  if (videos.length === 0) return videos;

  const results = await Promise.all(
    videos.map(async (video) => {
      const [signedVideoUrl, signedThumbUrl] = await Promise.all([
        resolveSignedUrl(video.video_url, "videos"),
        video.thumbnail_url ? resolveSignedUrl(video.thumbnail_url, "thumbnails") : Promise.resolve(null),
      ]);

      return {
        ...video,
        video_url: signedVideoUrl || video.video_url,
        thumbnail_url: signedThumbUrl ?? video.thumbnail_url,
      };
    })
  );

  return results;
}

/**
 * Clear the signed URL cache (useful on auth state changes)
 */
export function clearUrlCache() {
  urlCache.clear();
}
