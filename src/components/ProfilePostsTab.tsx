import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserVideos } from '@/hooks/useUserVideos';

const ProfilePostsTab = () => {
  const { user } = useAuth();
  const { videos } = useUserVideos(user?.id);

  return (
    <div className="p-4">
      <h2>Posts</h2>
      {videos.length > 0 ? (
        <div className="grid grid-cols--3 gap4">
          {videos.map((video) => (
            <div key={video.id} className="aspect-[4/5] rounded-lg overflow-hidden">
              <img src={video.thumbnail_url} alt={video.caption} className="w-full h-full object-cover" />
              <div className="absolute bottom-2 right-2 text-xs text-white bg-black/80 p-1 rounded-sm">{parseInt(video.like_count || 0)}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center italic">No posts yet</p>
      )}
    </div>
  );
};

export default ProfilePostsTab;{