import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RTCView, MediaStream } from "react-native-webrtc";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useVoiceCall } from "../../hooks/useVoiceCall";
import { webrtcService } from "../../services/webrtcService";
import { CallControls } from "../../components/CallControls";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export function VideoCallScreen() {
  const navigation = useNavigation();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAvatarReady, setIsAvatarReady] = useState(false);

  const {
    status,
    isMuted,
    isSpeakerOn,
    startCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  } = useVoiceCall({
    isVideoCall: true,
    onTranscript: (text) => {
      // Forward Gemini's AI text to the HeyGen Avatar to speak
      console.log("[VideoCall] Forwarding transcript to avatar:", text);
      webrtcService.sendTask(text);
    },
  });

  useEffect(() => {
    // 1. Setup WebRTC Callbacks
    webrtcService.onStream = (mediaStream) => {
      setStream(mediaStream);
    };

    webrtcService.onConnectionStateChange = (state) => {
      if (state === "connected") {
        setIsAvatarReady(true);
      }
    };

    // 2. Start HeyGen Avatar Session
    webrtcService.startAvatarSession().catch((err) => {
      console.error("Failed to start Avatar session:", err);
    });

    // 3. Start Voice Backend Session (Gemini)
    startCall();

    return () => {
      webrtcService.closeSession();
      endCall();
    };
  }, [startCall, endCall]);

  const handleEndCall = () => {
    webrtcService.closeSession();
    endCall();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const isConnecting = status === "Connecting...";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Video Call</Text>
        <Text style={styles.status}>{status}</Text>
      </View>

      <View style={styles.videoContainer}>
        {stream ? (
          <RTCView
            streamURL={stream.toURL()}
            style={styles.rtcView}
            objectFit="cover"
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Initializing Avatar...</Text>
          </View>
        )}
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
    paddingTop: spacing.lg,
    alignItems: "center",
    zIndex: 10,
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: typography.weights.bold,
  },
  status: {
    color: colors.primary,
    fontSize: typography.body,
    marginTop: spacing.xs,
  },
  videoContainer: {
    flex: 1,
    marginVertical: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#1C1C1E",
  },
  rtcView: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.muted,
    fontSize: typography.body,
  },
  footer: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
});
