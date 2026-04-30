import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { LiveDiscovery } from "@/components/live/LiveDiscovery";
import { CreatorLiveRoom } from "@/components/live/CreatorLiveRoom";
import { ViewerLiveRoom } from "@/components/live/ViewerLiveRoom";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useLiveStream } from "@/hooks/useLiveStream";
import type { LiveStream } from "@/hooks/useLiveStream";

type LiveView = "discovery" | "creator-room" | "viewer-room";

const Live = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<LiveView>("discovery");
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const { endStream, joinStream, leaveStream, createStream } = useLiveStream();

  // Handle coming from Create page with stream already created
  useEffect(() => {
    const streamId = searchParams.get("streamId");
    if (streamId) {
      setSearchParams({}, { replace: true });
      setActiveStreamId(streamId);
      setView("creator-room");
    }
  }, []);

  const handleSelectStream = (stream: LiveStream) => {
    if (!user) {
      toast.error("Please sign in to watch");
      navigate("/auth");
      return;
    }
    setSelectedStream(stream);
    joinStream(stream.id);
    setView("viewer-room");
  };

  const handleCreatorExit = async () => {
    if (activeStreamId) {
      try { await endStream(activeStreamId); } catch {}
    }
    setView("discovery");
    setActiveStreamId(null);
  };

  const handleViewerExit = async () => {
    if (selectedStream) {
      try { await leaveStream(selectedStream.id); } catch {}
    }
    setView("discovery");
    setSelectedStream(null);
  };

  const handleStartLive = async () => {
    if (!user) {
      toast.error("Please sign in to start live");
      navigate("/auth");
      return;
    }
    try {
      const stream = await createStream("My Live Stream", "general", "public");
      setActiveStreamId(stream.id);
      setView("creator-room");
      toast.success("Starting live stream...");
    } catch (e) {
      console.error("Failed to start live:", e);
      toast.error("Failed to start live stream");
    }
  };

  if (view === "creator-room" && activeStreamId) {
    return (
      <CreatorLiveRoom
        streamId={activeStreamId}
        onEndLive={handleCreatorExit}
      />
    );
  }

  if (view === "viewer-room" && selectedStream) {
    return (
      <ViewerLiveRoom
        stream={selectedStream}
        onExit={handleViewerExit}
      />
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col items-center space-y-4 p-6">
        <button
          className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition-colors"
          onClick={handleStartLive}
        >
          🔴 Start Live Stream
        </button>
        <LiveDiscovery onSelectStream={handleSelectStream} />
      </div>
    </MainLayout>
  );
};

export default Live;
