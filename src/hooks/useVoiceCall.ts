import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { NativeModules } from "react-native";
import InCallManager from "react-native-incall-manager";
import { Buffer } from "buffer";
import { audioService } from "../services/audioService";
import { voiceWsService } from "../services/websocketService";
import { useAppStore } from "../store/appStore";

const hasInCallManager = !!NativeModules.InCallManager;

export type CallStatus =
  | "Connecting..."
  | "Disconnected"
  | "Listening..."
  | "AI Thinking..."
  | "AI Speaking...";

const SPEECH_RMS_THRESHOLD = 1500;       // volume threshold to detect user speech
const INTERRUPT_RMS_THRESHOLD = 3000;    // higher threshold to avoid speaker echo loops
const SILENCE_TIMEOUT_MS = 600;          // 600ms silence threshold for turn-end

function calculateRMS(base64Data: string): number {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    let sum = 0;
    const numSamples = buffer.length / 2;
    for (let i = 0; i < buffer.length; i += 2) {
      if (i + 1 >= buffer.length) break;
      const sample = buffer.readInt16LE(i);
      sum += sample * sample;
    }
    return numSamples > 0 ? Math.sqrt(sum / numSamples) : 0;
  } catch (e) {
    console.error("RMS calculation error", e);
    return 0;
  }
}

export function useVoiceCall() {
  const [status, setStatusState] = useState<CallStatus>("Disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const token = useAppStore((s) => s.accessToken);

  const statusRef = useRef<CallStatus>("Disconnected");
  const isMutedRef = useRef(isMuted);
  const isSpeakerOnRef = useRef(isSpeakerOn);
  const isRecordingRef = useRef(false);
  const isGatedRef = useRef(false);

  const setStatus = useCallback((newStatus: CallStatus) => {
    setStatusState(newStatus);
    statusRef.current = newStatus;
  }, []);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isSpeakerOnRef.current = isSpeakerOn;
  }, [isSpeakerOn]);

  // ── Start streaming audio to the backend ──
  const startListening = useCallback(() => {
    if (isMutedRef.current || isRecordingRef.current) return;

    isRecordingRef.current = true;
    isGatedRef.current = false;
    setStatus("Listening...");
    voiceWsService.sendStartStream();

    let userHasSpoken = false;
    let silenceStart = 0;

    audioService.startRecording((base64Data) => {
      const rms = calculateRMS(base64Data);
      const isSpeech = rms > SPEECH_RMS_THRESHOLD;
      const currentStatus = statusRef.current;

      // 1. If AI is speaking: check for user interruption
      if (currentStatus === "AI Speaking...") {
        if (rms > INTERRUPT_RMS_THRESHOLD) {
          console.log(`[VAD] User interrupted AI! RMS: ${rms}`);
          audioService.stopPlayback();
          isGatedRef.current = false;
          setStatus("Listening...");
          userHasSpoken = true;
          silenceStart = 0;
          voiceWsService.sendResumeStream();
          voiceWsService.sendAudioChunk(base64Data);
        }
        return; // drop mic chunks during AI playback unless interrupting
      }

      // 2. If connecting or disconnected: drop chunks
      if (
        currentStatus === "Connecting..." ||
        currentStatus === "Disconnected"
      ) {
        return;
      }

      // 3. If AI is listening or thinking: check for speech and end-of-speech silence
      if (currentStatus === "Listening..." || currentStatus === "AI Thinking...") {
        if (isSpeech) {
          if (currentStatus === "AI Thinking...") {
            console.log("[VAD] User resumed speaking. Transitioning back to Listening...");
            setStatus("Listening...");
          }
          userHasSpoken = true;
          silenceStart = 0;
        } else if (userHasSpoken) {
          if (silenceStart === 0) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart > SILENCE_TIMEOUT_MS) {
            if (currentStatus === "Listening...") {
              console.log("[VAD] Client detected silence. Transitioning to Thinking...");
              setStatus("AI Thinking...");
            }
            userHasSpoken = false;
            silenceStart = 0;
            // DO NOT gate the mic! Gemini needs the continued audio stream to detect turn completion.
          }
        }

        if (isGatedRef.current) return;
        voiceWsService.sendAudioChunk(base64Data);
      }
    });
  }, [setStatus]);

  // ── Stop streaming (only for mute/endCall, NOT for turn detection) ──
  const stopListening = useCallback(() => {
    if (!isRecordingRef.current) return;
    audioService.stopRecording();
    isRecordingRef.current = false;
  }, []);

  useEffect(() => {
    if (!token) return;

    const handleConnectionEstablished = () => {
      setStatus("Connecting...");
      setTimeout(() => {
        if (!isMutedRef.current) {
          startListening();
        }
      }, 500);
    };

    const handleDisconnected = () => {
      setStatus("Disconnected");
      stopListening();
      audioService.stopPlayback();
      audioService.setGated(false);
      isGatedRef.current = false;
    };

    const handleBinaryAudio = (payload: { audio: string; chunk_id?: number }) => {
      if (payload.audio) {
        audioService.queueAudioChunk(payload.audio, payload.chunk_id);
      }
    };

    const handleAiStartedSpeaking = () => {
      audioService.setGated(true);
      isGatedRef.current = true;
      voiceWsService.sendPauseStream();
      setStatus("AI Speaking...");
    };

    const handleAiFinishedSpeaking = () => {
      audioService.setGated(false);
      isGatedRef.current = false;
      voiceWsService.sendResumeStream();
      setStatus("Listening...");
    };

    const handleAiInterrupted = () => {
      audioService.stopPlayback();
      audioService.setGated(false);
      isGatedRef.current = false;
      voiceWsService.sendResumeStream();
      setStatus("Listening...");
    };

    const handleError = (payload: any) => {
      console.error("Voice WS Error:", payload?.message || payload);
      setStatus("Disconnected");
      stopListening();
    };

    voiceWsService.on("connection_established", handleConnectionEstablished);
    voiceWsService.on("disconnected", handleDisconnected);
    voiceWsService.on("binary_audio", handleBinaryAudio);
    voiceWsService.on("ai_started_speaking", handleAiStartedSpeaking);
    voiceWsService.on("ai_finished_speaking", handleAiFinishedSpeaking);
    voiceWsService.on("ai_interrupted", handleAiInterrupted);
    voiceWsService.on("error", handleError);

    return () => {
      voiceWsService.off("connection_established", handleConnectionEstablished);
      voiceWsService.off("disconnected", handleDisconnected);
      voiceWsService.off("binary_audio", handleBinaryAudio);
      voiceWsService.off("ai_started_speaking", handleAiStartedSpeaking);
      voiceWsService.off("ai_finished_speaking", handleAiFinishedSpeaking);
      voiceWsService.off("ai_interrupted", handleAiInterrupted);
      voiceWsService.off("error", handleError);
    };
  }, [startListening, stopListening, token, setStatus]);

  const setSpeakerphone = useCallback(async (on: boolean) => {
    if (hasInCallManager && InCallManager && typeof InCallManager.setSpeakerphoneOn === "function") {
      try {
        InCallManager.setSpeakerphoneOn(on);
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: !on,
      });
    } catch {
      // Fallback
    }
  }, []);

  const startCall = useCallback(() => {
    if (!token) return;
    setStatus("Connecting...");

    if (hasInCallManager && InCallManager && typeof InCallManager.start === "function") {
      try {
        InCallManager.start({ media: "audio", auto: true });
        InCallManager.setKeepScreenOn(true);
        if (typeof InCallManager.startProximitySensor === "function") {
          InCallManager.startProximitySensor();
        }
      } catch {
        // Fallback
      }
    }

    setSpeakerphone(isSpeakerOnRef.current);
    voiceWsService.connect(token);
  }, [setSpeakerphone, token, setStatus]);

  const endCall = useCallback(() => {
    stopListening();
    audioService.stopPlayback();
    voiceWsService.sendStopStream();
    voiceWsService.disconnect();

    if (hasInCallManager && InCallManager && typeof InCallManager.stop === "function") {
      try {
        if (typeof InCallManager.stopProximitySensor === "function") {
          InCallManager.stopProximitySensor();
        }
        InCallManager.stop();
      } catch {
        // Fallback
      }
    }

    setStatus("Disconnected");
  }, [stopListening, setStatus]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      startListening();
      return;
    }

    setIsMuted(true);
    stopListening();
    setStatus("Disconnected");
  }, [isMuted, startListening, stopListening, setStatus]);

  const toggleSpeaker = useCallback(() => {
    const newState = !isSpeakerOn;
    setIsSpeakerOn(newState);
    isSpeakerOnRef.current = newState;
    setSpeakerphone(newState);
  }, [isSpeakerOn, setSpeakerphone]);

  return {
    status,
    isMuted,
    isSpeakerOn,
    startCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  };
}
