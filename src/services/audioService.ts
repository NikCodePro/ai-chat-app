import { Audio } from "expo-av";
import LiveAudioStream from "react-native-live-audio-stream";
import { Buffer } from "buffer";
import { useDebugStore } from "../store/useDebugStore";

import { debugService } from "./debugService";

export class AudioService {
  private playbackQueue: { id: number | string; data: string }[] = [];
  private isPlaying = false;
  private currentSound: Audio.Sound | null = null;
  private preloadedSound: Audio.Sound | null = null;
  private preloadedChunk: string | null = null;
  private isRecording = false;
  private rxChunkIdCounter = 0;
  private isGated = false; // true while AI is speaking → drop mic data
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

    // Register listener exactly ONCE to avoid double-events when starting/stopping the stream
    LiveAudioStream.on("data", (data: string) => {
      if (this.isGated) return; // silently drop while AI speaks
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

  private addWavHeader(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
    const header = Buffer.alloc(44);
    const dataLength = pcmBuffer.length;
    
    // RIFF identifier
    header.write("RIFF", 0);
    // file length minus RIFF identifier and size fields (36 + dataLength)
    header.writeUInt32LE(36 + dataLength, 4);
    // RIFF type
    header.write("WAVE", 8);
    // format chunk identifier
    header.write("fmt ", 12);
    // format chunk length
    header.writeUInt32LE(16, 16);
    // sample format (raw PCM = 1)
    header.writeUInt16LE(1, 20);
    // channel count (1 = mono)
    header.writeUInt16LE(1, 22);
    // sample rate
    header.writeUInt32LE(sampleRate, 24);
    // byte rate = sampleRate * channels * bitsPerSample / 8
    header.writeUInt32LE(sampleRate * 1 * 16 / 8, 28);
    // block align = channels * bitsPerSample / 8
    header.writeUInt16LE(1 * 16 / 8, 32);
    // bits per sample
    header.writeUInt16LE(16, 34);
    // data chunk identifier
    header.write("data", 36);
    // data chunk length
    header.writeUInt32LE(dataLength, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  private async preloadNextIfNeeded() {
    if (this.preloadedSound || this.playbackQueue.length === 0) return;
    
    const nextChunk = this.playbackQueue[0];
    try {
      const uri = `data:audio/wav;base64,${nextChunk.data}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, progressUpdateIntervalMillis: 50 }
      );
      
      // Check if queue wasn't cleared/altered while we were asynchronously loading
      if (this.playbackQueue.length > 0 && this.playbackQueue[0].id === nextChunk.id) {
        this.preloadedSound = sound;
        this.preloadedChunk = nextChunk.data;
      } else {
        await sound.unloadAsync().catch(() => {});
      }
    } catch (e) {
      console.error("Error preloading next audio chunk:", e);
    }
  }

  public queueAudioChunk(base64Data: string, chunkId?: number) {
    try {
      const id = chunkId ?? ++this.rxChunkIdCounter;
      const pcmBuffer = Buffer.from(base64Data, "base64");
      // Gemini output rate is 24000Hz (24kHz)
      const wavBuffer = this.addWavHeader(pcmBuffer, 24000);
      const wavBase64 = wavBuffer.toString("base64");
      
      this.playbackQueue.push({ id, data: wavBase64 });
      debugService.onQueueUpdate(this.playbackQueue.length);
      
      if (!this.isPlaying) {
        this.playNextChunk();
      } else {
        this.preloadNextIfNeeded();
      }
    } catch (e) {
      debugService.onDroppedChunk();
      console.error("Error wrapping PCM chunk in WAV header:", e);
    }
  }

  public async stopPlayback() {
    this.playbackQueue = [];
    debugService.onQueueUpdate(0);
    if (this.currentSound) {
      await this.currentSound.stopAsync().catch(() => {});
      await this.currentSound.unloadAsync().catch(() => {});
      this.currentSound = null;
    }
    if (this.preloadedSound) {
      await this.preloadedSound.unloadAsync().catch(() => {});
      this.preloadedSound = null;
    }
    this.preloadedChunk = null;
    this.isPlaying = false;
    debugService.onPlaybackFinish();
  }

  private async playNextChunk() {
    if (this.isPlaying || this.playbackQueue.length === 0) {
      if (this.playbackQueue.length === 0) {
        debugService.onPlaybackFinish();
      }
      return;
    }

    this.isPlaying = true;
    const chunk = this.playbackQueue.shift();
    debugService.onQueueUpdate(this.playbackQueue.length);

    if (!chunk) {
      this.isPlaying = false;
      debugService.onPlaybackFinish();
      return;
    }

    try {
      let sound: Audio.Sound;
      
      if (this.preloadedSound && this.preloadedChunk === chunk.data) {
        sound = this.preloadedSound;
        this.preloadedSound = null;
        this.preloadedChunk = null;
        await sound.playAsync();
      } else {
        // If we had a preloaded sound but it didn't match, clean it up
        if (this.preloadedSound) {
          this.preloadedSound.unloadAsync().catch(() => {});
          this.preloadedSound = null;
          this.preloadedChunk = null;
        }
        
        const uri = `data:audio/wav;base64,${chunk.data}`;
        const result = await Audio.Sound.createAsync(
            { uri }, 
            { shouldPlay: true, progressUpdateIntervalMillis: 50 }
        );
        sound = result.sound;
      }
      
      this.currentSound = sound;
      debugService.onPlaybackStart(chunk.id);
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (this.currentSound === sound) {
            this.currentSound = null;
          }
          this.isPlaying = false;
          this.playNextChunk();
        }
      });
      
      // Preload the next chunk in the queue immediately
      this.preloadNextIfNeeded();
      
    } catch (e) {
      console.error("Audio playback error", e);
      debugService.onDroppedChunk();
      this.isPlaying = false;
      this.playNextChunk(); // Skip to next on error
    }
  }
}

export const audioService = new AudioService();
