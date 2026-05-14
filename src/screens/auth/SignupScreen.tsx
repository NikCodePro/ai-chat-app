import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { GradientCard } from "../../components/GradientCard";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AuthStackParamList } from "../../navigation/types";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const googleAuth = useAppStore((s) => s.googleAuth);
  const isLoading = useAppStore((s) => s.isLoading);

  // Google OAuth configuration
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: "985688017742-ko0ptvnip8ms5ti8aakjf37hdqk1bgt4.apps.googleusercontent.com", // Replace with your actual Google Client ID
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
        // Navigation happens automatically on successful auth
      } else if (result.type === "error") {
        Alert.alert("Error", "Google sign-in was cancelled or failed");
      }
    } catch (err) {
      Alert.alert("Error", "Google sign-in failed");
    }
  };
  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Choose Signup Method</Text>
        <Text style={styles.subtitle}>
          First-time users verify once with OTP before sign-in
        </Text>
        <GradientCard>
          <View style={styles.form}>
            <Pressable
              style={styles.optionBtn}
              onPress={() => navigation.navigate("SignupEmail")}
            >
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <Text style={styles.optionText}>Continue with Email</Text>
            </Pressable>
            <Pressable
              style={styles.optionBtn}
              onPress={() => navigation.navigate("SignupPhone")}
            >
              <Ionicons name="call-outline" size={20} color={colors.accent} />
              <Text style={styles.optionText}>Continue with Phone</Text>
            </Pressable>
            <Pressable
              style={styles.optionBtn}
              onPress={handleGoogleSignIn}
              disabled={isLoading || !request}
            >
              <Ionicons name="logo-google" size={20} color={colors.text} />
              <Text style={styles.optionText}>Continue with Google</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("Login")}>
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
    gap: spacing.md,
  },
  optionBtn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  optionText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.weights.medium,
  },
  link: {
    textAlign: "center",
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
});
