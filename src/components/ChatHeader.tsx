import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { Chat } from "../services/chatApi";

type ChatHeaderProps = {
  currentChat: Chat | null;
  onMenuPress: () => void;
};

export function ChatHeader({
  currentChat,
  onMenuPress,
}: ChatHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Pressable onPress={onMenuPress} style={styles.iconBtn}>
          <Ionicons name="menu-outline" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.titleContainer}>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {currentChat ? currentChat.title : "Chats"}
          </Text>
          {currentChat && (
            <Text style={styles.modelBadge}>{currentChat.model}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  iconBtn: {
    paddingVertical: spacing.xxs,
    paddingRight: spacing.xs,
  },
  titleContainer: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    maxWidth: 240,
  },
  modelBadge: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
    textTransform: "capitalize",
  },
});
