import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import type { CallStatus } from '../hooks/useVoiceCall';

interface VoiceStatusProps {
  status: CallStatus;
  errorMessage?: string | null;
}

export function VoiceStatus({ status, errorMessage }: VoiceStatusProps) {
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    if (status === 'connecting' || status === 'ready') {
      dotOpacity.value = withRepeat(withTiming(0.3, { duration: 600 }), -1, true);
    } else {
      dotOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [status, dotOpacity]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  const getStatusText = () => {
    switch (status) {
      case 'connecting': return 'Connecting';
      case 'ready': return 'Starting session';
      case 'listening': return 'Listening';
      case 'ai_speaking': return 'AI Speaking';
      case 'error': return errorMessage || 'Error occurred';
      case 'ended': return 'Call Ended';
      default: return 'Tap to start';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'listening': return colors.primary;
      case 'ai_speaking': return colors.accent;
      case 'error': return colors.danger;
      case 'connecting':
      case 'ready': return colors.secondary;
      case 'ended': return colors.muted;
      default: return colors.muted;
    }
  };

  const showDots = status === 'connecting' || status === 'ready' || status === 'listening' || status === 'ai_speaking';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: getStatusColor() }]} />
        <Text style={[styles.text, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        {showDots && (
          <Animated.Text style={[styles.dots, { color: getStatusColor() }, dotStyle]}>
            ...
          </Animated.Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: typography.body,
    fontWeight: typography.weights.medium,
  },
  dots: {
    fontSize: typography.body,
    fontWeight: typography.weights.bold,
    marginLeft: -4,
  },
});
