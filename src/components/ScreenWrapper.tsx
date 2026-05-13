import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

type ScreenWrapperProps = {
  children: ReactNode;
};

export function ScreenWrapper({ children }: ScreenWrapperProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#080A10', '#0D1320', '#111A2F']} style={styles.gradient}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
        {children}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  glowTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(91, 214, 255, 0.14)',
    top: -70,
    right: -40,
  },
  glowBottom: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(124, 139, 255, 0.12)',
    bottom: -80,
    left: -70,
  },
});
