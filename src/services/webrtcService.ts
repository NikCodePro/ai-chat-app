import { API_BASE_URL } from './api';
import { useAppStore } from '../store/appStore';
import { Room, RoomEvent, RemoteTrack, RemoteParticipant } from 'livekit-client';

class WebRTCService {
  public room: Room | null = null;
  public sessionId: string | null = null;
  
  public onVideoTrack: ((track: RemoteTrack) => void) | null = null;
  public onConnectionStateChange: ((state: string) => void) | null = null;

  private async post(path: string, body: any): Promise<any> {
    const token = await useAppStore.getState().getValidToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = 'API request failed';
      try {
        const parsed = JSON.parse(text);
        errorMsg = parsed.message || parsed.detail || errorMsg;
      } catch {
        errorMsg = text || errorMsg;
      }
      throw new Error(errorMsg);
    }

    const resBody = await response.json();
    if (resBody && typeof resBody === 'object') {
      if ('success' in resBody && 'data' in resBody) {
        return resBody.data;
      }
    }
    return resBody;
  }

  async startAvatarSession(avatarName: string = "Anna_public_3_20240108"): Promise<void> {
    try {
      console.log("[LiveKit] Requesting new avatar session token...");
      const data = await this.post('/avatar/token', { avatar_name: avatarName });
      
      this.sessionId = data.session_id;
      const livekitUrl = data.livekit_url;
      const livekitToken = data.livekit_client_token;

      if (!livekitUrl || !livekitToken) {
        throw new Error("Missing LiveKit URL or Token from backend");
      }

      console.log("[LiveKit] Initializing Room...");
      this.room = new Room();

      this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        console.log("[LiveKit] Track subscribed:", track.kind);
        if (track.kind === 'video' && this.onVideoTrack) {
          this.onVideoTrack(track);
        }
      });

      this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("[LiveKit] Connection state:", state);
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(state);
        }
      });

      console.log("[LiveKit] Connecting to room...");
      await this.room.connect(livekitUrl, livekitToken);
      console.log("[LiveKit] Connected successfully!");

    } catch (error) {
      console.error("[LiveKit] Failed to start avatar session:", error);
      this.closeSession();
      throw error;
    }
  }

  async sendTask(text: string): Promise<void> {
    // Note: LiveAvatar might expect tasks differently.
    // If you need to send text, you usually send it via data channels or a specific LiveAvatar API.
    // Assuming backend still handles this if we keep the same task logic?
    // Actually, LiveKit agents usually listen to microphone audio directly!
    // But since you have custom audio pipeline, you might need to check HeyGen docs.
    console.warn("sendTask is not fully implemented for LiveAvatar via token yet.");
  }

  async closeSession(): Promise<void> {
    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }
    
    this.onVideoTrack = null;
    this.onConnectionStateChange = null;
    this.sessionId = null;
    console.log("[LiveKit] Avatar session closed.");
  }
}

export const webrtcService = new WebRTCService();
