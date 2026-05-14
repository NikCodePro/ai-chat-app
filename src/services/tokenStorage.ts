import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "@ai_chat_app:access_token";
const REFRESH_TOKEN_KEY = "@ai_chat_app:refresh_token";
const USER_KEY = "@ai_chat_app:user";

export type StoredUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  auth_provider?: string;
  email_verified?: boolean;
};

export const tokenStorage = {
  setTokens: async (
    accessToken: string,
    refreshToken: string,
    user: StoredUser,
  ) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
        AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
      ]);
    } catch (error) {
      console.error("Failed to store tokens:", error);
      throw error;
    }
  },

  getTokens: async () => {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (!accessToken || !refreshToken || !userJson) {
        return null;
      }

      return {
        accessToken,
        refreshToken,
        user: JSON.parse(userJson) as StoredUser,
      };
    } catch (error) {
      console.error("Failed to retrieve tokens:", error);
      return null;
    }
  },

  getAccessToken: async () => {
    try {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error("Failed to get access token:", error);
      return null;
    }
  },

  getRefreshToken: async () => {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error("Failed to get refresh token:", error);
      return null;
    }
  },

  clearTokens: async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
    } catch (error) {
      console.error("Failed to clear tokens:", error);
      throw error;
    }
  },
};
