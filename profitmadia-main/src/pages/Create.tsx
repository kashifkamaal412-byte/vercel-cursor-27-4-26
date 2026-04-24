import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { CreateModeSelector, CreateMode } from "@/components/create/CreateModeSelector";
import { CameraRecorder } from "@/components/create/CameraRecorder";
import { GalleryUploader } from "@/components/create/GalleryUploader";
import { VideoEditor, VideoEditData } from "@/components/create/VideoEditor";
import { LightweightVideoEditor, LightweightEditData } from "@/components/create/editor/LightweightVideoEditor";
import { PostPublisher } from "@/components/create/PostPublisher";
import { LongVideoPublisher } from "@/components/create/LongVideoPublisher";
import { SoundVideoCreator, SoundVideoReadyConfig } from "@/components/create/SoundVideoCreator";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type CreateStep = "select" | "short" | "long" | "live" | "record" | "edit" | "longEdit" | "publish" | "sound";

const Create = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState<CreateStep>(() => {
    const state = location.state as any;
    return state?.soundMode ? "sound" : "select";
  });
  const [videoSource, setVideoSource] = useState<Blob | File | null>(null);
  const [editedVideo, setEditedVideo] = useState<VideoEditData | LightweightEditData | null>(null);
  const [skippedEditor, setSkippedEditor] = useState(false);
  const [videoType, setVideoType] = useState<"short" | "long" | null>(null);
  const [soundConfig, setSoundConfig] = useState<SoundVideoReadyConfig | null>(null);

  // Sound state from navigation
  const navState = location.state as any;
  const preloadedMusic = navState?.preloadedMusic || "";
  const musicUrl = navState?.musicUrl || "";

  const handleModeSelect = (mode: CreateMode) => {
    if (!user && mode !== "select") {
      toast.error("Please sign in to create videos");
      navigate("/auth");
      return;
    }
    if (mode === "live") return;
    if (mode === "record") {
      setSoundConfig(null);
      setVideoType("short");
      setStep("record");
      return;
    }
    setSoundConfig(null);
    setVideoType(mode as "short" | "long");
    setStep(mode as CreateStep);
  };

  const handleVideoRecorded = (blob: Blob) => {
    setVideoSource(blob);
    setSoundConfig(null);
    setStep("edit");
  };

  const handleVideoSelected = (file: File, skipEditor?: boolean) => {
    setVideoSource(file);
    setSoundConfig(null);
    setSkippedEditor(!!skipEditor);
    if (skipEditor) {
      setStep("publish");
    } else {
      setStep(videoType === "long" ? "longEdit" : "edit");
    }
  };

  const handleEditComplete = (data: VideoEditData | LightweightEditData) => {
    setEditedVideo(data);
    setStep("publish");
  };

  const handleSoundVideoReady = (blob: Blob, config: SoundVideoReadyConfig) => {
    setVideoSource(blob);
    setVideoType("short");
    setSoundConfig(config);
    setStep("edit");
  };

  const handlePublish = () => {
    setVideoSource(null);
    setEditedVideo(null);
    setSkippedEditor(false);
    setSoundConfig(null);
    setStep("select");
    navigate("/");
  };

  const handleBack = () => {
    switch (step) {
      case "sound":
        setSoundConfig(null);
        setStep("select");
        navigate("/create", { replace: true, state: {} });
        break;
      case "record":
      case "short":
      case "long":
      case "live":
        setStep("select");
        setVideoType(null);
        setSoundConfig(null);
        break;
      case "edit":
      case "longEdit":
        setVideoSource(null);
        setStep("select");
        setVideoType(null);
        setSoundConfig(null);
        break;
      case "publish":
        if (skippedEditor) {
          setVideoSource(null);
          setSkippedEditor(false);
          setStep("select");
          setVideoType(null);
          setSoundConfig(null);
        } else {
          setStep("edit");
        }
        break;
      default:
        navigate("/");
    }
  };

  const renderStep = () => {
    switch (step) {
      case "select":
        return <CreateModeSelector onSelectMode={handleModeSelect} />;

      case "sound":
        return (
          <SoundVideoCreator
            soundTitle={preloadedMusic}
            soundUrl={musicUrl}
            onBack={handleBack}
            onVideoReady={handleSoundVideoReady}
          />
        );

      case "record":
        return (
          <CameraRecorder
            onBack={handleBack}
            onVideoRecorded={handleVideoRecorded}
          />
        );

      case "short":
      case "long":
        return (
          <GalleryUploader
            onBack={handleBack}
            onVideoSelected={handleVideoSelected}
            videoType={videoType}
          />
        );

      case "edit":
        return (
          <VideoEditor
            onBack={handleBack}
            videoSource={videoSource}
            onComplete={handleEditComplete}
            preloadedSound={soundConfig ? { title: soundConfig.title, url: soundConfig.url } : null}
            initialEditorSettings={
              soundConfig
                ? {
                    trimStart: soundConfig.trimStart,
                    trimEnd: soundConfig.trimEnd,
                    speed: soundConfig.videoSpeed,
                    musicSpeed: soundConfig.soundSpeed,
                    videoVolume: soundConfig.videoVolume,
                    musicVolume: soundConfig.soundVolume,
                  }
                : null
            }
          />
        );

      case "longEdit":
        return (
          <LightweightVideoEditor
            onBack={handleBack}
            videoSource={videoSource}
            onComplete={handleEditComplete}
          />
        );

      case "publish":
        if (videoType === "long") {
          return (
            <LongVideoPublisher
              onBack={handleBack}
              videoData={editedVideo || videoSource}
              onPublish={handlePublish}
            />
          );
        }
        return (
          <PostPublisher
            onBack={handleBack}
            videoData={editedVideo || videoSource}
            onPublish={handlePublish}
            videoType={videoType || "short"}
          />
        );

      default:
        return <CreateModeSelector onSelectMode={handleModeSelect} />;
    }
  };

  return (
    <MainLayout hideNav={step !== "select"}>
      {renderStep()}
    </MainLayout>
  );
};

export default Create;
