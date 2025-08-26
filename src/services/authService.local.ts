// Local Development Authentication Service for AI Assistant
// Connects to local AI API at localhost:5000 for testing

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

class LocalAuthService {
  private readonly STORAGE_TOKEN_KEY = 'local_ai_auth_token';
  private readonly STORAGE_USER_KEY = 'local_ai_auth_user';
  private readonly LOCAL_AI_API_BASE = 'http://localhost:5000/api/v1';
  
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
  private saveToStorage(user: AuthUser, token: string): void {
    try {
      localStorage.setItem(this.STORAGE_TOKEN_KEY, token);
      localStorage.setItem(this.STORAGE_USER_KEY, JSON.stringify(user));
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
   * Login with username and password using local AI API
   * For testing, we'll create a mock login that generates a valid token
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // First test if AI API is running
      const healthResponse = await fetch(`${this.LOCAL_AI_API_BASE}/AuthTest/public`);
      if (!healthResponse.ok) {
        return {
          success: false,
          error: 'AI API is not running on localhost:5000'
        };
      }

      // For local development, create a mock successful login
      // In production, this would call the actual AI API login endpoint
      const mockUser: AuthUser = {
        userId: 'dev-user-1',
        username: credentials.username,
        displayName: `Development User (${credentials.username})`,
        roles: ['ai_user', 'developer'],
        permissions: ['ai_assistant_access', 'ai_assistant_admin'],
        isAuthenticated: true
      };

      // Generate a mock JWT token for local testing
      const mockToken = this.generateMockToken(mockUser);

      this.currentUser = mockUser;
      this.authToken = mockToken;
      this.saveToStorage(mockUser, mockToken);

      // Test the protected endpoint to verify our mock token works
      try {
        await this.testProtectedEndpoint();
      } catch (error) {
        console.warn('Protected endpoint test failed, but login succeeded:', error);
      }

      return {
        success: true,
        user: mockUser,
        token: mockToken,
        message: 'Local development login successful'
      };
    } catch (error) {
      console.error('Local login error:', error);
      return {
        success: false,
        error: 'Failed to connect to local AI API. Ensure it\'s running on localhost:5000'
      };
    }
  }

  /**
   * Generate a mock JWT token for local development
   */
  private generateMockToken(user: AuthUser): string {
    // Create a simple mock token (not a real JWT, just for local development)
    const payload = {
      sub: user.userId,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles,
      permissions: user.permissions,
      iss: 'LOCAL_DEV_AI_API',
      aud: 'LOCAL_DEV_USERS',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7200 // 2 hours
    };

    // Base64 encode the payload (not secure, just for local dev)
    const encodedPayload = btoa(JSON.stringify(payload));
    return `Bearer LOCAL_DEV_TOKEN.${encodedPayload}.MOCK_SIGNATURE`;
  }

  /**
   * Test the protected endpoint to verify authentication
   */
  private async testProtectedEndpoint(): Promise<void> {
    const response = await fetch(`${this.LOCAL_AI_API_BASE}/AuthTest/protected`, {
      headers: {
        'Authorization': this.authToken || '',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Protected endpoint test successful:', result);
    } else {
      console.warn('Protected endpoint test failed:', response.status, response.statusText);
    }
  }

  /**
   * Logout user and clear authentication state
   */
  async logout(): Promise<void> {
    this.currentUser = null;
    this.authToken = null;
    this.clearStorage();
  }

  /**
   * Refresh authentication token (mock implementation)
   */
  async refreshToken(): Promise<boolean> {
    if (this.currentUser) {
      // Re-generate mock token
      const newToken = this.generateMockToken(this.currentUser);
      this.authToken = newToken;
      this.saveToStorage(this.currentUser, newToken);
      return true;
    }
    return false;
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
   * Get authorization header for API calls to local AI API
   */
  getAuthHeader(): { Authorization: string } | {} {
    if (this.authToken) {
      return { Authorization: this.authToken };
    }
    return {};
  }

  /**
   * Make authenticated request to local AI API
   */
  async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.LOCAL_AI_API_BASE}${endpoint}`;
    
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers
      }
    });
  }
}

export const localAuthService = new LocalAuthService();