import { Audio } from "expo-av";
import LiveAudioStream from "react-native-live-audio-stream";
import { Buffer } from "buffer";

export class AudioService {
  private playbackQueue: string[] = [];
  private isPlaying = false;
  private currentSound: Audio.Sound | null = null;
  private isRecording = false;

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
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      bufferSize: 4096,
    };

    LiveAudioStream.init(options);
  }

  public startRecording(onChunk: (base64Data: string) => void) {
    if (this.isRecording) return;
    this.isRecording = true;

    LiveAudioStream.on("data", (data: string) => {
      onChunk(data);
    });

    LiveAudioStream.start();
  }

  public stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    LiveAudioStream.stop();
  }

  public queueAudioChunk(base64Data: string) {
    // Wrap raw PCM16 chunk in WAV header if needed, assuming backend sends playable format or we do it here.
    // For now, we assume the backend sends a playable format (e.g., MP3/WAV base64 chunk)
    // If it's raw PCM, it needs a WAV header wrapper before playing with expo-av.
    this.playbackQueue.push(base64Data);
    this.playNextChunk();
  }

  public async stopPlayback() {
    this.playbackQueue = [];
    if (this.currentSound) {
      await this.currentSound.stopAsync();
      await this.currentSound.unloadAsync();
      this.currentSound = null;
    }
    this.isPlaying = false;
  }

  private async playNextChunk() {
    if (this.isPlaying || this.playbackQueue.length === 0) return;

    this.isPlaying = true;
    const chunk = this.playbackQueue.shift();

    if (!chunk) {
      this.isPlaying = false;
      return;
    }

    try {
      // Assuming backend chunk is already a valid WAV/MP3 base64 or we wrap it in a data URI
      // If it's pure PCM16, we would add a WAV header.
      // We will try standard URI. If it's PCM, we must convert it.
      const uri = `data:audio/wav;base64,${chunk}`;
      
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      this.currentSound = sound;
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          this.currentSound = null;
          this.isPlaying = false;
          this.playNextChunk();
        }
      });
    } catch (e) {
      console.error("Audio playback error", e);
      this.isPlaying = false;
      this.playNextChunk(); // Skip to next on error
    }
  }
}

export const audioService = new AudioService();
