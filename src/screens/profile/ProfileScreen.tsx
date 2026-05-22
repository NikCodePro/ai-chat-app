import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CustomButton } from "../../components/CustomButton";
import { CustomInput } from "../../components/CustomInput";
import { GradientCard } from "../../components/GradientCard";
import { PasswordInput } from "../../components/PasswordInput";
import { PasswordRequirements } from "../../components/PasswordRequirements";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { MainStackParamList } from "../../navigation/types";
import { getErrorMessage } from "../../services/api";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = NativeStackScreenProps<MainStackParamList, "Profile">;

export function ProfileScreen({ navigation }: Props) {
  const user = useAppStore((s) => s.user);
  const isLoading = useAppStore((s) => s.isLoading);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const changePassword = useAppStore((s) => s.changePassword);

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setUsername(user?.username || "");
  }, [user?.name, user?.username]);

  const profileIdentifier = user?.email || user?.phone || "";
  const profileIdentifierLabel = user?.email ? "Email Address" : "Phone Number";
  const hasProfileChanges =
    name.trim() !== (user?.name || "") || username.trim() !== (user?.username || "");

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Name cannot be empty");
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      Alert.alert("Validation Error", "Username must be at least 3 characters");
      return;
    }

    if (!hasProfileChanges) {
      Alert.alert("Info", "No changes made to profile");
      return;
    }

    try {
      await updateProfile(name.trim(), username.trim());
      Alert.alert("Success", "Profile updated successfully!");
    } catch (caughtError) {
      Alert.alert(
        "Error",
        getErrorMessage(caughtError, "Failed to update profile"),
      );
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert("Validation Error", "New password is required");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Validation Error", "New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Validation Error", "New passwords do not match");
      return;
    }

    try {
      await changePassword(newPassword);
      Alert.alert("Success", "Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setIsNewPasswordVisible(false);
      setIsConfirmPasswordVisible(false);
    } catch (caughtError) {
      Alert.alert(
        "Error",
        getErrorMessage(caughtError, "Failed to change password"),
      );
    }
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Profile Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Details</Text>
          <GradientCard>
            <View style={styles.form}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.name ? user.name[0].toUpperCase() : "U"}
                  </Text>
                </View>
                <Text style={styles.emailText}>
                  {profileIdentifier || "No email or phone available"}
                </Text>
              </View>

              <CustomInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                editable={!isLoading}
              />
              <CustomInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Enter a unique username"
                autoCapitalize="none"
                editable={!isLoading}
              />

              {profileIdentifier ? (
                <View style={styles.lockedField}>
                  <Text style={styles.lockedLabel}>{profileIdentifierLabel}</Text>
                  <View style={styles.lockedValueRow}>
                    <Ionicons
                      name={user?.email ? "mail-outline" : "call-outline"}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.lockedValue} numberOfLines={1}>
                      {profileIdentifier}
                    </Text>
                    <Ionicons name="lock-closed" size={15} color={colors.muted} />
                  </View>
                </View>
              ) : null}

              <CustomButton
                title={isLoading ? "Updating..." : "Save Profile"}
                onPress={handleUpdateProfile}
                disabled={isLoading || !hasProfileChanges}
              />
            </View>
          </GradientCard>
        </View>

        {/* Security Section (only if not google provider) */}
        {user?.auth_provider !== "google" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            <GradientCard>
              <View style={styles.form}>
                <PasswordInput
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  editable={!isLoading}
                  isVisible={isNewPasswordVisible}
                  onToggleVisibility={() =>
                    setIsNewPasswordVisible((visible) => !visible)
                  }
                />
                <PasswordRequirements password={newPassword} />
                <PasswordInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  editable={!isLoading}
                  isVisible={isConfirmPasswordVisible}
                  onToggleVisibility={() =>
                    setIsConfirmPasswordVisible((visible) => !visible)
                  }
                />

                <CustomButton
                  title={isLoading ? "Updating..." : "Change Password"}
                  onPress={handleChangePassword}
                  disabled={isLoading || !newPassword || !confirmPassword}
                />
              </View>
            </GradientCard>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: spacing.xs,
  },
  form: {
    gap: spacing.md,
  },
  lockedField: {
    gap: spacing.xs,
  },
  lockedLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: typography.weights.semibold,
  },
  lockedValueRow: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  lockedValue: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
  },
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
  avatarContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarText: {
    color: "#090B11",
    fontSize: 32,
    fontWeight: "700",
  },
  emailText: {
    color: colors.muted,
    fontSize: 14,
  }
});
