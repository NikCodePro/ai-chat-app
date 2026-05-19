import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '../theme/colors';

interface MicButtonProps {
  isRecording: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
}

export function MicButton({ isRecording, onPressIn, onPressOut, disabled }: MicButtonProps) {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(withTiming(1.2, { duration: 600 }), -1, true);
    } else {
      pulse.value = withTiming(1);
    }
  }, [isRecording]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: isRecording ? 0.3 : 0,
  }));

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.9);
        onPressIn();
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
        onPressOut();
      }}
      style={styles.container}
    >
      <Animated.View style={[styles.pulseCircle, pulseStyle]} />
      <Animated.View style={[styles.button, buttonStyle, isRecording && styles.buttonRecording, disabled && styles.disabled]}>
        <Ionicons 
          name={isRecording ? "mic" : "mic-outline"} 
          size={32} 
          color={colors.background} 
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.danger,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonRecording: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  }
});
