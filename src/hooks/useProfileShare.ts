import { useCallback } from "react";
import { toast } from "sonner";

interface ShareOptions {
  userId: string;
  username: string | null;
  displayName: string | null;
}

export const useProfileShare = () => {
  const generateDeepLink = useCallback((userId: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/user/${userId}`;
  }, []);

  const shareProfile = useCallback(
    async ({ userId, username, displayName }: ShareOptions): Promise<boolean> => {
      const shareUrl = generateDeepLink(userId);
      const shareTitle = displayName || username || "Check out this profile!";
      const shareText = `Check out ${displayName || username || "this creator"}'s profile!`;

      // Try native share first (mobile)
      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          });
          return true;
        } catch (error) {
          // User cancelled or share failed, fall back to copy
          if ((error as Error).name !== "AbortError") {
            console.error("Share failed:", error);
          }
        }
      }

      // Fall back to clipboard copy
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Profile link copied!");
        return true;
      } catch (error) {
        toast.error("Failed to copy link");
        return false;
      }
    },
    [generateDeepLink]
  );

  // Share to specific platforms
  const shareToWhatsApp = useCallback(
    ({ userId, displayName, username }: ShareOptions) => {
      const shareUrl = generateDeepLink(userId);
      const text = `Check out ${displayName || username || "this creator"}'s profile! ${shareUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    },
    [generateDeepLink]
  );

  const shareToFacebook = useCallback(
    ({ userId }: ShareOptions) => {
      const shareUrl = generateDeepLink(userId);
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        "_blank"
      );
    },
    [generateDeepLink]
  );

  const shareToTwitter = useCallback(
    ({ userId, displayName, username }: ShareOptions) => {
      const shareUrl = generateDeepLink(userId);
      const text = `Check out ${displayName || username || "this creator"}'s profile!`;
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
        "_blank"
      );
    },
    [generateDeepLink]
  );

  const shareToTikTok = useCallback(
    ({ userId }: ShareOptions) => {
      const shareUrl = generateDeepLink(userId);
      // TikTok doesn't have a direct share URL, copy link instead
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied! Open TikTok to share.");
    },
    [generateDeepLink]
  );

  const copyLink = useCallback(
    async ({ userId }: ShareOptions): Promise<boolean> => {
      const shareUrl = generateDeepLink(userId);
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
        return true;
      } catch {
        toast.error("Failed to copy link");
        return false;
      }
    },
    [generateDeepLink]
  );

  return {
    shareProfile,
    shareToWhatsApp,
    shareToFacebook,
    shareToTwitter,
    shareToTikTok,
    copyLink,
    generateDeepLink,
  };
};
