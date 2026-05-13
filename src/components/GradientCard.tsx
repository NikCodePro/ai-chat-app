import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

type GradientCardProps = {
  children: ReactNode;
};

export function GradientCard({ children }: GradientCardProps) {
  return (
    <LinearGradient colors={['rgba(124,139,255,0.28)', 'rgba(91,214,255,0.18)']} style={styles.shell}>
      <View style={styles.inner}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 20,
    padding: 1,
  },
  inner: {
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 18,
  },
});
