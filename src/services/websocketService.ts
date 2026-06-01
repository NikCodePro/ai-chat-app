import { Buffer } from "buffer";
import { useDebugStore } from "../store/useDebugStore";
import { debugService } from "./debugService";

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
    // We still support binary frames just in case, but primary audio will be JSON
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.isConnected = true;
      debugService.updateMetric("reconnects", 0); // or increment if tracking lifetime
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "server_audio") {
            const recvTs = Date.now();
            const serverTs = data.server_timestamp;
            const latency = recvTs - serverTs;
            useDebugStore.getState().setNetworkLatency(latency);
            console.log(`[DEBUG-FRONTEND-RX] ai_audio_chunk ${data.chunk_id} | backend_ts: ${serverTs} | recv_ts: ${recvTs} | network_latency: ${latency}ms | size: ${data.audio.length} bytes`);
            debugService.onWsReceive(data.chunk_id, data.timestamp, data.audio.length, data.server_timestamp);
            this.emit("binary_audio", { audio: data.audio, chunk_id: data.chunk_id });
          } else {
            this.emit(data.type, data);
          }
        } catch (err) {
          console.error("Failed to parse websocket message", err);
        }
      } else {
        // Fallback for raw binary frame if server still sends it
        try {
          const buffer = Buffer.from(event.data as ArrayBuffer);
          const base64Audio = buffer.toString("base64");
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
      const chunkId = debugService.getNextTxChunkId();
      const timestamp = Date.now();
      debugService.onMicrophoneChunk();
      debugService.onWsSend(chunkId, timestamp, base64Data.length);

      const payload = {
        type: "client_audio",
        audio: base64Data,
        chunk_id: chunkId,
        timestamp: timestamp
      };
      this.ws.send(JSON.stringify(payload));
    }
  }

  public sendStopStream() {
    this.sendMessage({ type: "client_stop_stream" });
  }

  public sendPauseStream() {
    this.sendMessage({ type: "client_pause_stream" });
  }

  public sendResumeStream() {
    this.sendMessage({ type: "client_resume_stream" });
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
const BACKEND_WS_URL = "ws://192.168.3.11:8000/api/v1/ws/voice";
// const BACKEND_WS_URL = "wss://api.sankatseva.com/api/v1/ws/voice";
export const voiceWsService = new VoiceWebSocketService(BACKEND_WS_URL);
