import { useState, useEffect, useCallback } from "react";
import { audioService } from "../services/audioService";
import { voiceWsService } from "../services/websocketService";
import { useAppStore } from "../store/appStore";

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
    };

    // The websocket service intercepts binary arrays and emits "binary_audio"
    const handleBinaryAudio = (payload: { audio: string }) => {
      if (payload.audio) {
        audioService.queueAudioChunk(payload.audio);
      }
    };

    const handleAiTranscript = (payload: { text: string }) => {
      setTranscript((prev) => prev + " " + payload.text);
    };

    const handleAiStartedSpeaking = () => setStatus("AI Speaking...");
    
    const handleAiFinishedSpeaking = () => {
      setStatus("Listening...");
      if (!isMuted) {
        startListening();
      }
    };

    const handleAiInterrupted = () => {
      // AI was interrupted by user, clear the queue
      audioService.stopPlayback();
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

  const startCall = useCallback(() => {
    if (!token) return;
    setStatus("Connecting...");
    voiceWsService.connect(token);
  }, [token]);

  const endCall = useCallback(() => {
    audioService.stopRecording();
    audioService.stopPlayback();
    voiceWsService.sendStopStream();
    voiceWsService.disconnect();
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
      voiceWsService.sendStopStream();
      setStatus("Disconnected"); // Or a separate "Muted" status
    }
  }, [isMuted]);

  const startListening = () => {
    setTranscript("");
    voiceWsService.sendStartStream();
    audioService.startRecording((base64Chunk) => {
      voiceWsService.sendAudioChunk(base64Chunk);
    });
  };

  return {
    status,
    transcript,
    isMuted,
    startCall,
    endCall,
    toggleMute,
  };
}
