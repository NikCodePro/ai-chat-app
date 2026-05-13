import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { ChatBubble } from "../../components/ChatBubble";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { Chat } from "../../services/chatApi";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

export function ChatScreen() {
  const messages = useAppStore((s) => s.messages);
  const currentChat = useAppStore((s) => s.currentChat);
  const chats = useAppStore((s) => s.chats);
  const isChatLoading = useAppStore((s) => s.isChatLoading);
  const chatError = useAppStore((s) => s.chatError);
  const wsInstance = useAppStore((s) => s.wsInstance);

  const loadChats = useAppStore((s) => s.loadChats);
  const setCurrentChat = useAppStore((s) => s.setCurrentChat);
  const createNewChat = useAppStore((s) => s.createNewChat);
  const connectWebSocket = useAppStore((s) => s.connectWebSocket);
  const disconnectWebSocket = useAppStore((s) => s.disconnectWebSocket);
  const sendChatMessage = useAppStore((s) => s.sendChatMessage);
  const clearChatError = useAppStore((s) => s.clearChatError);

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showChatList, setShowChatList] = useState(false);

  const data = useMemo(() => messages, [messages]);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Connect WebSocket when component mounts and disconnect on unmount
  useEffect(() => {
    const initWebSocket = async () => {
      try {
        await connectWebSocket();
      } catch (err) {
        console.error("Failed to connect WebSocket:", err);
      }
    };

    initWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  const handleCreateChat = useCallback(async () => {
    try {
      await createNewChat("New Chat", "mistral");
      setShowChatList(false);
    } catch (err) {
      Alert.alert("Error", chatError || "Failed to create chat");
    }
  }, [createNewChat, chatError]);

  const handleSelectChat = useCallback(
    async (chat: Chat) => {
      try {
        await setCurrentChat(chat);
        setShowChatList(false);
      } catch (err) {
        Alert.alert("Error", "Failed to load chat");
      }
    },
    [setCurrentChat],
  );

  const handleSendMessage = useCallback(() => {
    if (!draft.trim() || !currentChat) return;
    if (!wsInstance?.isReady()) {
      Alert.alert("Error", "Chat not connected. Please try again.");
      return;
    }

    setIsSending(true);
    try {
      sendChatMessage(draft.trim(), currentChat.model);
      setDraft("");
    } catch (err) {
      Alert.alert("Error", "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }, [draft, currentChat, wsInstance, sendChatMessage]);

  // Show error alert if chat error occurs
  useEffect(() => {
    if (chatError) {
      Alert.alert("Chat Error", chatError);
      clearChatError();
    }
  }, [chatError, clearChatError]);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Chat Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable onPress={() => setShowChatList(!showChatList)}>
              <Ionicons name="menu-outline" size={24} color={colors.primary} />
            </Pressable>
            <View>
              <Text style={styles.chatTitle} numberOfLines={1}>
                {currentChat ? currentChat.title : "Chats"}
              </Text>
              <Text style={styles.modelBadge}>{currentChat?.model}</Text>
            </View>
          </View>
          <Pressable onPress={handleCreateChat} disabled={isChatLoading}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={colors.primary}
            />
          </Pressable>
        </View>

        {/* Chat History Sidebar */}
        {showChatList && (
          <View style={styles.chatListContainer}>
            <FlatList
              data={chats}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.chatListItem,
                    currentChat?.id === item.id && styles.chatListItemActive,
                  ]}
                  onPress={() => handleSelectChat(item)}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={16}
                    color={
                      currentChat?.id === item.id ? colors.primary : colors.text
                    }
                  />
                  <Text
                    style={[
                      styles.chatListItemText,
                      currentChat?.id === item.id &&
                        styles.chatListItemTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.chatListItemDate}>
                    {new Date(item.updated_at).toLocaleDateString()}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.emptyChatList}>
                  <Text style={styles.emptyChatListText}>No chats yet</Text>
                </View>
              }
            />
          </View>
        )}

        {/* Messages List */}
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble role={item.role} message={item.text} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !isChatLoading && currentChat ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color={colors.muted}
                />
                <Text style={styles.emptyStateText}>
                  Start chatting with {currentChat.model}
                </Text>
              </View>
            ) : null
          }
        />

        {/* Input Area */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={
              currentChat ? "Ask anything..." : "Create a chat to start..."
            }
            placeholderTextColor={colors.muted}
            editable={!!currentChat && !isSending}
            multiline
          />
          <Pressable
            style={[styles.micBtn, !currentChat && styles.disabledBtn]}
            disabled={!currentChat}
          >
            <Ionicons name="mic-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable
            style={[
              styles.sendBtn,
              (!currentChat || isSending) && styles.disabledBtn,
            ]}
            onPress={handleSendMessage}
            disabled={!currentChat || isSending || !draft.trim()}
          >
            <Ionicons
              name="send"
              size={18}
              color={isSending ? colors.muted : "#081020"}
            />
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    maxWidth: 200,
  },
  modelBadge: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    textTransform: "capitalize",
  },
  chatListContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.overlay,
    marginHorizontal: -spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    maxHeight: 300,
  },
  chatListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.cardBorder}40`,
    gap: spacing.sm,
  },
  chatListItemActive: {
    backgroundColor: `${colors.primary}15`,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.sm - 3,
  },
  chatListItemText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  chatListItemTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  chatListItemDate: {
    fontSize: 12,
    color: colors.muted,
  },
  emptyChatList: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  emptyChatListText: {
    color: colors.muted,
    fontSize: 14,
  },
  list: {
    paddingBottom: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    color: colors.muted,
    marginTop: spacing.md,
    fontSize: 14,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.overlay,
    borderRadius: 16,
    padding: spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: 44,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
  },
  micBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
