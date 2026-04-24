export interface VideoData {
  id: string;
  thumbnail: string;
  videoUrl?: string;
  username: string;
  userAvatar: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  music?: string;
  isVerified: boolean;
  isLiked: boolean;
  tags: string[];
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  following: number;
  followers: number;
  likes: number;
  isVerified: boolean;
  videos: VideoData[];
}

// Empty arrays - users will create their own content
export const videos: VideoData[] = [];
export const trendingVideos: VideoData[] = [];
export const forYouVideos: VideoData[] = [];
