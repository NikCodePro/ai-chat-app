import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CustomButton } from "../../components/CustomButton";
import { CustomInput } from "../../components/CustomInput";
import { GradientCard } from "../../components/GradientCard";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AuthStackParamList } from "../../navigation/types";
import { getErrorMessage } from "../../services/api";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateIdentifier(value: string) {
  const identifier = value.trim();

  if (!identifier) {
    return "Enter your email, phone number, or username";
  }

  if (identifier.includes("@")) {
    return emailPattern.test(identifier) ? "" : "Enter a valid email address";
  }

  if (/^[+\d\s()-]+$/.test(identifier)) {
    const digits = identifier.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15
      ? ""
      : "Enter a valid phone number";
  }

  return identifier.length >= 3 ? "" : "Username must be at least 3 characters";
}

export function LoginScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const login = useAppStore((s) => s.login);
  const googleAuth = useAppStore((s) => s.googleAuth);
  const isLoading = useAppStore((s) => s.isLoading);
  const clearError = useAppStore((s) => s.clearError);

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId:
        "985688017742-ko0ptvnip8ms5ti8aakjf37hdqk1bgt4.apps.googleusercontent.com",
      scopes: ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.Token,
      redirectUri: AuthSession.makeRedirectUri(),
    },
    { authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth" },
  );

  const handleGoogleSignIn = async () => {
    try {
      const result = await promptAsync();
      if (result.type === "success" && result.params.id_token) {
        await googleAuth(result.params.id_token);
      } else if (result.type === "error") {
        Alert.alert("Error", "Google sign-in was cancelled or failed");
      }
    } catch (caughtError) {
      Alert.alert(
        "Google sign-in failed",
        getErrorMessage(caughtError, "Google sign-in failed"),
      );
    }
  };

  const handleSignIn = async () => {
    const nextIdentifierError = validateIdentifier(identifier);
    const nextPasswordError = password ? "" : "Enter your password";

    setIdentifierError(nextIdentifierError);
    setPasswordError(nextPasswordError);

    if (nextIdentifierError || nextPasswordError) {
      return;
    }

    try {
      Keyboard.dismiss();
      const requires2FA = await login(identifier.trim(), password);
      if (requires2FA) {
        Alert.alert("Info", "2FA verification required (not yet implemented)");
      }
    } catch (caughtError) {
      Alert.alert("Sign-in failed", getErrorMessage(caughtError, "Login failed"));
      clearError();
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Sign in with email, phone, or username and password
        </Text>
        <GradientCard>
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <CustomInput
                label="Email, Phone or Username"
                value={identifier}
                onChangeText={(value) => {
                  setIdentifier(value);
                  if (identifierError) {
                    setIdentifierError(validateIdentifier(value));
                  }
                }}
                onBlur={() => setIdentifierError(validateIdentifier(identifier))}
                placeholder="you@example.com / +91 98765 43210"
                autoCapitalize="none"
                autoComplete="username"
                editable={!isLoading}
                returnKeyType="next"
                textContentType="username"
              />
              {identifierError ? (
                <Text style={styles.fieldError}>{identifierError}</Text>
              ) : null}
            </View>

            <PasswordField
              value={password}
              error={passwordError}
              editable={!isLoading}
              isVisible={isPasswordVisible}
              onBlur={() => setPasswordError(password ? "" : "Enter your password")}
              onChangeText={(value) => {
                setPassword(value);
                if (passwordError) {
                  setPasswordError(value ? "" : "Enter your password");
                }
              }}
              onSubmit={handleSignIn}
              onToggleVisibility={() =>
                setIsPasswordVisible((visible) => !visible)
              }
            />

            <CustomButton
              title={isLoading ? "Signing in..." : "Sign in"}
              onPress={handleSignIn}
              disabled={isLoading}
            />

            <Pressable
              accessibilityLabel="Sign in with Google"
              style={[styles.googleBtn, (isLoading || !request) && styles.disabled]}
              onPress={handleGoogleSignIn}
              disabled={isLoading || !request}
            >
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

type PasswordFieldProps = {
  value: string;
  error: string;
  editable: boolean;
  isVisible: boolean;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onToggleVisibility: () => void;
};

function PasswordField({
  value,
  error,
  editable,
  isVisible,
  onBlur,
  onChangeText,
  onSubmit,
  onToggleVisibility,
}: PasswordFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.passwordLabel}>Password</Text>
      <View style={[styles.passwordRow, !!error && styles.passwordRowError]}>
        <TextInput
          value={value}
          onBlur={onBlur}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="Enter your password"
          placeholderTextColor={colors.muted}
          editable={editable}
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          returnKeyType="go"
          secureTextEntry={!isVisible}
          textContentType="password"
          style={styles.passwordInput}
        />
        <Pressable
          accessibilityLabel={isVisible ? "Hide password" : "Show password"}
          onPress={onToggleVisibility}
          disabled={!editable}
          hitSlop={8}
          style={styles.passwordToggle}
        >
          <Ionicons
            name={isVisible ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={editable ? colors.text : colors.muted}
          />
        </Pressable>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
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
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldError: {
    color: colors.danger,
    fontSize: typography.caption,
  },
  passwordLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weights.semibold,
  },
  passwordRow: {
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
  passwordRowError: {
    borderColor: colors.danger,
  },
  passwordInput: {
    flex: 1,
    minHeight: 52,
    color: colors.text,
    fontSize: typography.body,
  },
  passwordToggle: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.6,
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
