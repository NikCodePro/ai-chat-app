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

  public queueAudioChunk(base64Data: string) {
    try {
      const pcmBuffer = Buffer.from(base64Data, "base64");
      // Gemini output rate is 24000Hz (24kHz)
      const wavBuffer = this.addWavHeader(pcmBuffer, 24000);
      const wavBase64 = wavBuffer.toString("base64");
      this.playbackQueue.push(wavBase64);
      this.playNextChunk();
    } catch (e) {
      console.error("Error wrapping PCM chunk in WAV header:", e);
    }
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
