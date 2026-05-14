import { ApiError } from "./api";

export const CHAT_API_BASE_URL = "http://192.168.1.9:8000/api/v1";
export const CHAT_WS_URL = "ws://192.168.1.9:8000/api/v1/ws/chat";

export type LLMProvider = "mistral" | "openai" | "gemini";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  model: LLMProvider;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface WebSocketMessage {
  type: "start" | "chunk" | "end";
  content?: string;
  chat_id: string;
}

// HTTP Chat Management API
export const chatApi = {
  listChats: async (accessToken: string): Promise<Chat[]> => {
    const response = await fetch(`${CHAT_API_BASE_URL}/chats/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        response.status,
        data.message || "Failed to fetch chats",
        data.data,
      );
    }

    const data = await response.json();
    return data.data || [];
  },

  createChat: async (
    accessToken: string,
    title: string,
    model: LLMProvider,
  ): Promise<Chat> => {
    const response = await fetch(`${CHAT_API_BASE_URL}/chats/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ title, model }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        response.status,
        data.message || "Failed to create chat",
        data.data,
      );
    }

    const data = await response.json();
    return data.data;
  },

  fetchChatHistory: async (
    accessToken: string,
    chatId: string,
  ): Promise<ChatMessage[]> => {
    const response = await fetch(
      `${CHAT_API_BASE_URL}/chats/${chatId}/history`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        response.status,
        data.message || "Failed to fetch chat history",
        data.data,
      );
    }

    const data = await response.json();
    return data.data || [];
  },
};

// WebSocket Chat Manager
export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private isConnected = false;
  private messageHandlers: ((msg: WebSocketMessage) => void)[] = [];
  private errorHandlers: ((error: Error) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(token: string) {
    this.token = token;
    this.url = `${CHAT_WS_URL}?token=${token}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log("WebSocket connected");
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.messageHandlers.forEach((handler) => handler(message));
          } catch (err) {
            console.error("Failed to parse WebSocket message:", err);
          }
        };

        this.ws.onerror = (event) => {
          const error = new Error("WebSocket error occurred");
          this.errorHandlers.forEach((handler) => handler(error));
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log("WebSocket disconnected");
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  sendMessage(message: string, chatId: string, provider: LLMProvider): void {
    if (!this.isConnected || !this.ws) {
      throw new Error("WebSocket is not connected");
    }

    this.ws.send(
      JSON.stringify({
        message,
        chat_id: chatId,
        provider,
      }),
    );
  }

  onMessage(handler: (msg: WebSocketMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  isReady(): boolean {
    return this.isConnected && this.ws !== null;
  }
}
