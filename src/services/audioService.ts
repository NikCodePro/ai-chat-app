import { Audio, InterruptionModeIOS } from "expo-av";
import { File, Paths } from "expo-file-system";
import LiveAudioStream from "react-native-live-audio-stream";
import { Buffer } from "buffer";

import { debugService } from "./debugService";

/**
 * Single-clip playback per AI utterance.
 *
 * Every multi-clip approach caused an audible pause ~2–3s in (first clip ending).
 * We now buffer the full response and play it as ONE wav / ONE Sound — zero
 * mid-speech transitions.
 */

const PLAYBACK_SAMPLE_RATE = 24000;
/** Brief wait after finalize so trailing audio chunks can arrive before play. */
const PLAY_DEBOUNCE_MS = 80;

export class AudioService {
  private incomingChunks: Buffer[] = [];
  private totalBytes = 0;
  private streamFinalized = false;
  private playTimer: ReturnType<typeof setTimeout> | null = null;

  private isPlaying = false;
  private currentSound: Audio.Sound | null = null;
  private currentUri: string | null = null;
  private fileCounter = 0;
  private playbackSessionActive = false;

  private isRecording = false;
  private isMicPaused = false;
  private onChunkCallback: ((base64Data: string) => void) | null = null;
  private onPlaybackIdle: (() => void) | null = null;
  private onPlaybackStart: (() => void) | null = null;

  constructor() {
    void this.init();
  }

  public setOnPlaybackIdle(callback: (() => void) | null) {
    this.onPlaybackIdle = callback;
  }

  public setOnPlaybackStart(callback: (() => void) | null) {
    this.onPlaybackStart = callback;
  }

  public setGated(_gated: boolean) {
    // Mic gating is handled in useVoiceCall.
  }

  private async init() {
    await Audio.requestPermissionsAsync();
    await this.setRecordingAudioMode();

    LiveAudioStream.init({
      sampleRate: 16000,
      channels: 1 as 1 | 2,
      bitsPerSample: 16 as 8 | 16,
      audioSource: 7,
      wavFile: "audio.wav",
      bufferSize: 4096,
    });

    LiveAudioStream.on("data", (data: string) => {
      if (this.onChunkCallback && !this.isMicPaused) {
        this.onChunkCallback(data);
      }
    });
  }

  private async setRecordingAudioMode() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      shouldDuckAndroid: false,
    });
  }

  private async setPlaybackAudioMode() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      shouldDuckAndroid: false,
    });
  }

  public startRecording(onChunk: (base64Data: string) => void) {
    this.onChunkCallback = onChunk;
    if (this.isRecording) return;
    this.isRecording = true;
    this.isMicPaused = false;
    LiveAudioStream.start();
  }

  public stopRecording() {
    this.onChunkCallback = null;
    if (!this.isRecording) return;
    this.isRecording = false;
    this.isMicPaused = false;
    LiveAudioStream.stop();
  }

  public pauseRecording() {
    if (!this.isRecording || this.isMicPaused) return;
    this.isMicPaused = true;
    LiveAudioStream.stop();
  }

  public resumeRecording() {
    if (!this.isRecording || !this.isMicPaused) return;
    this.isMicPaused = false;
    LiveAudioStream.start();
  }

  public createWavFromChunks(chunks: string[], sampleRate: number = 16000): string {
    const buffers = chunks.map((c) => Buffer.from(c, "base64"));
    return this.addWavHeader(Buffer.concat(buffers), sampleRate).toString("base64");
  }

  private addWavHeader(pcmBuffer: Buffer, sampleRate: number = PLAYBACK_SAMPLE_RATE): Buffer {
    const header = Buffer.alloc(44);
    const dataLength = pcmBuffer.length;

    header.write("RIFF", 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write("data", 36);
    header.writeUInt32LE(dataLength, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  public prepareForNewStream() {
    void this.stopPlayback();
    this.resetStreamState();
  }

  public finalizeIncomingStream() {
    this.streamFinalized = true;
    this.schedulePlayEntireUtterance();
  }

  private resetStreamState() {
    if (this.playTimer) {
      clearTimeout(this.playTimer);
      this.playTimer = null;
    }
    this.incomingChunks = [];
    this.totalBytes = 0;
    this.streamFinalized = false;
  }

  public queueAudioChunk(base64Data: string) {
    try {
      const pcmChunk = Buffer.from(base64Data, "base64");
      if (pcmChunk.length === 0) return;

      this.incomingChunks.push(pcmChunk);
      this.totalBytes += pcmChunk.length;

      // Trailing chunks may arrive just after finalize — re-schedule play.
      if (this.streamFinalized) {
        this.schedulePlayEntireUtterance();
      }
    } catch (e) {
      debugService.onDroppedChunk();
      if (__DEV__) console.error("Error buffering PCM chunk:", e);
    }
  }

  private getAllPcm(): Buffer {
    if (this.incomingChunks.length === 0) return Buffer.alloc(0);
    if (this.incomingChunks.length === 1) return Buffer.from(this.incomingChunks[0]);
    return Buffer.concat(this.incomingChunks);
  }

  private schedulePlayEntireUtterance() {
    if (this.playTimer) clearTimeout(this.playTimer);
    this.playTimer = setTimeout(() => {
      this.playTimer = null;
      void this.playEntireUtterance();
    }, PLAY_DEBOUNCE_MS);
  }

  private writeWavFile(pcm: Buffer): string {
    const wav = this.addWavHeader(pcm, PLAYBACK_SAMPLE_RATE);
    this.fileCounter += 1;
    const file = new File(Paths.cache, `voice_${this.fileCounter}_${Date.now()}.wav`);
    file.create({ overwrite: true });
    file.write(new Uint8Array(wav));
    return file.uri;
  }

  private deleteFile(uri: string) {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // ignore
    }
  }

  private async beginPlaybackSession() {
    if (this.playbackSessionActive) return;
    this.playbackSessionActive = true;
    this.pauseRecording();
    await this.setPlaybackAudioMode();
  }

  private async endPlaybackSession() {
    this.resetStreamState();

    if (this.playbackSessionActive) {
      this.playbackSessionActive = false;
      await this.setRecordingAudioMode();
      this.resumeRecording();
    }

    debugService.onPlaybackFinish();
    this.onPlaybackIdle?.();
  }

  private async playEntireUtterance() {
    if (this.isPlaying || !this.streamFinalized) return;

    const pcm = this.getAllPcm();
    if (pcm.length === 0) return;

    await this.beginPlaybackSession();
    this.isPlaying = true;

    try {
      const uri = this.writeWavFile(pcm);
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 200 },
        undefined,
        false
      );

      this.currentSound = sound;
      this.currentUri = uri;

      // Playback is now actually starting (sound is created and shouldPlay=true).
      this.onPlaybackStart?.();

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          if ("error" in status) {
            if (__DEV__) console.warn("[PLAY] Error:", status.error);
            sound.unloadAsync().catch(() => {});
            this.deleteFile(uri);
            this.isPlaying = false;
            this.currentSound = null;
            this.currentUri = null;
            void this.endPlaybackSession();
          }
          return;
        }

        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          this.deleteFile(uri);
          this.currentSound = null;
          this.currentUri = null;
          this.isPlaying = false;
          void this.endPlaybackSession();
        }
      });

      debugService.onPlaybackStart("utterance");
      if (__DEV__) {
        const sec = (pcm.length / (PLAYBACK_SAMPLE_RATE * 2)).toFixed(1);
        console.log(`[PLAY] Full utterance | ${pcm.length} bytes (~${sec}s)`);
      }
    } catch (e) {
      if (__DEV__) console.error("Audio playback error", e);
      debugService.onDroppedChunk();
      this.isPlaying = false;
      this.currentSound = null;
      this.currentUri = null;
      await this.endPlaybackSession();
    }
  }

  public async stopPlayback() {
    if (this.playTimer) {
      clearTimeout(this.playTimer);
      this.playTimer = null;
    }
    this.incomingChunks = [];
    this.totalBytes = 0;
    this.streamFinalized = false;
    debugService.onQueueUpdate(0);

    if (this.currentSound) {
      if (this.currentUri) this.deleteFile(this.currentUri);
      await this.currentSound.stopAsync().catch(() => {});
      await this.currentSound.unloadAsync().catch(() => {});
      this.currentSound = null;
      this.currentUri = null;
    }

    this.isPlaying = false;
    this.playbackSessionActive = false;
    await this.setRecordingAudioMode();
    this.resumeRecording();
    debugService.onPlaybackFinish();
  }
}

export const audioService = new AudioService();
