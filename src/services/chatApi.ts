import { ApiError, fetchWithAuth } from "./api";

export const CHAT_API_BASE_URL = "https://api.sankatseva.com/api/v1";
export const CHAT_WS_URL = "wss://api.sankatseva.com/api/v1/ws/chat";
// export const CHAT_API_BASE_URL = "http://192.168.1.16:8000/api/v1";
// export const CHAT_WS_URL = "ws://192.168.1.16:8000/api/v1/ws/chat";


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
  type: "start" | "chunk" | "end" | "title_update" | "user_transcript" | "error";
  content?: string;
  chat_id: string;
  title?: string;
}

// HTTP Chat Management API
export const chatApi = {
  listChats: async (accessToken: string): Promise<Chat[]> => {
    const response = await fetchWithAuth(`${CHAT_API_BASE_URL}/chats/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
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
    const response = await fetchWithAuth(`${CHAT_API_BASE_URL}/chats/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    const response = await fetchWithAuth(
      `${CHAT_API_BASE_URL}/chats/${chatId}/history`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
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

  deleteChat: async (
    accessToken: string,
    chatId: string,
  ): Promise<void> => {
    const response = await fetchWithAuth(`${CHAT_API_BASE_URL}/chats/${chatId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        response.status,
        data.message || "Failed to delete chat",
        data.data,
      );
    }
  },

  transcribeAudio: async (
    accessToken: string,
    base64Audio: string,
  ): Promise<string> => {
    const response = await fetch(`${CHAT_API_BASE_URL}/chats/transcribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ audio: base64Audio }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        response.status,
        data.message || "Failed to transcribe audio",
        data.data,
      );
    }

    const data = await response.json();
    return data.data.text;
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

