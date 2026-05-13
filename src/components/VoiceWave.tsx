import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

export function VoiceWave() {
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 700, easing: Easing.out(Easing.cubic) }),
        withTiming(0.82, { duration: 700, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      true
    );
  }, [scale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.45 + (scale.value - 0.8) * 0.9,
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.ring, ringStyle]} />
      <View style={styles.core} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 184,
    height: 184,
    borderRadius: 92,
    backgroundColor: 'rgba(91, 214, 255, 0.22)',
  },
  core: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
});
