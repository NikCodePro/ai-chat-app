import { Audio } from "expo-av";
import LiveAudioStream from "react-native-live-audio-stream";
import { Buffer } from "buffer";
import { useDebugStore } from "../store/useDebugStore";

import { debugService } from "./debugService";

/**
 * Client-side PCM buffering strategy:
 * Instead of creating a new Audio.Sound for every tiny chunk the server sends
 * (which causes massive stutter on React Native), we accumulate raw PCM bytes
 * and only instantiate a player when we have enough data for smooth playback.
 *
 * - First segment:  14400 bytes (~300ms at 24kHz/16bit/mono) — fast start
 * - Later segments: 48000 bytes (~1 second) — smooth, continuous playback
 * - A 150ms flush timer ensures the final partial buffer always plays.
 */

// 24kHz, 16-bit mono = 48000 bytes per second
const FIRST_SEGMENT_BYTES = 14400;   // ~300ms — low initial latency
const NORMAL_SEGMENT_BYTES = 48000;  // ~1 second — smooth continuous playback
const FLUSH_DELAY_MS = 150;          // flush partial buffer after silence

export class AudioService {
  // ── Playback state ──
  private pcmBuffer: Buffer = Buffer.alloc(0);
  private segmentQueue: { id: number; data: string }[] = [];
  private isPlaying = false;
  private currentSound: Audio.Sound | null = null;
  private segmentCounter = 0;
  private rxChunkIdCounter = 0;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isFirstSegment = true;

  // ── Recording state ──
  private isRecording = false;
  private isGated = false;
  private onChunkCallback: ((base64Data: string) => void) | null = null;

  public setGated(gated: boolean) {
    this.isGated = gated;
    if (gated) {
      console.log("[AUDIO-GATE] Mic output gated — dropping chunks");
    } else {
      console.log("[AUDIO-GATE] Mic output un-gated — resuming send");
    }
  }

  constructor() {
    this.init();
  }

  private async init() {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
    });

    const options = {
      sampleRate: 16000,
      channels: 1 as 1 | 2,
      bitsPerSample: 16 as 8 | 16,
      audioSource: 6, // VOICE_RECOGNITION for ultra-low latency speech processing
      wavFile: "audio.wav",
      bufferSize: 8192,
    };

    LiveAudioStream.init(options);

    // Register listener exactly ONCE to avoid double-events
    LiveAudioStream.on("data", (data: string) => {
      if (this.onChunkCallback) {
        this.onChunkCallback(data);
      }
    });
  }

  public startRecording(onChunk: (base64Data: string) => void) {
    this.onChunkCallback = onChunk;
    if (this.isRecording) return;
    this.isRecording = true;
    LiveAudioStream.start();
  }

  public stopRecording() {
    this.onChunkCallback = null;
    if (!this.isRecording) return;
    this.isRecording = false;
    LiveAudioStream.stop();
  }

  public createWavFromChunks(chunks: string[], sampleRate: number = 16000): string {
    const buffers = chunks.map((c) => Buffer.from(c, "base64"));
    const combinedPcm = Buffer.concat(buffers);
    const wavBuffer = this.addWavHeader(combinedPcm, sampleRate);
    return wavBuffer.toString("base64");
  }

  // ── WAV header for raw PCM ──
  private addWavHeader(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
    const header = Buffer.alloc(44);
    const dataLength = pcmBuffer.length;

    header.write("RIFF", 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);   // PCM
    header.writeUInt16LE(1, 22);   // mono
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 1 * 16 / 8, 28);
    header.writeUInt16LE(1 * 16 / 8, 32);
    header.writeUInt16LE(16, 34);
    header.write("data", 36);
    header.writeUInt32LE(dataLength, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  // ── Public: queue an incoming server audio chunk ──
  public queueAudioChunk(base64Data: string, chunkId?: number) {
    try {
      const pcmChunk = Buffer.from(base64Data, "base64");
      if (pcmChunk.length === 0) return;

      // Append raw PCM to the accumulation buffer
      this.pcmBuffer = Buffer.concat([this.pcmBuffer, pcmChunk]);

      // Clear any pending flush timer since new data arrived
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }

      // Determine how much data we need before creating a segment
      const targetSize = this.isFirstSegment
        ? FIRST_SEGMENT_BYTES
        : NORMAL_SEGMENT_BYTES;

      // Extract complete segments from the buffer
      while (this.pcmBuffer.length >= targetSize) {
        const segmentPcm = this.pcmBuffer.subarray(0, targetSize);
        this.pcmBuffer = Buffer.from(this.pcmBuffer.subarray(targetSize));
        this.enqueueSegment(Buffer.from(segmentPcm));
        this.isFirstSegment = false;
      }

      // Set a flush timer for any remaining partial data
      // This ensures the last bit of audio always plays
      if (this.pcmBuffer.length > 0) {
        this.flushTimer = setTimeout(() => {
          this.flushRemainingBuffer();
        }, FLUSH_DELAY_MS);
      }
    } catch (e) {
      debugService.onDroppedChunk();
      console.error("Error buffering PCM chunk:", e);
    }
  }

  // ── Flush whatever is left in the PCM buffer ──
  private flushRemainingBuffer() {
    this.flushTimer = null;
    if (this.pcmBuffer.length > 0) {
      const remaining = Buffer.from(this.pcmBuffer);
      this.pcmBuffer = Buffer.alloc(0);
      this.enqueueSegment(remaining);
    }
  }

  // ── Convert a PCM segment to WAV and add to the playback queue ──
  private enqueueSegment(pcmData: Buffer) {
    this.segmentCounter++;
    const wavBuffer = this.addWavHeader(pcmData, 24000);
    const wavBase64 = wavBuffer.toString("base64");

    this.segmentQueue.push({ id: this.segmentCounter, data: wavBase64 });
    debugService.onQueueUpdate(this.segmentQueue.length);

    console.log(
      `[BUFFER] Segment ${this.segmentCounter} | pcm: ${pcmData.length} bytes | queue: ${this.segmentQueue.length}`
    );

    if (!this.isPlaying) {
      this.playNextSegment();
    }
  }

  // ── Play the next buffered segment ──
  private async playNextSegment() {
    if (this.isPlaying || this.segmentQueue.length === 0) {
      if (this.segmentQueue.length === 0) {
        debugService.onPlaybackFinish();
      }
      return;
    }

    this.isPlaying = true;
    const segment = this.segmentQueue.shift()!;
    debugService.onQueueUpdate(this.segmentQueue.length);

    try {
      const uri = `data:audio/wav;base64,${segment.data}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 50 }
      );

      this.currentSound = sound;
      debugService.onPlaybackStart(segment.id);
      console.log(`[PLAY_START] segment=${segment.id}`);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (this.currentSound === sound) {
            this.currentSound = null;
          }
          this.isPlaying = false;
          this.playNextSegment();
        }
      });
    } catch (e) {
      console.error("Audio playback error", e);
      debugService.onDroppedChunk();
      this.isPlaying = false;
      this.playNextSegment();
    }
  }

  // ── Stop all playback and clear buffers ──
  public async stopPlayback() {
    // Clear flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Clear all buffers
    this.pcmBuffer = Buffer.alloc(0);
    this.segmentQueue = [];
    this.segmentCounter = 0;
    this.isFirstSegment = true;
    debugService.onQueueUpdate(0);

    // Stop current sound
    if (this.currentSound) {
      await this.currentSound.stopAsync().catch(() => {});
      await this.currentSound.unloadAsync().catch(() => {});
      this.currentSound = null;
    }

    this.isPlaying = false;
    debugService.onPlaybackFinish();
  }
}

export const audioService = new AudioService();
