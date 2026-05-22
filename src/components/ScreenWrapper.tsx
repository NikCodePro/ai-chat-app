import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type ScreenWrapperProps = {
  children: ReactNode;
  avoidKeyboard?: boolean;
};

export function ScreenWrapper({ children, avoidKeyboard = true }: ScreenWrapperProps) {
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#080A10', '#0D1320', '#111A2F']} style={styles.gradient}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
        {avoidKeyboard ? (
          <KeyboardAvoidingView
            style={styles.keyboardAvoid}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 40}
          >
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )}
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
  keyboardAvoid: {
    flex: 1,
  },
  content: {
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
