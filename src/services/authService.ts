// SourceLink Authentication Service for AI Assistant
// Integrates with ExamineticsSl enterprise SSO system

export interface AuthUser {
  userId: string;
  username: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  refreshToken?: string;
  message?: string;
  error?: string;
}

class AuthService {
  private readonly STORAGE_TOKEN_KEY = 'sourcelink_auth_token';
  private readonly STORAGE_USER_KEY = 'sourcelink_auth_user';
  private readonly STORAGE_REFRESH_KEY = 'sourcelink_refresh_token';
  
  private currentUser: AuthUser | null = null;
  private authToken: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load authentication state from localStorage
   */
  private loadFromStorage(): void {
    try {
      const token = localStorage.getItem(this.STORAGE_TOKEN_KEY);
      const userJson = localStorage.getItem(this.STORAGE_USER_KEY);
      
      if (token && userJson) {
        this.authToken = token;
        this.currentUser = JSON.parse(userJson);
      }
    } catch (error) {
      console.warn('Failed to load authentication state from storage:', error);
      this.clearStorage();
    }
  }

  /**
   * Save authentication state to localStorage
   */
  private saveToStorage(user: AuthUser, token: string, refreshToken?: string): void {
    try {
      localStorage.setItem(this.STORAGE_TOKEN_KEY, token);
      localStorage.setItem(this.STORAGE_USER_KEY, JSON.stringify(user));
      
      if (refreshToken) {
        localStorage.setItem(this.STORAGE_REFRESH_KEY, refreshToken);
      }
    } catch (error) {
      console.error('Failed to save authentication state to storage:', error);
    }
  }

  /**
   * Clear authentication state from storage
   */
  private clearStorage(): void {
    localStorage.removeItem(this.STORAGE_TOKEN_KEY);
    localStorage.removeItem(this.STORAGE_USER_KEY);
    localStorage.removeItem(this.STORAGE_REFRESH_KEY);
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser?.isAuthenticated || false;
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Login with username and password using LegacyIdentity service
   * Same pattern as Portal-UI
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Use LegacyIdentity service for authentication (same as Portal-UI)
      const response = await fetch('https://backend-dev.1sourcelink.com/IdentityApp/api/v1/Auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        })
      });

      if (!response.ok) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      const result = await response.json();
      
      // Extract token and decode user info (same pattern as Portal-UI)
      const token = result.token.token; // "Bearer ..." format
      const userInfo = await this.decodeToken(token);
      
      const user: AuthUser = {
        userId: userInfo.sub || userInfo.userId,
        username: userInfo.sub || credentials.username,
        displayName: userInfo.displayName || credentials.username,
        roles: userInfo.role || [],
        permissions: userInfo.permissions || [],
        isAuthenticated: true
      };

      this.currentUser = user;
      this.authToken = token;
      this.saveToStorage(user, token);

      return {
        success: true,
        user: user,
        token: token,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  /**
   * Decode token using LegacyIdentity service (same as Portal-UI)
   */
  private async decodeToken(token: string): Promise<any> {
    try {
      // Strip "Bearer " prefix for decoding
      const tokenToDecode = token.replace('Bearer ', '');
      
      const response = await fetch('https://backend-dev.1sourcelink.com/IdentityApp/api/v1/Auth/decode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenToDecode)
      });

      if (!response.ok) {
        throw new Error('Token decode failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Token decode error:', error);
      throw error;
    }
  }

  /**
   * Logout user and clear authentication state
   */
  async logout(): Promise<void> {
    try {
      // TODO: Call SourceLink logout endpoint
      // await fetch(`${SOURCELINK_SSO_URL}/logout`, { method: 'POST' });
      
      this.currentUser = null;
      this.authToken = null;
      this.clearStorage();
      
      // In a real implementation, redirect to SourceLink logout
      // window.location.href = `${SOURCELINK_SSO_URL}/logout`;
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if server logout fails
      this.currentUser = null;
      this.authToken = null;
      this.clearStorage();
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem(this.STORAGE_REFRESH_KEY);
      if (!refreshToken) {
        return false;
      }

      // TODO: Implement actual token refresh with SourceLink
      // const response = await fetch(`${SOURCELINK_SSO_URL}/refresh`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${refreshToken}` }
      // });
      
      // For now, simulate successful refresh
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.currentUser?.roles?.includes(role) || false;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    return this.currentUser?.permissions?.includes(permission) || false;
  }

  /**
   * Get authorization header for API calls
   */
  getAuthHeader(): { Authorization: string } | {} {
    if (this.authToken) {
      return { Authorization: `Bearer ${this.authToken}` };
    }
    return {};
  }
}

export const authService = new AuthService();