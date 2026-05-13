// API Base Configuration
export const API_BASE_URL = "https://ai-chat-backend-rkjk.onrender.com/api/v1";
// export const API_BASE_URL = "http://192.168.1.9:8000/api/v1";

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

export interface User {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  phone_verified: boolean;
  created_at: string;
}

export interface AuthTokens {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginResponse extends AuthTokens {}
export interface SignupCompleteResponse extends AuthTokens {}

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

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.message || "API request failed",
      data.data,
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
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
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
};
