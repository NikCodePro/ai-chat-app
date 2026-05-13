import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type CustomButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

export function CustomButton({
  title,
  onPress,
  disabled = false,
}: CustomButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrap,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <LinearGradient
        colors={
          disabled ? ["#444", "#333"] : [colors.secondary, colors.primary]
        }
        style={styles.gradient}
      >
        <Text style={[styles.text, disabled && styles.disabledText]}>
          {title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.6,
  },
  gradient: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  text: {
    color: "#07111F",
    fontSize: typography.button,
    fontWeight: typography.weights.bold,
  },
  disabledText: {
    opacity: 0.7,
  },
});
