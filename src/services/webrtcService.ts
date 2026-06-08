import { API_BASE_URL, fetchWithAuth } from './api';
import { Room, RoomEvent, RemoteTrack, RemoteParticipant } from 'livekit-client';

// LiveAvatar channel topics — from the official SDK const.ts
const LIVEKIT_COMMAND_CHANNEL_TOPIC = 'agent-control';
const LIVEKIT_SERVER_RESPONSE_CHANNEL_TOPIC = 'agent-response';

class WebRTCService {
  public room: Room | null = null;
  public sessionId: string | null = null;

  public onVideoTrack: ((track: RemoteTrack) => void) | null = null;
  public onConnectionStateChange: ((state: string) => void) | null = null;

  private async post(path: string, body: any): Promise<any> {
    const response = await fetchWithAuth(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

  async startAvatarSession(): Promise<void> {
    try {
      console.log('[LiveKit] Requesting new avatar session token...');
      const data = await this.post('/avatar/token', {});

      this.sessionId = data.session_id;
      const livekitUrl = data.livekit_url;
      const livekitToken = data.livekit_client_token;

      if (!livekitUrl || !livekitToken) {
        throw new Error('Missing LiveKit URL or Token from backend');
      }

      console.log('[LiveKit] Initializing Room...');
      this.room = new Room();

      this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _publication: any, _participant: RemoteParticipant) => {
        console.log('[LiveKit] Track subscribed:', track.kind);
        if (track.kind === 'video' && this.onVideoTrack) {
          this.onVideoTrack(track);
        }
      });

      this.room.on(RoomEvent.ConnectionStateChanged, (state: any) => {
        console.log('[LiveKit] Connection state:', state);
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(state);
        }
      });

      console.log('[LiveKit] Connecting to room...');
      await this.room.connect(livekitUrl, livekitToken);
      console.log('[LiveKit] Connected successfully!');

    } catch (error) {
      console.error('[LiveKit] Failed to start avatar session:', error);
      this.closeSession();
      throw error;
    }
  }

  /**
   * Tells the avatar to speak a text response.
   * Uses the official LiveAvatar "agent-control" LiveKit data channel.
   * 
   * AVATAR_SPEAK_RESPONSE (event_type) = the avatar speaks AI-generated text.
   */
  async sendTask(text: string): Promise<void> {
    if (!this.room || this.room.state !== 'connected') {
      console.warn('[LiveKit] Cannot send task — room not connected');
      return;
    }

    try {
      const eventId = crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

      const payload = {
        event_id: eventId,
        event_type: 'avatar.speak_response', // AVATAR_SPEAK_RESPONSE
        text: text,
      };

      const data = new TextEncoder().encode(JSON.stringify(payload));
      this.room.localParticipant.publishData(data, {
        reliable: true,
        topic: LIVEKIT_COMMAND_CHANNEL_TOPIC,
      });

      console.log('[LiveKit] Sent speak task to avatar:', text.slice(0, 60) + '...');
    } catch (error) {
      console.error('[LiveKit] Failed to send task:', error);
    }
  }

  async closeSession(): Promise<void> {
    // Tell the backend to stop the LiveAvatar session on the server first.
    // Without this, the session stays "active" and causes concurrency limit errors.
    try {
      await this.post('/avatar/stop', {});
    } catch (e) {
      console.warn('[LiveKit] Failed to stop session on server:', e);
    }

    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }

    this.onVideoTrack = null;
    this.onConnectionStateChange = null;
    this.sessionId = null;
    console.log('[LiveKit] Avatar session closed.');
  }
}

export const webrtcService = new WebRTCService();
