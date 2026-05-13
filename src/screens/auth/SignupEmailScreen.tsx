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

type Props = NativeStackScreenProps<AuthStackParamList, "SignupEmail">;

export function SignupEmailScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const signupInitiate = useAppStore((s) => s.signupInitiate);
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const clearError = useAppStore((s) => s.clearError);

  const handleSendOtp = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    try {
      await signupInitiate(email);
      navigation.navigate("EmailOtpVerify", { email, name });
    } catch (err) {
      Alert.alert("Error", error || "Failed to send OTP");
      clearError();
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Verify Email First</Text>
        <Text style={styles.subtitle}>
          We will send OTP before setting your password
        </Text>
        <GradientCard>
          <View style={styles.form}>
            <CustomInput
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              editable={!isLoading}
            />
            <CustomInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
            />
            <CustomButton
              title={isLoading ? "Sending..." : "Send OTP"}
              onPress={handleSendOtp}
              disabled={isLoading}
            />
            <Pressable
              onPress={() => {
                clearError();
                navigation.goBack();
              }}
              disabled={isLoading}
            >
              <Text style={styles.link}>Back to signup methods</Text>
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
    gap: spacing.sm,
  },
  link: {
    textAlign: "center",
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
});
