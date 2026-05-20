import { useCallback, useEffect, useState } from "react";
import { NativeModules } from "react-native";
import InCallManager from "react-native-incall-manager";
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

export function useVoiceCall() {
  const [status, setStatus] = useState<CallStatus>("Disconnected");
  const [transcript, setTranscript] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const token = useAppStore((s) => s.accessToken);

  useEffect(() => {
    if (!token) return;

    const handleConnectionEstablished = () => {
      setStatus("Connecting...");
      // Add small delay to ensure full connectivity before streaming
      setTimeout(() => {
        setStatus("Listening...");
        if (!isMuted) {
          startListening();
        }
      }, 500);
    };

    const handleDisconnected = () => {
      setStatus("Disconnected");
      audioService.stopRecording();
      audioService.stopPlayback();
      audioService.setGated(false);
    };

    // The websocket service intercepts binary arrays and emits "binary_audio"
    const handleBinaryAudio = (payload: { audio: string; chunk_id?: number }) => {
      if (payload.audio) {
        audioService.queueAudioChunk(payload.audio, payload.chunk_id);
      }
    };

    const handleAiTranscript = (payload: { text: string }) => {
      setTranscript((prev) => prev + " " + payload.text);
    };
    const handleAiStartedSpeaking = () => {
      audioService.setGated(true);
      voiceWsService.sendPauseStream();
      setStatus("AI Speaking...");
    };

    const handleAiFinishedSpeaking = () => {
      setStatus("Listening...");
      audioService.setGated(false);
      voiceWsService.sendResumeStream();
    };

    const handleAiInterrupted = () => {
      audioService.stopPlayback();
      audioService.setGated(false);
      voiceWsService.sendResumeStream();
      setStatus("Listening...");
    };

    const handleError = (payload: any) => {
      console.error("Voice WS Error:", payload?.message || payload);
      setStatus("Disconnected");
    };

    voiceWsService.on("connection_established", handleConnectionEstablished);
    voiceWsService.on("disconnected", handleDisconnected);
    voiceWsService.on("binary_audio", handleBinaryAudio);
    voiceWsService.on("ai_transcript", handleAiTranscript);
    voiceWsService.on("ai_started_speaking", handleAiStartedSpeaking);
    voiceWsService.on("ai_finished_speaking", handleAiFinishedSpeaking);
    voiceWsService.on("ai_interrupted", handleAiInterrupted);
    voiceWsService.on("error", handleError);

    return () => {
      voiceWsService.off("connection_established", handleConnectionEstablished);
      voiceWsService.off("disconnected", handleDisconnected);
      voiceWsService.off("binary_audio", handleBinaryAudio);
      voiceWsService.off("ai_transcript", handleAiTranscript);
      voiceWsService.off("ai_started_speaking", handleAiStartedSpeaking);
      voiceWsService.off("ai_finished_speaking", handleAiFinishedSpeaking);
      voiceWsService.off("ai_interrupted", handleAiInterrupted);
      voiceWsService.off("error", handleError);
    };
  }, [token, isMuted]);

  const setSpeakerphone = useCallback(async (on: boolean) => {
    if (hasInCallManager && InCallManager && typeof InCallManager.setSpeakerphoneOn === "function") {
      try {
        InCallManager.setSpeakerphoneOn(on);
        return;
      } catch (e) {
        // Silently fail and fallback
      }
    }

    // Fallback to Expo AV if InCallManager native module is null (e.g. in Expo Go)
    try {
      const { Audio } = require("expo-av");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: !on, // earpiece is opposite of speakerphone
      });
    } catch (e) {
      // Silently fail
    }
  }, []);

  const startCall = useCallback(() => {
    if (!token) return;
    setStatus("Connecting...");

    // Initialize InCallManager for audio routing and proximity screen-off
    if (hasInCallManager && InCallManager && typeof InCallManager.start === "function") {
      try {
        InCallManager.start({ media: "audio", auto: true });
        InCallManager.setKeepScreenOn(true);
        if (typeof InCallManager.startProximitySensor === "function") {
          InCallManager.startProximitySensor();
        }
      } catch (e) {
        // Silently fail
      }
    }

    setSpeakerphone(isSpeakerOn);

    voiceWsService.connect(token);
  }, [token, isSpeakerOn, setSpeakerphone]);

  const endCall = useCallback(() => {
    audioService.stopRecording();
    audioService.stopPlayback();
    voiceWsService.sendStopStream();
    voiceWsService.disconnect();

    // Clean up InCallManager
    if (hasInCallManager && InCallManager && typeof InCallManager.stop === "function") {
      try {
        if (typeof InCallManager.stopProximitySensor === "function") {
          InCallManager.stopProximitySensor();
        }
        InCallManager.stop();
      } catch (e) {
        // Silently fail
      }
    }

    setStatus("Disconnected");
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      startListening();
      setStatus("Listening...");
    } else {
      setIsMuted(true);
      audioService.stopRecording();
      // Don't send client_stop_stream — that kills the whole session.
      // Just stop recording locally; backend sees no more audio chunks.
      setStatus("AI Thinking...");
    }
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    const newState = !isSpeakerOn;
    setIsSpeakerOn(newState);
    setSpeakerphone(newState);
  }, [isSpeakerOn, setSpeakerphone]);

  const startListening = () => {
    setTranscript("");
    voiceWsService.sendStartStream();
    audioService.startRecording((base64Data) => {
      voiceWsService.sendAudioChunk(base64Data);
    });
  };

  return {
    status,
    transcript,
    isMuted,
    isSpeakerOn,
    startCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  };
}
