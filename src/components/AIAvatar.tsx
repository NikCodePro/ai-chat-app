import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '../theme/colors';

interface AIAvatarProps {
  isActive?: boolean;
  isSpeaking?: boolean;
}

export function AIAvatar({ isActive = false, isSpeaking = false }: AIAvatarProps) {
  const glow = useSharedValue(0.3);

  useEffect(() => {
    if (isSpeaking) {
      glow.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 400, easing: Easing.out(Easing.cubic) }),
          withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.cubic) })
        ),
        -1,
        true
      );
    } else if (isActive) {
      glow.value = withTiming(0.5, { duration: 300 });
    } else {
      glow.value = withTiming(0.3, { duration: 300 });
    }
  }, [isActive, isSpeaking, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
  }));

  return (
    <Animated.View style={[styles.container, glowStyle]}>
      <Ionicons
        name="hardware-chip"
        size={48}
        color={isSpeaking ? colors.accent : colors.primary}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
});
