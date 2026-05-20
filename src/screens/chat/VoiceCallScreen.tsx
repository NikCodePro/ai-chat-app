import React, { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVoiceCall } from "../../hooks/useVoiceCall";
import { AIAvatar } from "../../components/AIAvatar";
import { VoiceWave } from "../../components/VoiceWave";
import { CallControls } from "../../components/CallControls";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useNavigation } from "@react-navigation/native";
import { DebugOverlay } from "../../components/DebugOverlay";

export function VoiceCallScreen() {
  const {
    status,
    transcript,
    isMuted,
    isSpeakerOn,
    startCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  } = useVoiceCall();
  const navigation = useNavigation();

  useEffect(() => {
    // Automatically start call when screen opens
    startCall();

    return () => {
      endCall();
    };
  }, [startCall, endCall]);

  const handleEndCall = () => {
    endCall();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const isActive = status === "Listening..." || status === "AI Thinking...";
  const isSpeaking = status === "AI Speaking...";

  return (
    <SafeAreaView style={styles.container}>
      <DebugOverlay />
      <View style={styles.header}>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      <View style={styles.main}>
        <View style={styles.avatarContainer}>
          <AIAvatar isActive={isActive} isSpeaking={isSpeaking} />
        </View>

        <View style={styles.waveContainer}>
          <VoiceWave isActive={isActive} isSpeaking={isSpeaking} />
        </View>

        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptText} numberOfLines={3}>
            {transcript || (status === "Listening..." ? "Go ahead, I'm listening..." : "")}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <CallControls
          isMuted={isMuted}
          isSpeakerOn={isSpeakerOn}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onEndCall={handleEndCall}
        />
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
    padding: spacing.md,
    alignItems: "center",
  },
  statusText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "600",
  },
  main: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  avatarContainer: {
    marginBottom: spacing.xl,
  },
  waveContainer: {
    height: 120,
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  transcriptContainer: {
    width: "100%",
    minHeight: 80,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  transcriptText: {
    color: colors.text,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingBottom: spacing.xxl,
  },
});
