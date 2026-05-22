import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { colors } from "../theme/colors";

interface VoiceWaveProps {
  isActive: boolean;
  isSpeaking: boolean;
}

const NUM_BARS = 7;

export function VoiceWave({ isActive, isSpeaking }: VoiceWaveProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: NUM_BARS }).map((_, i) => (
        <WaveBar
          key={i}
          index={i}
          total={NUM_BARS}
          isActive={isActive}
          isSpeaking={isSpeaking}
        />
      ))}
    </View>
  );
}

function WaveBar({
  index,
  total,
  isActive,
  isSpeaking,
}: {
  index: number;
  total: number;
  isActive: boolean;
  isSpeaking: boolean;
}) {
  const height = useSharedValue(4);
  const opacity = useSharedValue(0.3);

  // Center bars are taller, edge bars are shorter (bell curve effect)
  const center = (total - 1) / 2;
  const distFromCenter = Math.abs(index - center) / center; // 0..1
  const heightMultiplier = 1 - distFromCenter * 0.5;

  useEffect(() => {
    if (isSpeaking) {
      // AI speaking: energetic, fast, tall bars with staggered timing
      const delay = index * 60;
      const baseDuration = 250 + Math.random() * 150;
      const maxHeight = (55 + Math.random() * 30) * heightMultiplier;

      height.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(maxHeight, {
              duration: baseDuration,
              easing: Easing.out(Easing.cubic),
            }),
            withTiming(8 + Math.random() * 8, {
              duration: baseDuration * 1.2,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          true
        )
      );
      opacity.value = withTiming(1, { duration: 200 });
    } else if (isActive) {
      // Listening: gentle, slow breathing animation
      const delay = index * 120;
      const baseDuration = 800 + Math.random() * 400;
      const maxHeight = (18 + Math.random() * 14) * heightMultiplier;

      height.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(maxHeight, {
              duration: baseDuration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(6, {
              duration: baseDuration,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          true
        )
      );
      opacity.value = withTiming(0.7, { duration: 300 });
    } else {
      // Idle
      cancelAnimation(height);
      height.value = withTiming(4, { duration: 400 });
      opacity.value = withTiming(0.3, { duration: 400 });
    }
  }, [isActive, isSpeaking, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  const barColor = isSpeaking ? colors.accent : colors.primary;

  return (
    <Animated.View
      style={[styles.bar, { backgroundColor: barColor }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 80,
    gap: 5,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    minHeight: 4,
  },
});
