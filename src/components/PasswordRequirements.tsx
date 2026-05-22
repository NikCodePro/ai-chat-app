import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type RequirementProps = {
  isMet: boolean;
  text: string;
};

function RequirementItem({ isMet, text }: RequirementProps) {
  if (isMet) return null; // Hide if fulfilled, as requested

  return (
    <View style={styles.reqRow}>
      <Ionicons
        name="close-circle-outline"
        size={16}
        color={colors.danger}
      />
      <Text style={[styles.reqText, { color: colors.muted }]}>{text}</Text>
    </View>
  );
}

type PasswordRequirementsProps = {
  password: string;
};

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements = [
    {
      isMet: password.length >= 8,
      text: "At least 8 characters long",
    },
    // Optional: Add more requirements if needed by backend, e.g., numbers, letters
  ];

  const allMet = requirements.every((r) => r.isMet);

  if (allMet && password.length > 0) return null;

  return (
    <View style={styles.container}>
      {requirements.map((req, idx) => (
        <RequirementItem key={idx} isMet={req.isMet} text={req.text} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -spacing.xs,
    paddingHorizontal: spacing.xs,
    gap: 4,
  },
  reqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  reqText: {
    fontSize: typography.caption,
  },
});
