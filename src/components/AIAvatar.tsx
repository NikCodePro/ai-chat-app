import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolateColor,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

interface AIAvatarProps {
  isActive?: boolean;
  isSpeaking?: boolean;
  isConnecting?: boolean;
  isThinking?: boolean;
}

const RING_COUNT = 3;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AVATAR_SIZE = Math.min(SCREEN_WIDTH * 0.35, 140);

export function AIAvatar({
  isActive = false,
  isSpeaking = false,
  isConnecting = false,
  isThinking = false,
}: AIAvatarProps) {
  const scale = useSharedValue(1);
  const borderProgress = useSharedValue(0);

  useEffect(() => {
    if (isSpeaking) {
      // Energetic pulse when AI speaks
      scale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 300, easing: Easing.out(Easing.cubic) }),
          withTiming(0.97, { duration: 300, easing: Easing.inOut(Easing.cubic) })
        ),
        -1,
        true
      );
      borderProgress.value = withRepeat(
        withTiming(1, { duration: 1200 }),
        -1,
        true
      );
    } else if (isThinking) {
      // Thinking: steady, soft pulse
      scale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.96, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      borderProgress.value = withRepeat(
        withTiming(1, { duration: 1500 }),
        -1,
        true
      );
    } else if (isActive) {
      // Gentle breathing when listening
      scale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.98, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      borderProgress.value = withTiming(0.5, { duration: 500 });
    } else if (isConnecting) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 800 }),
          withTiming(0.97, { duration: 800 })
        ),
        -1,
        true
      );
      borderProgress.value = withRepeat(
        withTiming(1, { duration: 2000 }),
        -1,
        false
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 300 });
      borderProgress.value = withTiming(0, { duration: 300 });
    }
  }, [isActive, isSpeaking, isConnecting, isThinking]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      borderProgress.value,
      [0, 0.5, 1],
      [colors.primary, colors.accent, colors.secondary]
    ),
  }));

  const iconColor = isSpeaking
    ? colors.accent
    : isThinking
    ? colors.secondary
    : isActive
    ? colors.primary
    : isConnecting
    ? colors.secondary
    : colors.muted;

  const iconName = isSpeaking
    ? "volume-high"
    : isThinking
    ? "ellipsis-horizontal"
    : isActive
    ? "mic"
    : "hardware-chip";

  return (
    <View style={styles.wrapper}>
      {/* Pulsing ring layers */}
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <PulseRing
          key={i}
          index={i}
          isActive={isActive}
          isSpeaking={isSpeaking}
          isConnecting={isConnecting}
          isThinking={isThinking}
        />
      ))}

      {/* Main avatar circle */}
      <Animated.View style={[styles.container, avatarStyle, borderStyle]}>
        <Ionicons
          name={iconName}
          size={AVATAR_SIZE * 0.36}
          color={iconColor}
        />
      </Animated.View>
    </View>
  );
}

function PulseRing({
  index,
  isActive,
  isSpeaking,
  isConnecting,
  isThinking,
}: {
  index: number;
  isActive: boolean;
  isSpeaking: boolean;
  isConnecting: boolean;
  isThinking: boolean;
}) {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    const shouldAnimate = isActive || isSpeaking || isConnecting || isThinking;

    if (shouldAnimate) {
      const delay = index * 250;
      const duration = isSpeaking ? 900 : isThinking ? 1200 : 1800;

      ringScale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.6 + index * 0.15, { duration }),
            withTiming(1, { duration: 0 })
          ),
          -1,
          false
        )
      );
      ringOpacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(isSpeaking ? 0.4 : isThinking ? 0.3 : 0.25, { duration: duration * 0.15 }),
            withTiming(0, { duration: duration * 0.85 })
          ),
          -1,
          false
        )
      );
    } else {
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      ringScale.value = withTiming(1, { duration: 300 });
      ringOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isActive, isSpeaking, isConnecting, isThinking, index]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const ringColor = isSpeaking
    ? colors.accent
    : isThinking
    ? colors.secondary
    : colors.primary;

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          borderColor: ringColor,
          width: AVATAR_SIZE + 4,
          height: AVATAR_SIZE + 4,
          borderRadius: (AVATAR_SIZE + 4) / 2,
        },
        ringStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: AVATAR_SIZE * 2,
    height: AVATAR_SIZE * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 12,
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
});
