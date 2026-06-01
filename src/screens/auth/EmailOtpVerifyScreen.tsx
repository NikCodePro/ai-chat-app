import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
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

type Props = NativeStackScreenProps<AuthStackParamList, "EmailOtpVerify">;

export function EmailOtpVerifyScreen({ navigation, route }: Props) {
  const { email, name } = route.params;
  const [otp, setOtp] = useState("");
  const signupVerifyOtp = useAppStore((s) => s.signupVerifyOtp);
  const signupInitiate = useAppStore((s) => s.signupInitiate);
  const isLoading = useAppStore((s) => s.isLoading);
  const clearError = useAppStore((s) => s.clearError);

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    if (!otp.trim() || otp.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP");
      return;
    }

    try {
      const signupToken = await signupVerifyOtp(email, otp);
      navigation.navigate("SignupEmailPassword", { email, name, signupToken });
    } catch (caughtError) {
      Alert.alert("Error", getErrorMessage(caughtError, "Failed to verify OTP"));
      clearError();
    }
  };

  const handleResendOtp = async () => {
    Keyboard.dismiss();
    try {
      await signupInitiate(email);
      Alert.alert("Success", "OTP resent successfully");
    } catch (caughtError) {
      Alert.alert("Error", getErrorMessage(caughtError, "Failed to resend OTP"));
      clearError();
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Enter Email OTP</Text>
        <Text style={styles.subtitle}>
          Sent to {email || "your email address"}
        </Text>
        <GradientCard>
          <View style={styles.form}>
            <CustomInput
              label="One-Time Password"
              value={otp}
              onChangeText={setOtp}
              placeholder="6-digit OTP"
              keyboardType="number-pad"
              maxLength={6}
              editable={!isLoading}
            />
            <CustomButton
              title={isLoading ? "Verifying..." : "Verify OTP"}
              onPress={handleVerifyOtp}
              disabled={isLoading}
            />
            <Pressable 
              onPress={handleResendOtp} 
              disabled={isLoading}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              style={({ pressed }) => [
                styles.resendBtn,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.link}>Resend OTP</Text>
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
  },
  resendBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
});
