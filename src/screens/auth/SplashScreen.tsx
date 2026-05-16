import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export function SplashScreen() {
  const pulse = useSharedValue(0.9);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.45 + (pulse.value - 0.9),
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <LinearGradient colors={[colors.secondary, colors.primary]} style={styles.logo}>
        <Text style={styles.logoText}>AI</Text>
      </LinearGradient>
      <Text style={styles.caption}>Warming up your workspace</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(91, 214, 255, 0.2)',
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#091223',
    fontSize: 32,
    fontWeight: typography.weights.bold,
  },
  title: {
    marginTop: 18,
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: typography.weights.bold,
  },
  caption: {
    marginTop: 6,
    color: colors.muted,
    fontSize: typography.caption,
  },
});
