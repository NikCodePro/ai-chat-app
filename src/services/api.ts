// API Base Configuration
// export const API_BASE_URL = "https://api.sankatseva.com/api/v1";
export const API_BASE_URL = "http://192.168.3.11:8000/api/v1";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export interface SignupInitiateResponse {
  message: string;
  identifier: string;
  expires_at: string;
}

export interface SignupVerifyResponse {
  message: string;
  signup_token: string;
  identifier: string;
}

export interface ForgotPasswordInitiateResponse {
  message: string;
  identifier: string;
  expires_at: string;
}

export interface ForgotPasswordVerifyResponse {
  message: string;
  reset_token: string;
  identifier: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  phone_verified: boolean;
  auth_provider?: string;
  email_verified?: boolean;
  created_at: string;
}

export interface AuthTokens {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type LoginResponse = AuthTokens;
export type SignupCompleteResponse = AuthTokens;
// Error handling
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorPayload = {
  message?: unknown;
  msg?: unknown;
  detail?: unknown;
  error?: unknown;
  errors?: unknown;
  data?: unknown;
};

function getPayloadMessage(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    const messages = payload
      .map((item) => getPayloadMessage(item))
      .filter((item): item is string => !!item);

    return messages.length > 0 ? messages.join("\n") : null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as ErrorPayload;
  const namedMessage =
    getPayloadMessage(data.message) ||
    getPayloadMessage(data.msg) ||
    getPayloadMessage(data.detail) ||
    getPayloadMessage(data.error) ||
    getPayloadMessage(data.errors) ||
    getPayloadMessage(data.data);

  if (namedMessage) {
    return namedMessage;
  }

  const nestedMessages = Object.values(payload)
    .map((value) => getPayloadMessage(value))
    .filter((value): value is string => !!value);

  return nestedMessages.length > 0 ? [...new Set(nestedMessages)].join("\n") : null;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message || getPayloadMessage(error.data) || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return getPayloadMessage(error) || fallback;
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const rawText = await response.text();
  const data = rawText
    ? (() => {
      try {
        return JSON.parse(rawText);
      } catch {
        return { message: rawText };
      }
    })()
    : {};

  if (!response.ok) {
    throw new ApiError(
      response.status,
      getPayloadMessage(data) || "API request failed",
      data,
    );
  }

  return data;
}

// Auth API endpoints
export const authApi = {
  // Signup flow
  initiateSignup: async (
    identifier: string,
  ): Promise<SignupInitiateResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const data = await handleResponse<SignupInitiateResponse>(response);
    return data.data;
  },

  verifySignupOtp: async (
    identifier: string,
    code: string,
  ): Promise<SignupVerifyResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, code }),
    });
    const data = await handleResponse<SignupVerifyResponse>(response);
    return data.data;
  },

  completeSignup: async (
    signupToken: string,
    name: string,
    username: string,
    password: string,
  ): Promise<SignupCompleteResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signup_token: signupToken,
        name,
        username,
        password,
      }),
    });
    const data = await handleResponse<SignupCompleteResponse>(response);
    return data.data;
  },

  // Login flow
  login: async (
    identifier: string,
    password: string,
  ): Promise<LoginResponse | { requires_2fa: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await handleResponse<
      LoginResponse | { requires_2fa: boolean }
    >(response);
    return data.data;
  },

  verifyLoginOtp: async (
    identifier: string,
    code: string,
    password: string,
  ): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, code, password }),
    });
    const data = await handleResponse<LoginResponse>(response);
    return data.data;
  },

  // Token management
  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const data = await handleResponse<AuthTokens>(response);
    return data.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    await handleResponse<void>(response);
  },

  initiateForgotPassword: async (
    identifier: string,
  ): Promise<ForgotPasswordInitiateResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const data = await handleResponse<ForgotPasswordInitiateResponse>(response);
    return data.data;
  },

  verifyForgotPasswordOtp: async (
    identifier: string,
    code: string,
  ): Promise<ForgotPasswordVerifyResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, code }),
    });
    const data = await handleResponse<ForgotPasswordVerifyResponse>(response);
    return data.data;
  },

  resetPassword: async (
    identifier: string,
    resetToken: string,
    newPassword: string,
  ): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier,
        reset_token: resetToken,
        new_password: newPassword,
      }),
    });
    const data = await handleResponse<{ message: string }>(response);
    return data.data;
  },

  getCurrentUser: async (accessToken: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await handleResponse<User>(response);
    return data.data;
  },

  googleAuth: async (idToken: string): Promise<AuthTokens> => {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
    const data = await handleResponse<AuthTokens>(response);
    return data.data;
  },

  // Profile Management
  updateProfile: async (
    accessToken: string,
    name?: string,
    username?: string,
  ): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ name, username }),
    });
    const data = await handleResponse<User>(response);
    return data.data;
  },

  changePassword: async (
    accessToken: string,
    newPassword: string,
  ): Promise<void> => {
    await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        new_password: newPassword,
      }),
    }).then(handleResponse);
  },
};
