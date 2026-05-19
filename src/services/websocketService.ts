import { Buffer } from "buffer";

type VoiceEventCallback = (event: any) => void;

export class VoiceWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private callbacks: Map<string, VoiceEventCallback[]> = new Map();
  public isConnected = false;

  constructor(url: string) {
    this.url = url;
  }

  public connect(token: string) {
    if (this.ws) {
      this.disconnect();
    }

    this.ws = new WebSocket(`${this.url}?token=${token}`);
    // Handle raw binary frames for audio
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.isConnected = true;
      // Note: The server also sends a connection_established event,
      // but we can emit a local connected event immediately if needed.
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data);
          // Use `type` property as defined in the API doc
          this.emit(data.type, data);
        } catch (err) {
          console.error("Failed to parse websocket message", err);
        }
      } else {
        // Binary frame received (from Server-to-Client "Receive AI Audio")
        try {
          const buffer = Buffer.from(event.data as ArrayBuffer);
          const base64Audio = buffer.toString("base64");
          // Emit a custom local event for the binary chunk
          this.emit("binary_audio", { audio: base64Audio });
        } catch (err) {
          console.error("Failed to process binary audio frame", err);
        }
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.emit("disconnected", null);
    };

    this.ws.onerror = (err) => {
      this.emit("error", err);
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  public sendStartStream() {
    this.sendMessage({ type: "client_start_stream" });
  }

  public sendAudioChunk(base64Data: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Decode Base64 to raw Uint8Array buffer and send as Binary frame
      const buffer = Buffer.from(base64Data, "base64");
      this.ws.send(buffer);
    }
  }

  public sendStopStream() {
    this.sendMessage({ type: "client_stop_stream" });
  }

  private sendMessage(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public on(event: string, callback: VoiceEventCallback) {
    const existing = this.callbacks.get(event) || [];
    this.callbacks.set(event, [...existing, callback]);
  }

  public off(event: string, callback: VoiceEventCallback) {
    const existing = this.callbacks.get(event) || [];
    this.callbacks.set(
      event,
      existing.filter((cb) => cb !== callback)
    );
  }

  private emit(event: string, payload: any) {
    const callbacks = this.callbacks.get(event) || [];
    callbacks.forEach((cb) => cb(payload));
  }
}

// Ensure you point this to your actual backend IP
const BACKEND_WS_URL = "ws://192.168.1.9:8000/api/v1/ws/voice";
export const voiceWsService = new VoiceWebSocketService(BACKEND_WS_URL);
