import React, { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { useVoiceCall } from "../../hooks/useVoiceCall";
import { AIAvatar } from "../../components/AIAvatar";
import { VoiceWave } from "../../components/VoiceWave";
import { CallControls } from "../../components/CallControls";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useNavigation } from "@react-navigation/native";

export function VoiceCallScreen() {
  const {
    status,
    isMuted,
    isSpeakerOn,
    startCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  } = useVoiceCall();
  const navigation = useNavigation();

  useEffect(() => {
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

  const isListening = status === "Listening...";
  const isSpeaking = status === "AI Speaking...";
  const isConnecting = status === "Connecting...";
  const isThinking = status === "AI Thinking...";

  // Status label — brief, no verbose text
  const getStatusLabel = () => {
    if (isConnecting) return "Connecting";
    if (isListening) return "Listening";
    if (isThinking) return "Thinking";
    if (isSpeaking) return "Speaking";
    return "";
  };

  const getStatusColor = () => {
    if (isListening) return colors.primary;
    if (isSpeaking) return colors.accent;
    if (isConnecting || isThinking) return colors.secondary;
    return colors.muted;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        {/* Avatar with pulse rings */}
        <View style={styles.avatarContainer}>
          <AIAvatar
            isActive={isListening}
            isSpeaking={isSpeaking}
            isConnecting={isConnecting}
            isThinking={isThinking}
          />
        </View>

        {/* Minimal status label */}
        {getStatusLabel() !== "" && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.statusContainer}
          >
            <StatusDot color={getStatusColor()} pulsing={isConnecting || isThinking} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusLabel()}
            </Text>
          </Animated.View>
        )}

        {/* Voice wave — only visible when listening or speaking */}
        <View style={styles.waveContainer}>
          <VoiceWave isActive={isListening} isSpeaking={isSpeaking} />
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

// Small pulsing status dot
function StatusDot({ color, pulsing }: { color: string; pulsing: boolean }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (pulsing) {
      opacity.value = withRepeat(
        withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [pulsing]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    backgroundColor: color,
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.lg,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  waveContainer: {
    height: 80,
    justifyContent: "center",
  },
  footer: {
    paddingBottom: spacing.xxl,
  },
});
