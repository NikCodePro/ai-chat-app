import { useState, useCallback, useRef, useEffect } from "react";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import * as FileSystem from "expo-file-system";
import { useAppStore } from "../store/appStore";
import { chatApi, TurnBasedWebSocket, WebSocketMessage } from "../services/chatApi";

export type TurnBasedStatus =
  | "Idle"
  | "Listening"
  | "Detecting"     // User started speaking but hasn't paused yet
  | "Transcribing"
  | "Thinking"
  | "Speaking";

// Volume level in dB from expo-av metering. -160 = silence, 0 = max.
// metering is in dBFS; a reasonable voice threshold is ~-30dBFS
const SPEECH_DB_THRESHOLD = -35;  // louder than this = speech
const SILENCE_TIMEOUT_MS = 1200;  // 1.2s silence ends the turn
const METER_INTERVAL_MS = 100;    // how often we check the mic level

export function useTurnBasedVoice() {
  const [status, setStatusState] = useState<TurnBasedStatus>("Idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const token = useAppStore((state) => state.accessToken);
  const wsRef = useRef<TurnBasedWebSocket | null>(null);

  const statusRef = useRef<TurnBasedStatus>("Idle");
  const recordingRef = useRef<Audio.Recording | null>(null);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStartRef = useRef<number>(0);
  const userHasSpokenRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);

  const setStatus = useCallback((newStatus: TurnBasedStatus) => {
    setStatusState(newStatus);
    statusRef.current = newStatus;
  }, []);

  // ── Initialize chat session + WebSocket once ──
  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const initSession = async () => {
      try {
        // Request microphone permission
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          console.error("[TurnBased] Microphone permission denied");
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
        });

        const newChat = await chatApi.createChat(token, "AI Voice Call", "gemini");
        if (!isMounted) return;
        setChatId(newChat.id);

        const ws = new TurnBasedWebSocket(token);
        ws.onMessage(handleWsMessage);
        await ws.connect();
        wsRef.current = ws;
        
        if (isMounted) {
          setIsReady(true);
        }
      } catch (err) {
        console.error("[TurnBased] Initialization failed:", err);
      }
    };

    initSession();

    return () => {
      isMounted = false;
      cleanupRecording();
      wsRef.current?.disconnect();
      Speech.stop();
    };
  }, [token]);

  // Auto-start listening once ready
  useEffect(() => {
    if (isReady && statusRef.current === "Idle") {
      startListening();
    }
  }, [isReady]);

  const handleWsMessage = useCallback((msg: WebSocketMessage) => {
    if (__DEV__) console.log("[TurnBased] WS message:", msg.type, msg.content?.substring(0, 50));

    if (msg.type === "user_transcript" && msg.content) {
      setTranscript(msg.content);
    } else if (msg.type === "start") {
      setStatus("Thinking");
      setResponse("");
    } else if (msg.type === "chunk" && msg.content) {
      setResponse((prev) => prev + msg.content!);
    } else if (msg.type === "end") {
      setStatus("Speaking");
    } else if (msg.type === "error") {
      console.warn("[TurnBased] WS error, resuming listening.");
      resumeListening();
    }
  }, []);

  // When status becomes Speaking, invoke TTS and then resume
  useEffect(() => {
    if (status === "Speaking" && response) {
      isSpeakingRef.current = true;
      Speech.speak(response, {
        rate: 1.0,
        onDone: () => {
          isSpeakingRef.current = false;
          resumeListening();
        },
        onStopped: () => {
          isSpeakingRef.current = false;
          resumeListening();
        },
        onError: () => {
          isSpeakingRef.current = false;
          resumeListening();
        },
      });
    }
  }, [status, response]);

  // ── Cleanup helper ──
  const cleanupRecording = useCallback(async () => {
    isListeningRef.current = false;
    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (_) {
        // Already stopped
      }
      recordingRef.current = null;
    }
    userHasSpokenRef.current = false;
    silenceStartRef.current = 0;
  }, []);

  // ── Start a new recording session with VAD ──
  const startListening = useCallback(async () => {
    if (isListeningRef.current || !wsRef.current?.isReady()) {
      // If WS not ready yet, just set status and wait for it
      if (!wsRef.current?.isReady()) {
        setStatus("Idle");
      }
      return;
    }

    if (isSpeakingRef.current) {
      Speech.stop();
      isSpeakingRef.current = false;
    }

    await cleanupRecording();

    setStatus("Listening");
    setTranscript("");
    setResponse("");
    userHasSpokenRef.current = false;
    silenceStartRef.current = 0;
    isListeningRef.current = true;

    try {
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await rec.startAsync();
      recordingRef.current = rec;

      // Poll metering to detect speech and silence
      meterIntervalRef.current = setInterval(async () => {
        if (!isListeningRef.current || statusRef.current !== "Listening") {
          return;
        }

        try {
          const status = await rec.getStatusAsync();
          const db = status.metering ?? -160;
          const isSpeech = db > SPEECH_DB_THRESHOLD;

          if (isSpeech) {
            userHasSpokenRef.current = true;
            silenceStartRef.current = 0;
          } else if (userHasSpokenRef.current) {
            if (silenceStartRef.current === 0) {
              silenceStartRef.current = Date.now();
            } else if (Date.now() - silenceStartRef.current > SILENCE_TIMEOUT_MS) {
              // End of speech detected — finalize this turn
              finalizeRecording();
            }
          }
        } catch (_) {
          // Recording stopped externally
        }
      }, METER_INTERVAL_MS);

    } catch (err) {
      console.error("[TurnBased] Failed to start recording:", err);
      isListeningRef.current = false;
      setStatus("Idle");
    }
  }, [cleanupRecording]);

  // ── Finalize: stop recording, encode, send ──
  const finalizeRecording = useCallback(async () => {
    if (!isListeningRef.current) return;

    isListeningRef.current = false;

    if (meterIntervalRef.current) {
      clearInterval(meterIntervalRef.current);
      meterIntervalRef.current = null;
    }

    const rec = recordingRef.current;
    if (!rec) return;

    setStatus("Transcribing");

    try {
      await rec.stopAndUnloadAsync();
      recordingRef.current = null;

      const uri = rec.getURI();
      if (!uri) throw new Error("No recording URI");

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });

      // Delete the temp file
      await FileSystem.deleteAsync(uri, { idempotent: true });

      if (!chatId || !wsRef.current?.isReady()) {
        console.warn("[TurnBased] Cannot send: no chatId or WS not ready");
        resumeListening();
        return;
      }

      wsRef.current.sendAudioChunk(base64Audio, chatId, "gemini");

    } catch (err) {
      console.error("[TurnBased] Error finalizing recording:", err);
      resumeListening();
    }
  }, [chatId]);

  const resumeListening = useCallback(() => {
    if (statusRef.current !== "Idle") {
      // Small delay to avoid immediately picking up TTS tail echo
      setTimeout(() => startListening(), 500);
    }
  }, [startListening]);

  const stopListening = useCallback(async () => {
    await cleanupRecording();
    Speech.stop();
    setStatus("Idle");
  }, [cleanupRecording]);

  return {
    status,
    transcript,
    response,
    isReady,
    startListening,
    stopListening,
  };
}
