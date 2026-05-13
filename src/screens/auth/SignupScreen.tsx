import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GradientCard } from '../../components/GradientCard';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { AuthStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Choose Signup Method</Text>
        <Text style={styles.subtitle}>First-time users verify once with OTP before sign-in</Text>
        <GradientCard>
          <View style={styles.form}>
            <Pressable style={styles.optionBtn} onPress={() => navigation.navigate('SignupEmail')}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <Text style={styles.optionText}>Continue with Email</Text>
            </Pressable>
            <Pressable style={styles.optionBtn} onPress={() => navigation.navigate('SignupPhone')}>
              <Ionicons name="call-outline" size={20} color={colors.accent} />
              <Text style={styles.optionText}>Continue with Phone</Text>
            </Pressable>
            <Pressable style={styles.optionBtn}>
              <Ionicons name="logo-google" size={20} color={colors.text} />
              <Text style={styles.optionText}>Continue with Google</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Already have an account? Sign in</Text>
            </Pressable>
          </View>
        </GradientCard>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.caption,
  },
  form: {
    gap: spacing.md,
  },
  optionBtn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weights.medium,
  },
  link: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
});
