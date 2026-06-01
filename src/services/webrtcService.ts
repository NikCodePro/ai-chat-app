import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
} from 'react-native-webrtc';
import { API_BASE_URL } from './api';
import { useAppStore } from '../store/appStore';

class WebRTCService {
  public pc: RTCPeerConnection | null = null;
  public sessionId: string | null = null;
  
  public onStream: ((stream: MediaStream) => void) | null = null;
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
      // 1. Create a new session with backend (which calls HeyGen)
      console.log("[WebRTC] Creating new avatar session...");
      const data = await this.post('/avatar/new', { avatar_name: avatarName });
      this.sessionId = data.session_id;

      // Extract ICE servers and SDP offer from HeyGen
      const iceServers = data.ice_servers2 || [];
      const offer = data.sdp;

      // 2. Initialize RTCPeerConnection
      this.pc = new RTCPeerConnection({
        iceServers: iceServers,
      });

      // 3. Handle Tracks (Audio/Video from Avatar)
      (this.pc as any).ontrack = (event: any) => {
        console.log("[WebRTC] Received remote track:", event.track.kind);
        if (event.streams && event.streams[0]) {
          if (this.onStream) {
            this.onStream(event.streams[0]);
          }
        }
      };

      // 4. Handle ICE Candidates
      (this.pc as any).onicecandidate = (event: any) => {
        if (event.candidate && this.sessionId) {
          console.log("[WebRTC] Sending ICE candidate to backend");
          this.post('/avatar/ice', {
            session_id: this.sessionId,
            candidate: event.candidate.toJSON(),
          }).catch(err => console.error("Failed to send ICE candidate", err));
        }
      };

      // 5. Handle Connection State
      (this.pc as any).onconnectionstatechange = () => {
        const state = this.pc?.connectionState || "unknown";
        console.log("[WebRTC] Connection state:", state);
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(state);
        }
      };

      // 6. Set Remote Description (HeyGen's Offer)
      console.log("[WebRTC] Setting remote description...");
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));

      // 7. Create Answer and set Local Description
      console.log("[WebRTC] Creating answer...");
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      // 8. Send Answer to Backend (to start HeyGen session)
      console.log("[WebRTC] Starting session with HeyGen...");
      await this.post('/avatar/start', {
        session_id: this.sessionId,
        sdp: answer,
      });

      console.log("[WebRTC] Avatar session started successfully.");
    } catch (error) {
      console.error("[WebRTC] Failed to start avatar session:", error);
      this.closeSession();
      throw error;
    }
  }

  async sendTask(text: string): Promise<void> {
    if (!this.sessionId) {
      console.warn("Cannot send task, no active avatar session.");
      return;
    }
    try {
      await this.post('/avatar/task', {
        session_id: this.sessionId,
        text: text,
      });
    } catch (error) {
      console.error("[WebRTC] Failed to send task:", error);
    }
  }

  async closeSession(): Promise<void> {
    if (this.sessionId) {
      try {
        await this.post('/avatar/stop', { session_id: this.sessionId });
      } catch (err) {
        console.error("Failed to stop session cleanly", err);
      }
      this.sessionId = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    this.onStream = null;
    this.onConnectionStateChange = null;
    console.log("[WebRTC] Avatar session closed.");
  }
}

export const webrtcService = new WebRTCService();
