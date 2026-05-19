import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors } from "../theme/colors";

interface VoiceWaveProps {
  isActive: boolean;
  isSpeaking: boolean;
}

const NUM_BARS = 5;

export function VoiceWave({ isActive, isSpeaking }: VoiceWaveProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: NUM_BARS }).map((_, i) => (
        <WaveBar key={i} index={i} isActive={isActive} isSpeaking={isSpeaking} />
      ))}
    </View>
  );
}

function WaveBar({ index, isActive, isSpeaking }: { index: number; isActive: boolean; isSpeaking: boolean }) {
  const height = useSharedValue(20);

  useEffect(() => {
    if (isSpeaking || isActive) {
      const delay = index * 100;
      const duration = 400 + Math.random() * 200;
      const targetHeight = isSpeaking ? 60 + Math.random() * 40 : 30 + Math.random() * 20;

      setTimeout(() => {
        height.value = withRepeat(
          withSequence(
            withTiming(targetHeight, { duration, easing: Easing.out(Easing.ease) }),
            withTiming(20, { duration, easing: Easing.in(Easing.ease) })
          ),
          -1,
          true
        );
      }, delay);
    } else {
      height.value = withTiming(20, { duration: 300 });
    }
  }, [isActive, isSpeaking, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 100,
    gap: 8,
  },
  bar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
});
