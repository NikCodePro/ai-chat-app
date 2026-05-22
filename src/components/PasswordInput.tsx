import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type PasswordInputProps = {
  label: string;
  value: string;
  placeholder: string;
  editable?: boolean;
  isVisible: boolean;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
};

export function PasswordInput({
  label,
  value,
  placeholder,
  editable = true,
  isVisible,
  onChangeText,
  onToggleVisibility,
}: PasswordInputProps) {
  return (
    <View style={styles.passwordField}>
      <Text style={styles.passwordLabel}>{label}</Text>
      <View style={styles.passwordInputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!isVisible}
          style={styles.passwordInput}
        />
        <Pressable
          onPress={onToggleVisibility}
          disabled={!editable}
          hitSlop={8}
          style={styles.visibilityBtn}
        >
          <Ionicons
            name={isVisible ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={editable ? colors.text : colors.muted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  passwordField: {
    gap: spacing.xs,
  },
  passwordLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weights.semibold,
  },
  passwordInputRow: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  passwordInput: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    minHeight: 52,
  },
  visibilityBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
