import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  AppState,
  Platform,
} from "react-native";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { Chat, chatApi } from "../../services/chatApi";
import { audioService } from "../../services/audioService";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Modular subcomponents
import { ChatHeader } from "../../components/ChatHeader";
import { MessageBubble } from "../../components/MessageBubble";
import { ChatInput } from "../../components/ChatInput";
import { useKeyboardHandler } from "../../hooks/useKeyboardHandler";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<MainStackParamList, "Chat">;

export function ChatScreen({ navigation }: Props) {
  const messages = useAppStore((s) => s.messages);
  const currentChat = useAppStore((s) => s.currentChat);
  const chats = useAppStore((s) => s.chats);
  const isChatLoading = useAppStore((s) => s.isChatLoading);
  const chatError = useAppStore((s) => s.chatError);
  const wsInstance = useAppStore((s) => s.wsInstance);
  const user = useAppStore((s) => s.user);

  const loadChats = useAppStore((s) => s.loadChats);
  const setCurrentChat = useAppStore((s) => s.setCurrentChat);
  const createNewChat = useAppStore((s) => s.createNewChat);
  const deleteChat = useAppStore((s) => s.deleteChat);
  const connectWebSocket = useAppStore((s) => s.connectWebSocket);
  const disconnectWebSocket = useAppStore((s) => s.disconnectWebSocket);
  const sendChatMessage = useAppStore((s) => s.sendChatMessage);
  const clearChatError = useAppStore((s) => s.clearChatError);
  const logout = useAppStore((s) => s.logout);

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showChatList, setShowChatList] = useState(false);

  const token = useAppStore((s) => s.accessToken);
  const flatListRef = useRef<FlatList>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const voiceChunksRef = useRef<string[]>([]);
  const recordStartTimeRef = useRef<number>(0);

  const slideAnim = useRef(new Animated.Value(-280)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const insets = useSafeAreaInsets();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHandler();
  const composerKeyboardInset = isKeyboardVisible
    ? Math.max(0, keyboardHeight - insets.bottom)
    : 0;

  const handlePressIn = async () => {
    if (!currentChat) return;
    voiceChunksRef.current = [];
    recordStartTimeRef.current = Date.now();
    try {
      audioService.startRecording((chunk) => {
        voiceChunksRef.current.push(chunk);
      });
      setIsRecordingVoice(true);
    } catch (err: any) {
      console.error("Failed to start voice recording:", err);
      Alert.alert("Error", "Could not access microphone.");
    }
  };

  const handlePressOut = async () => {
    if (!isRecordingVoice) return;
    setIsRecordingVoice(false);

    const duration = Date.now() - recordStartTimeRef.current;
    if (duration < 400) {
      try {
        audioService.stopRecording();
      } catch (err) {
        console.error("Failed to stop recording for short press:", err);
      }
      voiceChunksRef.current = [];
      return;
    }

    setIsTranscribing(true);
    try {
      audioService.stopRecording();
      const chunks = voiceChunksRef.current;
      if (chunks.length === 0) {
        setIsTranscribing(false);
        return;
      }

      const wavBase64 = audioService.createWavFromChunks(chunks, 16000);
      if (!token) {
        Alert.alert("Error", "Authentication token is missing");
        setIsTranscribing(false);
        return;
      }

      const text = await chatApi.transcribeAudio(token, wavBase64);
      if (text) {
        setDraft((prev) => (prev ? `${prev} ${text}` : text));
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      Alert.alert("Transcription Error", err.message || "Failed to transcribe audio");
    } finally {
      setIsTranscribing(false);
      voiceChunksRef.current = [];
    }
  };

  // VAD & Typing state detection from the store's empty assistant message pattern
  const isTyping = useMemo(() => {
    if (messages.length === 0) return false;
    const lastMsg = messages[messages.length - 1];
    return lastMsg.role === "assistant" && lastMsg.text === "";
  }, [messages]);

  // Filter and reverse message data for inverted FlatList
  const chatData = useMemo(() => {
    const filtered = isTyping ? messages.slice(0, -1) : messages;
    const reversed = [...filtered].reverse();
    if (isTyping) {
      // In inverted FlatList, index 0 is visually at the bottom, closest to input
      return [{ id: "typing-indicator-item", role: "assistant" as const, text: "typing" }, ...reversed];
    }
    return reversed;
  }, [messages, isTyping]);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Auto-scroll to latest (offset 0 in inverted list) when messages update
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 50);
    }
  }, [messages]);

  // WebSocket & AppState active listener
  useEffect(() => {
    const initWebSocket = async () => {
      try {
        await connectWebSocket();
      } catch (err) {
        console.error("Failed to connect WebSocket:", err);
      }
    };

    initWebSocket();

    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === "active") {
        console.log("App returned to foreground. Reconnecting WebSocket...");
        try {
          await connectWebSocket();
        } catch (err) {
          console.error("Failed to reconnect WebSocket on foreground:", err);
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  // Sidebar slide animation
  useEffect(() => {
    if (showChatList) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showChatList, slideAnim, backdropOpacity]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -280,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowChatList(false);
    });
  }, [slideAnim, backdropOpacity]);

  const handleCreateChat = useCallback(async () => {
    try {
      await createNewChat("New Chat", "mistral");
      closeDrawer();
    } catch (err) {
      Alert.alert("Error", chatError || "Failed to create chat");
    }
  }, [createNewChat, chatError, closeDrawer]);

  const handleSelectChat = useCallback(
    async (chat: Chat) => {
      try {
        await setCurrentChat(chat);
        closeDrawer();
      } catch (err) {
        Alert.alert("Error", "Failed to load chat");
      }
    },
    [setCurrentChat, closeDrawer],
  );

  const handleDeleteChat = useCallback(
    (chatId: string) => {
      Alert.alert(
        "Delete Chat",
        "Are you sure you want to delete this conversation?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteChat(chatId);
                // If we deleted the active chat, we might want to auto-load the first available one
                const remainingChats = useAppStore.getState().chats;
                if (remainingChats.length > 0 && useAppStore.getState().currentChat === null) {
                  setCurrentChat(remainingChats[0]);
                }
              } catch (err) {
                Alert.alert("Error", "Failed to delete chat");
              }
            },
          },
        ]
      );
    },
    [deleteChat, setCurrentChat]
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
    <ScreenWrapper avoidKeyboard={false}>
      <View style={styles.rootContainer}>
        {/* Main Chat View */}
        <View style={styles.container}>
          {/* Chat Header */}
          <ChatHeader
            currentChat={currentChat}
            onMenuPress={() => setShowChatList(true)}
          />

          {/* Inverted Messages List */}
          <FlatList
            ref={flatListRef}
            data={chatData}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              if (item.id === "typing-indicator-item") {
                // Inline typing indicator inside the list
                const { TypingIndicator } = require("../../components/TypingIndicator");
                return <TypingIndicator />;
              }
              return (
                <MessageBubble role={item.role} message={item.text} />
              );
            }}
            style={styles.messagesList}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={Platform.OS === "android"}
            ListEmptyComponent={
              !isChatLoading && currentChat ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={48}
                    color={colors.muted}
                  />
                  <Text style={styles.emptyStateText}>
                    Start chatting with us
                  </Text>
                </View>
              ) : null
            }
          />

          <View style={[styles.composerDock, { paddingBottom: composerKeyboardInset }]}>
            <ChatInput
              draft={draft}
              setDraft={setDraft}
              onSend={handleSendMessage}
              isSending={isSending}
              isTranscribing={isTranscribing}
              isRecordingVoice={isRecordingVoice}
              hasChat={!!currentChat}
              onMicPressIn={handlePressIn}
              onMicPressOut={handlePressOut}
            />
          </View>
        </View>

        {/* Sidebar Drawer Overlay */}
        {showChatList && (
          <>
            <Animated.View
              style={[
                styles.backdrop,
                { opacity: backdropOpacity }
              ]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
            </Animated.View>

            <Animated.View
              style={[
                styles.sidebar,
                { transform: [{ translateX: slideAnim }] }
              ]}
            >
              {/* Sidebar Header */}
              <View style={styles.sidebarHeader}>
                <View style={styles.sidebarTitleRow}>
                  <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
                  <Text style={styles.sidebarTitle}>Recent Chats</Text>
                  <Pressable onPress={closeDrawer} style={styles.closeDrawerBtn}>
                    <Ionicons name="close" size={22} color={colors.text} />
                  </Pressable>
                </View>
                <Pressable style={styles.newChatBtn} onPress={handleCreateChat} disabled={isChatLoading}>
                  <Ionicons name="add" size={20} color={colors.primary} />
                  <Text style={styles.newChatBtnText}>New Conversation</Text>
                </Pressable>
              </View>

              {/* Sidebar Content (Chat list) */}
              <FlatList
                data={chats}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.sidebarListContent}
                renderItem={({ item }) => {
                  const isActive = currentChat?.id === item.id;
                  return (
                    <Pressable
                      style={[
                        styles.sidebarListItem,
                        isActive && styles.sidebarListItemActive,
                      ]}
                      onPress={() => handleSelectChat(item)}
                    >
                      <Ionicons
                        name={isActive ? "chatbox-ellipses" : "chatbox-ellipses-outline"}
                        size={18}
                        color={isActive ? colors.primary : colors.muted}
                      />
                      <View style={styles.sidebarListItemContent}>
                        <Text
                          style={[
                            styles.sidebarListItemText,
                            isActive && styles.sidebarListItemTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title || "Untitled Chat"}
                        </Text>
                        <Text style={styles.sidebarListItemDate}>
                          {new Date(item.updated_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                      
                      <Pressable 
                        style={styles.deleteChatBtn} 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(item.id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </Pressable>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptySidebarList}>
                    <Text style={styles.emptySidebarText}>No recent chats</Text>
                  </View>
                }
              />

              {/* Sidebar Footer */}
              {user && (
                <View style={styles.sidebarFooter}>
                  <Pressable 
                    style={styles.userInfo} 
                    onPress={() => {
                      closeDrawer();
                      navigation.navigate("Profile");
                    }}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {user.name ? user.name[0].toUpperCase() : "U"}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {user.name}
                      </Text>
                      <Text style={styles.userEmail} numberOfLines={1}>
                        {user.email || user.username}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable style={styles.logoutBtn} onPress={logout}>
                    <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              )}
            </Animated.View>
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    position: "relative",
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: 0,
    paddingBottom: spacing.sm,
  },
  messagesList: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing.md,
    // Add extra padding at the top of the list (visual top, index N) to look cleaner
    paddingTop: spacing.lg,
  },
  composerDock: {
    backgroundColor: "transparent",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    // When inverted, FlatList Empty component is rendered at the top, so we reverse it
    transform: [{ scaleY: -1 }],
  },
  emptyStateText: {
    color: colors.muted,
    marginTop: spacing.md,
    fontSize: 14,
  },
  // Sidebar styles
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    zIndex: 999,
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.backgroundSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.cardBorder,
    zIndex: 1000,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    justifyContent: "space-between",
  },
  sidebarHeader: {
    marginBottom: spacing.sm,
  },
  sidebarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    marginLeft: spacing.xs,
  },
  closeDrawerBtn: {
    padding: spacing.xxs,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: `${colors.primary}50`,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.primary}08`,
  },
  newChatBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  sidebarListContent: {
    paddingVertical: spacing.xs,
  },
  sidebarListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sidebarListItemActive: {
    backgroundColor: `${colors.primary}12`,
  },
  sidebarListItemText: {
    color: colors.muted,
    fontSize: 14,
  },
  sidebarListItemTextActive: {
    color: colors.text,
    fontWeight: "600",
  },
  sidebarListItemDate: {
    fontSize: 11,
    color: colors.muted,
    opacity: 0.8,
  },
  sidebarListItemContent: {
    flex: 1,
    justifyContent: "center",
  },
  deleteChatBtn: {
    padding: spacing.xxs,
    marginLeft: spacing.xs,
  },
  emptySidebarList: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptySidebarText: {
    color: colors.muted,
    fontSize: 14,
  },
  sidebarFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    color: "#090B11",
    fontWeight: "700",
    fontSize: 16,
  },
  userDetails: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  userEmail: {
    color: colors.muted,
    fontSize: 11,
  },
  logoutBtn: {
    padding: spacing.xs,
  },
});
