// ZegoCloud Express Engine - Pure backend engine for custom UI
// This replaces @zegocloud/zego-uikit-prebuilt with core WebRTC engine

export interface ZegoEngineConfig {
  appID: number;
  serverSecret: string;
  userID: string;
  userName: string;
  roomID: string;
}

export interface ZegoStreamConfig {
  cameraOn?: boolean;
  micOn?: boolean;
  videoContainer?: HTMLElement | null;
}

export class ZegoExpressEngineWrapper {
  private zg: any = null;
  private localStream: any = null;
  private remoteStreams: Map<string, any> = new Map();
  private roomID: string = '';
  private token: string = '';
  private userID: string = '';
  private appID: number = 0;
  private isHost: boolean = false;
  private remoteStreamCallbacks: Array<(stream: any) => void> = [];

  constructor() {}

  /**
   * Initialize the ZegoExpressEngine
   */
  async initialize(config: ZegoEngineConfig, isHost: boolean = false): Promise<void> {
    try {
      // Dynamic import to avoid SSR issues
      const { ZegoExpressEngine } = await import('zego-express-engine-webrtc');
      
      this.appID = config.appID;
      this.userID = config.userID;
      this.roomID = config.roomID;
      this.isHost = isHost;

      // Create engine instance
      this.zg = new ZegoExpressEngine(config.appID, config.serverSecret);
      
      console.log('🔴 [ZegoEngine] Initialized with appID:', config.appID);
      
      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('❌ [ZegoEngine] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Store the token for later use. This mirrors the previous `setToken` call that existed in the UI kit wrapper.
   */
  setToken(token: string): void {
    this.token = token;
    console.log('🔴 [ZegoEngine] Token set');
  }

  /**
   * Generate token using Edge Function or test method
   */
  async generateToken(roomID: string, userID: string, isHost: boolean): Promise<string> {
    try {
      // Try to get token from Supabase Edge Function
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('generate-zego-token', {
        body: { 
          roomId: roomID, 
          role: isHost ? 'host' : 'audience',
          sessionKey: Math.random().toString(36).slice(2, 10)
        }
      });
      
      if (error) {
        console.warn('⚠️ [ZegoEngine] Edge Function failed, using test token:', error);
        return this.generateTestToken(roomID, userID, isHost);
      }
      
      console.log('🔴 [ZegoEngine] Token received from Edge Function');
      return data?.token || '';
    } catch (error) {
      console.warn('⚠️ [ZegoEngine] Token generation failed, using test token:', error);
      return this.generateTestToken(roomID, userID, isHost);
    }
  }

  /**
   * Generate test token (for development only)
   */
  private generateTestToken(roomID: string, userID: string, isHost: boolean): string {
    try {
      // Use the ZegoUIKitPrebuilt's test token generation if available
      // Or generate a simple token
      console.warn('⚠️ [ZegoEngine] Using client-side test token. Use Edge Function in production!');
      
      // For now, return empty - the Edge Function should be used
      return '';
    } catch (error) {
      console.error('❌ [ZegoEngine] Test token generation failed:', error);
      return '';
    }
  }

  /**
   * Login to a room
   */
  async loginRoom(token?: string): Promise<void> {
    if (!this.zg) throw new Error('Engine not initialized');

    try {
      const tokenToUse = token || this.token;
      
      await this.zg.loginRoom(this.roomID, tokenToUse, {
        userID: this.userID,
        userName: this.userID,
      });
      
      console.log('🔴 [ZegoEngine] Logged into room:', this.roomID);
    } catch (error) {
      console.error('❌ [ZegoEngine] Login failed:', error);
      throw error;
    }
  }

  /**
   * Create and publish local stream (for hosts)
   */
  async startPublishing(config: ZegoStreamConfig = {}): Promise<MediaStream | null> {
    if (!this.zg) throw new Error('Engine not initialized');
    if (!this.isHost) throw new Error('Not a host');

    try {
      // Create local stream
      this.localStream = await this.zg.createStream({
        camera: { video: config.cameraOn !== false, audio: config.micOn !== false },
      });

      // Play local preview in container
      if (config.videoContainer && this.localStream) {
        this.localStream.play(config.videoContainer, { muted: false });
        console.log('🔴 [ZegoEngine] Local video playing in container');
      }

      // Start publishing
      const streamID = `${this.roomID}_main`;
      await this.zg.startPublishingStream(streamID, this.localStream);
      
      console.log('🔴 [ZegoEngine] Publishing stream:', streamID);
      return this.localStream;
    } catch (error) {
      console.error('❌ [ZegoEngine] Publish failed:', error);
      throw error;
    }
  }

  /**
   * Start playing remote stream (for viewers)
   */
  async startPlaying(streamID: string, videoContainer: HTMLElement): Promise<void> {
    if (!this.zg) throw new Error('Engine not initialized');

    try {
      // Start playing remote stream
      const remoteStream = await this.zg.startPlayingStream(streamID);
      
      if (remoteStream && videoContainer) {
        remoteStream.play(videoContainer, { muted: false });
        this.remoteStreams.set(streamID, remoteStream);
        console.log('🔴 [ZegoEngine] Playing remote stream:', streamID);
      }
    } catch (error) {
      console.error('❌ [ZegoEngine] Play failed:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for room stream updates
   */
  private setupEventListeners(): void {
    if (!this.zg) return;

    // Listen for remote stream updates
    this.zg.on('roomStreamUpdate', (roomID: string, updateType: string, streamList: any[]) => {
      console.log('🔴 [ZegoEngine] Room stream update:', updateType, streamList);
      
      if (updateType === 'ADD') {
        streamList.forEach(stream => {
          console.log('🔴 [ZegoEngine] New stream added:', stream.streamID);
          this.remoteStreamCallbacks.forEach(callback => callback(stream));
        });
      } else if (updateType === 'DELETE') {
        streamList.forEach(stream => {
          console.log('🔴 [ZegoEngine] Stream removed:', stream.streamID);
          this.remoteStreams.delete(stream.streamID);
        });
      }
    });

    // Listen for room user updates
    this.zg.on('roomUserUpdate', (roomID: string, updateType: string, userList: any[]) => {
      console.log('🔴 [ZegoEngine] Room user update:', updateType, userList);
    });

    // Listen for stream state updates
    this.zg.on('publisherStateUpdate', (result: any) => {
      console.log('🔴 [ZegoEngine] Publisher state update:', result);
    });

    this.zg.on('playerStateUpdate', (result: any) => {
      console.log('🔴 [ZegoEngine] Player state update:', result);
    });
  }

  /**
   * Register callback for remote stream updates
   */
  onRemoteStreamUpdate(callback: (stream: any) => void): void {
    this.remoteStreamCallbacks.push(callback);
  }

  /**
   * Toggle camera
   */
  async toggleCamera(on: boolean): Promise<void> {
    if (!this.localStream) return;
    try {
      await this.localStream.muteVideo(!on);
      console.log('🔴 [ZegoEngine] Camera', on ? 'on' : 'off');
    } catch (error) {
      console.error('❌ [ZegoEngine] Toggle camera failed:', error);
    }
  }

  /**
   * Toggle microphone
   */
  async toggleMicrophone(on: boolean): Promise<void> {
    if (!this.localStream) return;
    try {
      await this.localStream.muteAudio(!on);
      console.log('🔴 [ZegoEngine] Microphone', on ? 'on' : 'off');
    } catch (error) {
      console.error('❌ [ZegoEngine] Toggle mic failed:', error);
    }
  }

  /**
   * Destroy and cleanup
   */
  async destroy(): Promise<void> {
    try {
      if (this.zg) {
        // Stop publishing
        if (this.localStream) {
          await this.zg.stopPublishingStream(`${this.roomID}_main`);
          this.localStream.stop();
          this.localStream = null;
        }

        // Stop playing remote streams
        this.remoteStreams.forEach((stream, streamID) => {
          this.zg.stopPlayingStream(streamID);
        });
        this.remoteStreams.clear();

        // Logout room
        await this.zg.logoutRoom(this.roomID);
        
        // Destroy engine
        this.zg.destroyEngine();
        this.zg = null;
      }
      
      console.log('🔴 [ZegoEngine] Destroyed');
    } catch (error) {
      console.error('❌ [ZegoEngine] Destroy failed:', error);
    }
  }
}

// Export singleton instance
export const zegoEngine = new ZegoExpressEngineWrapper();
