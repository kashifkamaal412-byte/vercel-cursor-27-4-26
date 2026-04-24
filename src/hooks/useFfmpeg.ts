import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface TrimOptions {
  startTime: number;
  endTime: number;
}

interface FfmpegProgress {
  progress: number;
  time: number;
}

export const useFfmpeg = () => {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (ffmpegRef.current && isLoaded) return true;

    try {
      setLoadError(null);
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      ffmpeg.on('progress', ({ progress: p, time }: FfmpegProgress) => {
        setProgress(Math.round(p * 100));
      });

      // Load FFmpeg core from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      setIsLoaded(true);
      console.log('FFmpeg loaded successfully');
      return true;
    } catch (error: any) {
      console.error('Failed to load FFmpeg:', error);
      setLoadError(error.message || 'Failed to load FFmpeg');
      return false;
    }
  }, [isLoaded]);

  const getAudioInputName = (audioFile: File | Blob) => {
    const mime = (audioFile.type || "").toLowerCase();
    if (mime.includes("webm")) return "audio.webm";
    if (mime.includes("ogg")) return "audio.ogg";
    if (mime.includes("wav")) return "audio.wav";
    if (mime.includes("mp4")) return "audio.mp4";
    if (mime.includes("aac")) return "audio.aac";
    return "audio.mp3";
  };

  const trimVideo = useCallback(async (
    videoFile: File | Blob,
    options: TrimOptions
  ): Promise<Blob | null> => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg || !isLoaded) {
      console.error('FFmpeg not loaded');
      return null;
    }

    try {
      setIsProcessing(true);
      setProgress(0);

      const inputName = 'input.mp4';
      const outputName = 'output.mp4';

      // Write input file to FFmpeg virtual filesystem
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      const duration = options.endTime - options.startTime;

      // Run FFmpeg trim command
      await ffmpeg.exec([
        '-i', inputName,
        '-ss', options.startTime.toString(),
        '-t', duration.toString(),
        '-c', 'copy', // Fast copy without re-encoding
        '-avoid_negative_ts', 'make_zero',
        outputName
      ]);

      // Read output file
      const data = await ffmpeg.readFile(outputName);
      const uint8Array = new Uint8Array(data as Uint8Array);
      const outputBlob = new Blob([uint8Array], { type: 'video/mp4' });

      // Cleanup
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      setProgress(100);
      return outputBlob;
    } catch (error: any) {
      console.error('FFmpeg trim error:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isLoaded]);

  const addAudioToVideo = useCallback(async (
    videoFile: File | Blob,
    audioFile: File | Blob,
    videoVolume: number = 1,
    audioVolume: number = 0.5
  ): Promise<Blob | null> => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg || !isLoaded) {
      console.error('FFmpeg not loaded');
      return null;
    }

    try {
      setIsProcessing(true);
      setProgress(0);

      const videoInput = 'video.mp4';
      const audioInput = getAudioInputName(audioFile);
      const outputName = 'output.mp4';

      // Write files to FFmpeg virtual filesystem
      await ffmpeg.writeFile(videoInput, await fetchFile(videoFile));
      await ffmpeg.writeFile(audioInput, await fetchFile(audioFile));

      // Mix audio with video
      await ffmpeg.exec([
        '-i', videoInput,
        '-i', audioInput,
        '-filter_complex', 
        `[0:a]volume=${videoVolume}[a0];[1:a]volume=${audioVolume}[a1];[a0][a1]amix=inputs=2:duration=first[aout]`,
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        outputName
      ]);

      // Read output file
      const data = await ffmpeg.readFile(outputName);
      const uint8Array = new Uint8Array(data as Uint8Array);
      const outputBlob = new Blob([uint8Array], { type: 'video/mp4' });

      // Cleanup
      await ffmpeg.deleteFile(videoInput);
      await ffmpeg.deleteFile(audioInput);
      await ffmpeg.deleteFile(outputName);

      setProgress(100);
      return outputBlob;
    } catch (error: any) {
      console.error('FFmpeg audio mix error:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isLoaded]);

  const processVideo = useCallback(async (
    videoFile: File | Blob,
    options: {
      trimStart?: number;
      trimEnd?: number;
      audioFile?: File | Blob | null;
      videoVolume?: number;
      audioVolume?: number;
      audioSpeed?: number;
    }
  ): Promise<Blob | null> => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg || !isLoaded) {
      console.error('FFmpeg not loaded');
      return null;
    }

    try {
      setIsProcessing(true);
      setProgress(0);

      const videoInput = 'input.mp4';
      const outputName = 'output.mp4';
      let audioInput: string | null = null;
      
      // Write video file
      await ffmpeg.writeFile(videoInput, await fetchFile(videoFile));

      const ffmpegArgs: string[] = ['-i', videoInput];

      // Handle audio file if provided
      if (options.audioFile) {
        audioInput = getAudioInputName(options.audioFile);
        await ffmpeg.writeFile(audioInput, await fetchFile(options.audioFile));
        ffmpegArgs.push('-i', audioInput);
      }

      // Trim options
      if (options.trimStart !== undefined && options.trimStart > 0) {
        ffmpegArgs.push('-ss', options.trimStart.toString());
      }
      
      if (options.trimEnd !== undefined && options.trimStart !== undefined) {
        const duration = options.trimEnd - (options.trimStart || 0);
        if (duration > 0) {
          ffmpegArgs.push('-t', duration.toString());
        }
      }

      // Audio mixing
      if (options.audioFile) {
        const vidVol = (options.videoVolume ?? 100) / 100;
        const audVol = (options.audioVolume ?? 50) / 100;
        const audSpeed = Math.max(0.5, Math.min(2, options.audioSpeed ?? 1));
        ffmpegArgs.push(
          '-filter_complex',
          `[0:a]volume=${vidVol}[a0];[1:a]atempo=${audSpeed},volume=${audVol}[a1];[a0][a1]amix=inputs=2:duration=first[aout]`,
          '-map', '0:v',
          '-map', '[aout]',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-c:a', 'aac'
        );
      } else {
        // Simple copy if no audio mixing
        ffmpegArgs.push('-c', 'copy');
      }

      ffmpegArgs.push('-avoid_negative_ts', 'make_zero', outputName);

      // Execute FFmpeg
      await ffmpeg.exec(ffmpegArgs);

      // Read output
      const data = await ffmpeg.readFile(outputName);
      const uint8Array = new Uint8Array(data as Uint8Array);
      const outputBlob = new Blob([uint8Array], { type: 'video/mp4' });

      // Cleanup
      await ffmpeg.deleteFile(videoInput);
      if (audioInput) {
        try { await ffmpeg.deleteFile(audioInput); } catch {}
      }
      await ffmpeg.deleteFile(outputName);

      setProgress(100);
      return outputBlob;
    } catch (error: any) {
      console.error('FFmpeg process error:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isLoaded]);

  return {
    load,
    isLoaded,
    isProcessing,
    progress,
    loadError,
    trimVideo,
    addAudioToVideo,
    processVideo,
  };
};
