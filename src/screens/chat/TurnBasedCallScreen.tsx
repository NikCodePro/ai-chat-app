import React, { useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTurnBasedVoice } from "../../hooks/useTurnBasedVoice";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeIn, useAnimatedStyle, withRepeat, withTiming, withSequence, useSharedValue } from "react-native-reanimated";

export function TurnBasedCallScreen() {
  const {
    status,
    transcript,
    response,
    isReady,
    stopListening
  } = useTurnBasedVoice();
  
  const navigation = useNavigation();

  const handleEndCall = () => {
    stopListening();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const getStatusText = () => {
    if (!isReady) return "Connecting...";
    switch (status) {
      case "Listening": return "Listening for speech...";
      case "Detecting": return "Detecting...";
      case "Transcribing": return "Transcribing your speech...";
      case "Thinking": return "AI is thinking...";
      case "Speaking": return "AI is speaking...";
      default: return "Idle";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "Listening":
      case "Detecting": return colors.danger;
      case "Speaking": return colors.accent;
      case "Transcribing":
      case "Thinking": return colors.secondary;
      default: return colors.muted;
    }
  };

  // Pulse animation for the microphone
  const pulseScale = useSharedValue(1);
  
  useEffect(() => {
    if (status === "Listening" || status === "Detecting" || status === "Speaking") {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [status]);

  const animatedMicStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEndCall} style={styles.backButton}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Turn-Based AI</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {transcript ? (
          <Animated.View entering={FadeIn} style={styles.bubbleUser}>
            <Text style={styles.bubbleTextUser}>{transcript}</Text>
          </Animated.View>
        ) : null}

        {response || status === "Thinking" ? (
          <Animated.View entering={FadeIn} style={styles.bubbleAI}>
            <Text style={styles.bubbleTextAI}>
              {response || "..."}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        
        <View style={styles.micContainer}>
          <Animated.View style={[
            styles.recordIndicator, 
            { backgroundColor: getStatusColor() },
            animatedMicStyle
          ]}>
            <Ionicons 
              name={
                status === "Speaking" ? "volume-high" : 
                (status === "Transcribing" || status === "Thinking") ? "hourglass-outline" :
                "mic"
              } 
              size={36} 
              color="#fff" 
            />
          </Animated.View>
        </View>
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
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  placeholder: {
    width: 28,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    justifyContent: "flex-end", // Push bubbles to bottom
    paddingBottom: spacing.xxl,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    maxWidth: "85%",
  },
  bubbleTextUser: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 24,
  },
  bubbleAI: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: spacing.md,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    maxWidth: "85%",
  },
  bubbleTextAI: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
  },
  micContainer: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  recordIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
