import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { CustomButton } from "../../components/CustomButton";
import { CustomInput } from "../../components/CustomInput";
import { GradientCard } from "../../components/GradientCard";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AuthStackParamList } from "../../navigation/types";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = NativeStackScreenProps<AuthStackParamList, "SignupEmailPassword">;

export function SignupEmailPasswordScreen({ navigation, route }: Props) {
  const { name, email, signupToken } = route.params;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const signupComplete = useAppStore((s) => s.signupComplete);
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const clearError = useAppStore((s) => s.clearError);

  const handleCreateAccount = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Error", "Please enter a password");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (!signupToken) {
      Alert.alert("Error", "Session expired. Please try again.");
      return;
    }

    try {
      await signupComplete(signupToken, name, username, password);
      // Navigation happens automatically when isAuthenticated changes
    } catch (err) {
      Alert.alert("Error", error || "Failed to create account");
      clearError();
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Set Password</Text>
        <Text style={styles.subtitle}>
          Verified: {name || "User"} ({email || "Email"})
        </Text>
        <GradientCard>
          <View style={styles.form}>
            <CustomInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Choose a username"
              autoCapitalize="none"
              editable={!isLoading}
            />
            <CustomInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Create password"
              secureTextEntry
              editable={!isLoading}
            />
            <CustomInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              secureTextEntry
              editable={!isLoading}
            />
            <CustomButton
              title={isLoading ? "Creating Account..." : "Create Account"}
              onPress={handleCreateAccount}
              disabled={isLoading}
            />
          </View>
        </GradientCard>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
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
    gap: spacing.sm,
  },
});
