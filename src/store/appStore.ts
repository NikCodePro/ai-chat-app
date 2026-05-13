import { create } from "zustand";
import { ApiError, authApi, User } from "../services/api";
import { Chat, chatApi, ChatWebSocket, LLMProvider } from "../services/chatApi";
import { tokenStorage } from "../services/tokenStorage";

type Message = { id: string; role: "user" | "assistant"; text: string };

type AppState = {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  // Auth actions
  signupInitiate: (identifier: string) => Promise<void>;
  signupVerifyOtp: (identifier: string, code: string) => Promise<string>;
  signupComplete: (
    signupToken: string,
    name: string,
    username: string,
    password: string,
  ) => Promise<void>;
  login: (identifier: string, password: string) => Promise<boolean>;
  loginVerifyOtp: (
    identifier: string,
    code: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;

  // Chat state
  activeCallSeconds: number;
  messages: Message[];
  tickCall: () => void;
  resetCall: () => void;
  pushMessage: (message: Message) => void;

  // Chat API state
  currentChat: Chat | null;
  chats: Chat[];
  isChatLoading: boolean;
  chatError: string | null;
  wsInstance: ChatWebSocket | null;

  // Chat API actions
  loadChats: () => Promise<void>;
  setCurrentChat: (chat: Chat) => Promise<void>;
  createNewChat: (title: string, model: LLMProvider) => Promise<void>;
  loadChatHistory: (chatId: string) => Promise<void>;
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
  sendChatMessage: (message: string, provider: LLMProvider) => void;
  clearChatError: () => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  // Auth state
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,

  // Auth actions
  signupInitiate: async (identifier: string) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.initiateSignup(identifier);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Signup initiation failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signupVerifyOtp: async (identifier: string, code: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.verifySignupOtp(identifier, code);
      return data.signup_token;
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "OTP verification failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signupComplete: async (
    signupToken: string,
    name: string,
    username: string,
    password: string,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.completeSignup(
        signupToken,
        name,
        username,
        password,
      );
      await tokenStorage.setTokens(data.access_token, data.refresh_token, {
        id: data.user.id,
        name: data.user.name,
        username: data.user.username,
        email: data.user.email,
        phone: data.user.phone,
      });
      set({
        isAuthenticated: true,
        user: data.user,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Signup completion failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (identifier: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authApi.login(identifier, password);

      if ("requires_2fa" in result) {
        return true;
      }

      const data = result as any;
      await tokenStorage.setTokens(data.access_token, data.refresh_token, {
        id: data.user.id,
        name: data.user.name,
        username: data.user.username,
        email: data.user.email,
        phone: data.user.phone,
      });
      set({
        isAuthenticated: true,
        user: data.user,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
      return false;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  loginVerifyOtp: async (
    identifier: string,
    code: string,
    password: string,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.verifyLoginOtp(identifier, code, password);
      await tokenStorage.setTokens(data.access_token, data.refresh_token, {
        id: data.user.id,
        name: data.user.name,
        username: data.user.username,
        email: data.user.email,
        phone: data.user.phone,
      });
      set({
        isAuthenticated: true,
        user: data.user,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "2FA verification failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await tokenStorage.getTokens();
      if (tokens?.refreshToken) {
        await authApi.logout(tokens.refreshToken);
      }
      await tokenStorage.clearTokens();
      get().disconnectWebSocket();
      set({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        currentChat: null,
        chats: [],
        messages: [],
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Logout failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const tokens = await tokenStorage.getTokens();
      if (tokens) {
        set({
          isAuthenticated: true,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: tokens.user as User,
        });
      }
    } catch (err) {
      console.error("Failed to restore session:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  // Chat state
  activeCallSeconds: 0,
  messages: [
    { id: "a1", role: "assistant", text: "Hey! I am ready when you are." },
    { id: "u1", role: "user", text: "Give me a clear summary of today." },
  ],
  tickCall: () => set((s) => ({ activeCallSeconds: s.activeCallSeconds + 1 })),
  resetCall: () => set({ activeCallSeconds: 0 }),
  pushMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  // Chat API state
  currentChat: null,
  chats: [],
  isChatLoading: false,
  chatError: null,
  wsInstance: null,

  // Chat API actions
  loadChats: async () => {
    set({ isChatLoading: true, chatError: null });
    try {
      const token = get().accessToken;
      if (!token) throw new Error("No access token");
      const chats = await chatApi.listChats(token);
      set({ chats });
      // Auto-load most recent chat if available
      if (chats.length > 0) {
        const mostRecent = chats[0];
        await get().setCurrentChat(mostRecent);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load chats";
      set({ chatError: message });
    } finally {
      set({ isChatLoading: false });
    }
  },

  setCurrentChat: async (chat: Chat) => {
    set({ currentChat: chat, isChatLoading: true, chatError: null });
    try {
      const token = get().accessToken;
      if (!token) throw new Error("No access token");
      await get().loadChatHistory(chat.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load chat";
      set({ chatError: message });
    } finally {
      set({ isChatLoading: false });
    }
  },

  createNewChat: async (title: string, model: LLMProvider) => {
    set({ isChatLoading: true, chatError: null });
    try {
      const token = get().accessToken;
      if (!token) throw new Error("No access token");
      const newChat = await chatApi.createChat(token, title, model);
      set((s) => ({
        chats: [newChat, ...s.chats],
        currentChat: newChat,
        messages: [],
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create chat";
      set({ chatError: message });
      throw err;
    } finally {
      set({ isChatLoading: false });
    }
  },

  loadChatHistory: async (chatId: string) => {
    set({ isChatLoading: true, chatError: null });
    try {
      const token = get().accessToken;
      if (!token) throw new Error("No access token");
      const history = await chatApi.fetchChatHistory(token, chatId);
      const messages = history.map((msg, idx) => ({
        id: `${chatId}-${idx}`,
        role: msg.role as "user" | "assistant",
        text: msg.content,
      }));
      set({ messages });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load chat history";
      set({ chatError: message });
    } finally {
      set({ isChatLoading: false });
    }
  },

  connectWebSocket: async () => {
    try {
      const token = get().accessToken;
      if (!token) throw new Error("No access token");

      const ws = new ChatWebSocket(token);

      ws.onMessage((msg) => {
        if (msg.type === "start") {
          // Chat started
          console.log("Chat started:", msg.chat_id);
        } else if (msg.type === "chunk") {
          // Add chunk to messages
          set((s) => {
            const lastMessage = s.messages[s.messages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              return {
                messages: [
                  ...s.messages.slice(0, -1),
                  {
                    ...lastMessage,
                    text: lastMessage.text + (msg.content || ""),
                  },
                ],
              };
            }
            return s;
          });
        } else if (msg.type === "end") {
          // Chat ended
          console.log("Chat ended:", msg.chat_id);
        }
      });

      ws.onError((error) => {
        set({ chatError: error.message });
      });

      await ws.connect();
      set({ wsInstance: ws });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect WebSocket";
      set({ chatError: message });
      throw err;
    }
  },

  disconnectWebSocket: () => {
    const ws = get().wsInstance;
    if (ws) {
      ws.disconnect();
      set({ wsInstance: null });
    }
  },

  sendChatMessage: (message: string, provider: LLMProvider) => {
    const ws = get().wsInstance;
    const currentChat = get().currentChat;

    if (!ws || !ws.isReady()) {
      set({ chatError: "WebSocket not connected" });
      return;
    }

    if (!currentChat) {
      set({ chatError: "No chat selected" });
      return;
    }

    // Add user message to state
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: `user-${Date.now()}`,
          role: "user" as const,
          text: message,
        },
        {
          id: `assistant-${Date.now()}`,
          role: "assistant" as const,
          text: "",
        },
      ],
    }));

    // Send via WebSocket
    ws.sendMessage(message, currentChat.id, provider);
  },

  clearChatError: () => set({ chatError: null }),
}));
