import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { GradientCard } from "../../components/GradientCard";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { MainStackParamList } from "../../navigation/types";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = NativeStackScreenProps<MainStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const logout = useAppStore((s) => s.logout);
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const clearError = useAppStore((s) => s.clearError);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (err) {
            Alert.alert("Error", error || "Failed to logout");
            clearError();
          }
        },
      },
    ]);
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Choose Your Mode</Text>
            <Text style={styles.subtitle}>
              Switch between text intelligence and voice assistant flow
            </Text>
          </View>
          <Pressable
            style={[styles.logoutBtn, isLoading && styles.disabled]}
            onPress={handleLogout}
            disabled={isLoading}
          >
            <Ionicons name="log-out-outline" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <Pressable
          style={styles.cardWrap}
          onPress={() => navigation.navigate("Chat")}
        >
          <GradientCard>
            <View style={styles.cardRow}>
              <Ionicons
                name="chatbubbles-outline"
                size={26}
                color={colors.primary}
              />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>AI Chat</Text>
                <Text style={styles.cardDesc}>
                  Smart replies, rich message bubbles, and quick prompts
                </Text>
              </View>
            </View>
          </GradientCard>
        </Pressable>

        <Pressable
          style={styles.cardWrap}
          onPress={() => navigation.navigate("Voice")}
        >
          <GradientCard>
            <View style={styles.cardRow}>
              <Ionicons name="radio-outline" size={26} color={colors.accent} />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>AI Voice Call</Text>
                <Text style={styles.cardDesc}>
                  Live call UI with animated wave and focused controls
                </Text>
              </View>
            </View>
          </GradientCard>
        </Pressable>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xl,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: typography.body,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  disabled: {
    opacity: 0.6,
  },
  cardWrap: {
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardText: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.subheading,
    fontWeight: typography.weights.bold,
  },
  cardDesc: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
});
