import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export type AvatarState = "idle" | "recording" | "processing" | "speaking" | "completed" | "error";

interface AIAvatarProps {
  state: AvatarState;
  size?: number;
}

const STATE_COLORS: Record<AvatarState, [string, string]> = {
  idle:       ["#4F46E5", "#7C3AED"],
  recording:  ["#DC2626", "#EF4444"],
  processing: ["#D97706", "#F59E0B"],
  speaking:   ["#059669", "#10B981"],
  completed:  ["#4F46E5", "#7C3AED"],
  error:      ["#DC2626", "#9B2335"],
};

const STATE_ICONS: Record<AvatarState, string> = {
  idle:       "mic-outline",
  recording:  "mic",
  processing: "hourglass-outline",
  speaking:   "volume-high",
  completed:  "checkmark-circle-outline",
  error:      "alert-circle-outline",
};

export function AIAvatar({ state, size = 120 }: AIAvatarProps) {
  const scale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.5);
  const ringScale = useSharedValue(1);

  useEffect(() => {
    if (state === "recording" || state === "speaking") {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      ringOpacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 700 }), withTiming(0.2, { duration: 700 })),
        -1,
        true
      );
      ringScale.value = withRepeat(
        withSequence(withTiming(1.35, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        true
      );
    } else if (state === "processing") {
      scale.value = withRepeat(
        withSequence(withTiming(0.95, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        true
      );
      ringOpacity.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 400 }), withTiming(0.2, { duration: 400 })),
        -1,
        true
      );
      ringScale.value = withTiming(1.15, { duration: 300 });
    } else {
      scale.value = withTiming(1, { duration: 300 });
      ringOpacity.value = withTiming(0.3, { duration: 300 });
      ringScale.value = withTiming(1, { duration: 300 });
    }
  }, [state]);

  const avatarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const [c1, c2] = STATE_COLORS[state];
  const iconName = STATE_ICONS[state] as any;
  const avatarSize = size;
  const ringSize = size * 1.4;
  const iconSize = size * 0.38;

  return (
    <View style={[styles.wrapper, { width: ringSize, height: ringSize }]}>
      {/* Pulsing ring */}
      <Animated.View
        style={[
          styles.ring,
          { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderColor: c1 },
          ringAnimStyle,
        ]}
      />

      {/* Avatar body */}
      <Animated.View style={[{ width: avatarSize, height: avatarSize }, avatarAnimStyle]}>
        <LinearGradient
          colors={[c1, c2]}
          style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={iconName} size={iconSize} color="#fff" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
});
