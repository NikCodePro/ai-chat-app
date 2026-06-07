import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Text } from "react-native";
import { AvatarState } from "./AIAvatar";

const STATUS_LABELS: Record<AvatarState, string> = {
  idle:       "Tap mic to speak",
  recording:  "Listening",
  processing: "Processing",
  speaking:   "AI Speaking",
  completed:  "Done",
  error:      "Error",
};

const STATUS_COLORS: Record<AvatarState, string> = {
  idle:       "rgba(255,255,255,0.5)",
  recording:  "#EF4444",
  processing: "#F59E0B",
  speaking:   "#10B981",
  completed:  "#818CF8",
  error:      "#EF4444",
};

interface VoiceStatusProps {
  state: AvatarState;
  errorMessage?: string;
}

export function VoiceStatus({ state, errorMessage }: VoiceStatusProps) {
  const dotOpacity1 = useSharedValue(0.3);
  const dotOpacity2 = useSharedValue(0.3);
  const dotOpacity3 = useSharedValue(0.3);

  const showDots = state === "recording" || state === "processing" || state === "speaking";

  useEffect(() => {
    if (showDots) {
      dotOpacity1.value = withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
        -1,
        false
      );
      setTimeout(() => {
        dotOpacity2.value = withRepeat(
          withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
          -1,
          false
        );
      }, 150);
      setTimeout(() => {
        dotOpacity3.value = withRepeat(
          withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
          -1,
          false
        );
      }, 300);
    } else {
      dotOpacity1.value = withTiming(0.3, { duration: 200 });
      dotOpacity2.value = withTiming(0.3, { duration: 200 });
      dotOpacity3.value = withTiming(0.3, { duration: 200 });
    }
  }, [state]);

  const dot1Style = useAnimatedStyle(() => ({ opacity: dotOpacity1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dotOpacity2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dotOpacity3.value }));

  const color = STATUS_COLORS[state];
  const label = STATUS_LABELS[state];

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        {showDots && (
          <View style={styles.dots}>
            <Animated.Text style={[styles.dot, { color }, dot1Style]}>•</Animated.Text>
            <Animated.Text style={[styles.dot, { color }, dot2Style]}>•</Animated.Text>
            <Animated.Text style={[styles.dot, { color }, dot3Style]}>•</Animated.Text>
          </View>
        )}
      </View>
      {state === "error" && errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  dots: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  dot: {
    fontSize: 18,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 13,
    color: "rgba(239,68,68,0.8)",
    textAlign: "center",
    maxWidth: 260,
    marginTop: 4,
  },
});
