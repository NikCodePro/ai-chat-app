import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { CustomButton } from "../../components/CustomButton";
import { CustomInput } from "../../components/CustomInput";
import { GradientCard } from "../../components/GradientCard";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AuthStackParamList } from "../../navigation/types";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const login = useAppStore((s) => s.login);
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const clearError = useAppStore((s) => s.clearError);

  const handleSignIn = async () => {
    if (!identifier.trim()) {
      Alert.alert("Error", "Please enter email, phone, or username");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    try {
      const requires2FA = await login(identifier, password);
      if (requires2FA) {
        // TODO: Navigate to 2FA verification screen when implemented
        Alert.alert("Info", "2FA verification required (not yet implemented)");
      }
      // On successful login without 2FA, navigation happens automatically
    } catch (err) {
      Alert.alert("Error", error || "Login failed");
      clearError();
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Sign in with email or phone and password
        </Text>
        <GradientCard>
          <View style={styles.form}>
            <CustomInput
              label="Email or Phone"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="you@example.com / +91 98765 43210"
              autoCapitalize="none"
              editable={!isLoading}
            />
            <CustomInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              autoCapitalize="none"
              secureTextEntry
              editable={!isLoading}
            />
            <CustomButton
              title={isLoading ? "Signing in..." : "Sign in"}
              onPress={handleSignIn}
              disabled={isLoading}
            />
            <Pressable style={styles.googleBtn} disabled={isLoading}>
              <Ionicons name="logo-google" size={18} color={colors.text} />
              <Text style={styles.googleText}>Sign in with Google</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                clearError();
                navigation.navigate("Signup");
              }}
              disabled={isLoading}
            >
              <Text style={styles.link}>
                First time here? Verify and create account
              </Text>
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
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    marginBottom: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  link: {
    textAlign: "center",
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weights.semibold,
  },
  googleBtn: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  googleText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weights.medium,
  },
});
