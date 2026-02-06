/**
 * Authentication Service
 * Sprint 2: Frontend-Backend Integration
 */

import apiClient, {
  ApiResponse,
  AuthResponse,
  User,
  setTokens,
  clearTokens,
  getStoredUser,
  setStoredUser,
  getAccessToken,
  getRefreshToken,
} from './apiClient';

// Registration data interface
export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

// Login data interface
export interface LoginData {
  email: string;
  password: string;
}

// Auth service class
class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<{ user: User; accessToken: string }> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/register', {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'SCORER',
      });

      if (response.data.success && response.data.data) {
        const { accessToken, refreshToken, user } = response.data.data;
        setTokens(accessToken, refreshToken);
        setStoredUser(user);
        return { user, accessToken };
      }

      throw new Error(response.data.error?.message || 'Registration failed');
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: ApiResponse<unknown> } };
        const message = axiosError.response?.data?.error?.message || 'Registration failed';
        throw new Error(message);
      }
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<{ user: User; accessToken: string }> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/login', {
        email: data.email,
        password: data.password,
      });

      if (response.data.success && response.data.data) {
        const { accessToken, refreshToken, user } = response.data.data;
        setTokens(accessToken, refreshToken);
        setStoredUser(user);
        return { user, accessToken };
      }

      throw new Error(response.data.error?.message || 'Login failed');
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: ApiResponse<unknown> } };
        const message = axiosError.response?.data?.error?.message || 'Invalid email or password';
        throw new Error(message);
      }
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        // Try to invalidate token on server (best effort)
        await apiClient.post('/api/auth/logout', { refreshToken }).catch(() => {
          // Ignore errors during logout - we'll clear local tokens anyway
        });
      }
    } finally {
      clearTokens();
    }
  }

  /**
   * Get current user from storage or fetch from API
   */
  async getCurrentUser(): Promise<User | null> {
    // First check if we have a stored user
    const storedUser = getStoredUser();
    if (storedUser) {
      return storedUser;
    }

    // If we have a token but no stored user, fetch from API
    const token = getAccessToken();
    if (!token) {
      return null;
    }

    try {
      const response = await apiClient.get<ApiResponse<{ user: User }>>('/api/auth/me');
      if (response.data.success && response.data.data) {
        const user = response.data.data.user;
        setStoredUser(user);
        return user;
      }
      return null;
    } catch {
      // Token might be invalid, clear it
      clearTokens();
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!getAccessToken();
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/refresh', {
        refreshToken,
      });

      if (response.data.success && response.data.data) {
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        setTokens(accessToken, newRefreshToken);
        return accessToken;
      }

      clearTokens();
      return null;
    } catch {
      clearTokens();
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
