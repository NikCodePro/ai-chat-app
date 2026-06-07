import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import { AIAvatar, AvatarState } from "../../components/voice/AIAvatar";
import { VoiceStatus } from "../../components/voice/VoiceStatus";
import { TranscriptCard } from "../../components/voice/TranscriptCard";
import { ResponseCard } from "../../components/voice/ResponseCard";
import { processVoiceMessage } from "../../services/voiceApi";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

type ConversationEntry = {
  id: string;
  transcript: string;
  responseText: string;
  audioBase64: string;
};

export function VoiceAssistantScreen() {
  const navigation = useNavigation();
  const token = useAppStore((s) => s.accessToken);

  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // ── Start recording ──
  const startRecording = useCallback(async () => {
    if (avatarState !== "idle" && avatarState !== "completed" && avatarState !== "error") return;

    try {
      setErrorMessage(undefined);
      setAvatarState("idle");

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission Required", "Microphone permission is needed to record audio.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setAvatarState("recording");
    } catch (err: any) {
      console.error("[VoiceAssistant] Failed to start recording:", err);
      setErrorMessage("Could not access microphone. Please check permissions.");
      setAvatarState("error");
    }
  }, [avatarState]);

  // ── Stop recording and process ──
  const stopAndProcess = useCallback(async () => {
    if (avatarState !== "recording" || !recordingRef.current) return;

    const rec = recordingRef.current;
    recordingRef.current = null;

    setAvatarState("processing");

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();

      if (!uri || !token) throw new Error("Recording failed or not authenticated");

      // Reset audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      // Upload to backend
      const result = await processVoiceMessage(uri, token);

      // Clean up temp recording file
      await FileSystem.deleteAsync(uri, { idempotent: true });

      if (!result.success) throw new Error("Backend processing failed");

      const entry: ConversationEntry = {
        id: Date.now().toString(),
        transcript: result.transcript,
        responseText: result.response_text,
        audioBase64: result.audio_base64,
      };

      setConversation((prev) => [...prev, entry]);

      // Auto-play the response
      await playAudio(entry);

    } catch (err: any) {
      console.error("[VoiceAssistant] Processing error:", err);
      setErrorMessage(err.message || "Something went wrong. Please try again.");
      setAvatarState("error");
    }
  }, [avatarState, token]);

  // ── Play audio from base64 ──
  const playAudio = useCallback(async (entry: ConversationEntry) => {
    try {
      // Stop any currently playing audio
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      setAvatarState("speaking");
      setIsPlaying(true);
      setPlayingId(entry.id);

      // Write WAV to a temp file using expo-file-system string path
      const tempUri = (FileSystem as any).documentDirectory 
        ? (FileSystem as any).documentDirectory + `ai_${entry.id}.wav`
        : `file:///data/user/0/host.exp.exponent/files/ai_${entry.id}.wav`;
      
      await FileSystem.writeAsStringAsync(tempUri, entry.audioBase64, {
        encoding: "base64",
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: tempUri },
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPlayingId(null);
          setAvatarState("completed");
          sound.unloadAsync();
          soundRef.current = null;
          // Clean up temp file
          FileSystem.deleteAsync(tempUri, { idempotent: true });
        }
      });

      // Scroll to bottom
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);

    } catch (err: any) {
      console.error("[VoiceAssistant] Playback error:", err);
      setIsPlaying(false);
      setPlayingId(null);
      setAvatarState("completed");
    }
  }, []);

  const stopAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlaying(false);
    setPlayingId(null);
    setAvatarState("completed");
  }, []);

  const handleClose = useCallback(async () => {
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (_) {}
    }
    await stopAudio();
    if (navigation.canGoBack()) navigation.goBack();
  }, [stopAudio]);

  const isMicEnabled = avatarState === "idle" || avatarState === "completed" || avatarState === "error";
  const isRecording = avatarState === "recording";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Assistant</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Avatar + Status */}
      <View style={styles.avatarSection}>
        <AIAvatar state={avatarState} size={130} />
        <View style={{ height: spacing.xl }} />
        <VoiceStatus state={avatarState} errorMessage={errorMessage} />
      </View>

      {/* Conversation */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {conversation.length === 0 && (
          <Animated.View entering={FadeIn} style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={40} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyText}>Your conversation will appear here</Text>
          </Animated.View>
        )}
        {conversation.map((entry) => (
          <View key={entry.id} style={styles.entryGroup}>
            <TranscriptCard text={entry.transcript} />
            <ResponseCard
              text={entry.responseText}
              isPlaying={isPlaying && playingId === entry.id}
              onReplay={() => playAudio(entry)}
              onStop={stopAudio}
            />
          </View>
        ))}
      </ScrollView>

      {/* Mic Button */}
      <View style={styles.footer}>
        {isRecording ? (
          <View style={styles.recordingRow}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingLabel}>Recording — tap to send</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.micButton,
            isRecording && styles.micButtonActive,
            !isMicEnabled && !isRecording && styles.micButtonDisabled,
          ]}
          onPress={isRecording ? stopAndProcess : startRecording}
          activeOpacity={0.75}
          disabled={!isMicEnabled && !isRecording}
        >
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={styles.footerHint}>
          {isRecording ? "Tap to stop & send" : "Tap to speak"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.3,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.25)",
    textAlign: "center",
  },
  entryGroup: {
    gap: spacing.md,
  },
  footer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  recordingLabel: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "600",
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  micButtonActive: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  micButtonDisabled: {
    opacity: 0.4,
  },
  footerHint: {
    fontSize: 13,
    color: colors.muted,
  },
});
