import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditSettings {
  trimStart: number;
  trimEnd: number;
  aspectRatio: string;
  audioUrl?: string;
  audioVolume?: number;
}

interface RenderResult {
  success: boolean;
  permanentUrl?: string;
  error?: string;
}

interface RenderState {
  isRendering: boolean;
  progress: number;
  status: 'idle' | 'starting' | 'rendering' | 'saving' | 'complete' | 'error';
  error: string | null;
}

export const useShotstackRender = () => {
  const [state, setState] = useState<RenderState>({
    isRendering: false,
    progress: 0,
    status: 'idle',
    error: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);

  const updateState = useCallback((updates: Partial<RenderState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    updateState({ 
      isRendering: false, 
      status: 'idle', 
      progress: 0,
      error: 'Cancelled by user' 
    });
    toast.info("Render cancelled");
  }, [updateState]);

  const renderVideo = useCallback(async (
    videoUrl: string,
    editSettings: EditSettings
  ): Promise<RenderResult> => {
    // Reset state
    isCancelledRef.current = false;
    abortControllerRef.current = new AbortController();
    
    updateState({
      isRendering: true,
      progress: 0,
      status: 'starting',
      error: null,
    });

    try {
      // Validate inputs before starting
      if (!videoUrl) {
        throw new Error('Video URL is required');
      }

      if (!editSettings) {
        throw new Error('Edit settings are required');
      }

      // Validate aspect ratio - preserve original if not specified
      const validAspectRatios = ['1:1', '9:16', '16:9', '4:5', '4:3', '3:4'];
      const aspectRatio = validAspectRatios.includes(editSettings.aspectRatio) 
        ? editSettings.aspectRatio 
        : '16:9'; // Default to 16:9 for compatibility

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please sign in to render videos.');
      }

      if (isCancelledRef.current) {
        return { success: false, error: 'Cancelled' };
      }

      // Step 1: Start the render
      updateState({ status: 'rendering', progress: 5 });
      
      console.log('Starting Shotstack render with settings:', {
        videoUrl: videoUrl.substring(0, 50) + '...',
        aspectRatio,
        trimStart: editSettings.trimStart,
        trimEnd: editSettings.trimEnd,
      });

      const renderResponse = await supabase.functions.invoke('shotstack-render', {
        body: {
          action: 'render',
          videoUrl,
          editSettings: {
            ...editSettings,
            aspectRatio, // Use validated aspect ratio
          },
        },
      });

      if (isCancelledRef.current) {
        return { success: false, error: 'Cancelled' };
      }

      if (renderResponse.error) {
        console.error('Shotstack render invocation error:', renderResponse.error);
        throw new Error(`Failed to start render: ${renderResponse.error.message || 'Unknown error'}`);
      }

      if (!renderResponse.data?.success) {
        const errorMsg = renderResponse.data?.error || 'Failed to start render - no success response';
        console.error('Shotstack render failed:', errorMsg);
        throw new Error(errorMsg);
      }

      const renderId = renderResponse.data.renderId;
      
      if (!renderId) {
        throw new Error('No render ID received from server');
      }

      console.log('Render started with ID:', renderId);
      updateState({ progress: 10 });

      // Step 2: Poll for completion with exponential backoff
      let renderComplete = false;
      let shotstackUrl = '';
      let pollCount = 0;
      const maxPolls = 120; // 10 minutes maximum (with varying intervals)

      while (!renderComplete && pollCount < maxPolls) {
        if (isCancelledRef.current) {
          return { success: false, error: 'Cancelled' };
        }

        // Exponential backoff: start at 2s, max at 5s
        const pollInterval = Math.min(2000 + (pollCount * 100), 5000);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        pollCount++;

        try {
          const statusResponse = await supabase.functions.invoke('shotstack-render', {
            body: {
              action: 'status',
              renderId,
            },
          });

          if (statusResponse.error) {
            console.warn('Status check error (will retry):', statusResponse.error);
            continue; // Retry on transient errors
          }

          const statusData = statusResponse.data;
          
          if (!statusData) {
            console.warn('Empty status response (will retry)');
            continue;
          }

          // Update progress based on Shotstack progress (scale to 10-90%)
          const shotstackProgress = statusData.progress || 0;
          const scaledProgress = 10 + (shotstackProgress * 0.8); // 10% to 90%
          updateState({ progress: Math.round(scaledProgress) });

          console.log('Render status:', statusData.status, 'Progress:', shotstackProgress);

          if (statusData.status === 'done') {
            renderComplete = true;
            shotstackUrl = statusData.url;
            
            if (!shotstackUrl) {
              throw new Error('Render completed but no URL received');
            }
          } else if (statusData.status === 'failed') {
            throw new Error('Video render failed on server. Please try again with different settings.');
          }
        } catch (pollError: any) {
          // Only throw if it's a definitive failure, not a network hiccup
          if (pollError.message?.includes('failed') || pollError.message?.includes('Render completed')) {
            throw pollError;
          }
          console.warn('Poll error (will retry):', pollError.message);
        }
      }

      if (!renderComplete) {
        throw new Error('Render timed out. The video may be too long or complex. Please try with a shorter clip.');
      }

      if (isCancelledRef.current) {
        return { success: false, error: 'Cancelled' };
      }

      // Step 3: Transfer to permanent storage
      updateState({ status: 'saving', progress: 92 });
      console.log('Transferring to permanent storage...');

      const transferResponse = await supabase.functions.invoke('shotstack-render', {
        body: {
          action: 'transfer',
          sourceUrl: shotstackUrl,
        },
      });

      if (transferResponse.error) {
        console.error('Transfer error:', transferResponse.error);
        throw new Error(`Failed to save video: ${transferResponse.error.message || 'Storage error'}`);
      }

      if (!transferResponse.data?.success) {
        throw new Error(transferResponse.data?.error || 'Failed to save video to permanent storage');
      }

      const permanentUrl = transferResponse.data.permanentUrl;
      
      if (!permanentUrl) {
        throw new Error('No permanent URL received after transfer');
      }

      updateState({ progress: 100, status: 'complete' });
      console.log('Render complete! URL:', permanentUrl);

      return {
        success: true,
        permanentUrl,
      };

    } catch (error: any) {
      console.error('Render error:', error);
      
      const errorMessage = error.message || 'Render failed. Please try again.';
      
      updateState({ 
        status: 'error',
        error: errorMessage,
      });
      
      // Show user-friendly error
      toast.error(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      if (!isCancelledRef.current) {
        updateState({ isRendering: false });
      }
      abortControllerRef.current = null;
    }
  }, [updateState]);

  return {
    renderVideo,
    cancel,
    isRendering: state.isRendering,
    progress: state.progress,
    status: state.status,
    error: state.error,
  };
};
