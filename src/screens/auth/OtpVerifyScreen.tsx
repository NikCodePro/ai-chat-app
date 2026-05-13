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

type Props = NativeStackScreenProps<AuthStackParamList, "OtpVerify">;

export function OtpVerifyScreen({ navigation, route }: Props) {
  const { phone, name } = route.params;
  const [otp, setOtp] = useState("");
  const signupVerifyOtp = useAppStore((s) => s.signupVerifyOtp);
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const clearError = useAppStore((s) => s.clearError);

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP");
      return;
    }

    try {
      const signupToken = await signupVerifyOtp(phone, otp);
      navigation.navigate("SignupPhonePassword", { phone, name, signupToken });
    } catch (err) {
      Alert.alert("Error", error || "Failed to verify OTP");
      clearError();
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>
          Sent to {phone || "your phone number"}
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
            <Pressable onPress={handleVerifyOtp} disabled={isLoading}>
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
    marginTop: spacing.xs,
  },
});
