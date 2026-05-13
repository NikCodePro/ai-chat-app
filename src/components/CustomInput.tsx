import { Text, TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type CustomInputProps = TextInputProps & {
  label: string;
};

export function CustomInput({ label, ...props }: CustomInputProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCorrect={false}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weights.semibold,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: typography.body,
  },
});
