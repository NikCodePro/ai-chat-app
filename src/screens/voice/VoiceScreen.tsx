import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VoiceWave } from '../../components/VoiceWave';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useAppStore } from '../../store/appStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

function formatSeconds(seconds: number) {
  const min = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

export function VoiceScreen() {
  const seconds = useAppStore((s) => s.activeCallSeconds);
  const tickCall = useAppStore((s) => s.tickCall);
  const resetCall = useAppStore((s) => s.resetCall);

  useEffect(() => {
    const timer = setInterval(() => tickCall(), 1000);
    return () => clearInterval(timer);
  }, [tickCall]);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>AI Voice Session</Text>
        <Text style={styles.timer}>{formatSeconds(seconds)}</Text>
        <VoiceWave />
        <View style={styles.controls}>
          <Pressable style={styles.muteBtn}>
            <Ionicons name="mic-off-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable style={styles.endBtn} onPress={resetCall}>
            <Ionicons name="call" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: typography.weights.bold,
  },
  timer: {
    color: colors.muted,
    fontSize: typography.body,
    marginBottom: spacing.md,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  muteBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  endBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
});
