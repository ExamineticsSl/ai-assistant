// ResourceType-Aware Authentication Service
// Integrates with WHS Identity Provider with IMMUTABLE ResourceType constraints

import { 
  AuthUser, 
  AuthenticationRequest, 
  AuthenticationResponse, 
  ResourceType, 
  SecurityClearanceLevel,
  CompatibilityResult,
  ResourceTypeValidationResult 
} from '../types/index';
import { developmentConfig } from '../config/development';

class ResourceTypeAuthService {
  private readonly STORAGE_TOKEN_KEY = 'whs_auth_token';
  private readonly STORAGE_USER_KEY = 'whs_auth_user';
  private readonly STORAGE_REFRESH_KEY = 'whs_refresh_token';
  
  private currentUser: AuthUser | null = null;
  private authToken: string | null = null;
  
  // Identity Provider API endpoints
  private readonly API_ENDPOINTS = {
    baseUrl: developmentConfig.resourceTypeIdp.baseUrl,
    authEndpoint: developmentConfig.resourceTypeIdp.authEndpoint,
    validateEndpoint: developmentConfig.resourceTypeIdp.validateEndpoint,
    constraintsEndpoint: developmentConfig.resourceTypeIdp.constraintsEndpoint,
    refreshEndpoint: developmentConfig.resourceTypeIdp.refreshEndpoint
  };

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
        
        // Validate ResourceType constraints for loaded user
        if (this.currentUser) {
          this.validateUserResourceTypeConstraints(this.currentUser);
        }
      }
    } catch (error) {
      console.warn('Failed to load authentication state from storage:', error);
      this.clearStorage();
    }
  }

  /**
   * Validate ResourceType constraints for user
   * CRITICAL: Ensures IMMUTABLE constraints are enforced on frontend
   */
  private async validateUserResourceTypeConstraints(user: AuthUser): Promise<void> {
    if (!user?.resourceType) {
      console.error('User missing ResourceType - clearing authentication');
      this.clearStorage();
      return;
    }

    // Validate user permissions against ResourceType constraints
    const invalidPermissions = user.allowedPermissions?.filter(permission => 
      this.isPermissionRestrictedForResourceType(user.resourceType, permission)
    ) || [];

    if (invalidPermissions.length > 0) {
      console.error('User has permissions prohibited by ResourceType constraints:', invalidPermissions);
      // Remove invalid permissions to maintain constraint integrity
      user.allowedPermissions = user.allowedPermissions?.filter(permission => 
        !this.isPermissionRestrictedForResourceType(user.resourceType, permission)
      ) || [];
      
      this.saveToStorage(user, this.authToken!, localStorage.getItem(this.STORAGE_REFRESH_KEY) || undefined);
    }
  }

  /**
   * Check if permission is restricted for ResourceType (IMMUTABLE constraints)
   */
  private isPermissionRestrictedForResourceType(resourceType: ResourceType, permission: string): boolean {
    // IMMUTABLE: AgentWorkerService cannot have UI permissions
    if (resourceType === ResourceType.AgentWorkerService) {
      return permission.startsWith('ui.') || 
             permission.startsWith('dashboard.') || 
             permission.includes('user.profile.edit');
    }
    
    // IMMUTABLE: DataSource cannot control ComputeResources
    if (resourceType === ResourceType.DataSource) {
      return permission.startsWith('compute.control') || 
             permission.startsWith('compute.provision');
    }
    
    return false;
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
    this.currentUser = null;
    this.authToken = null;
  }

  /**
   * Check if user is currently authenticated with valid ResourceType
   */
  isAuthenticated(): boolean {
    return !!(this.currentUser?.isAuthenticated && this.currentUser?.resourceType);
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
   * Login with email and password using ResourceType Identity Provider
   */
  async login(credentials: AuthenticationRequest): Promise<AuthenticationResponse> {
    try {
      const response = await fetch(`${this.API_ENDPOINTS.baseUrl}${this.API_ENDPOINTS.authEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const result: AuthenticationResponse = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.error || 'Authentication failed',
          requiresMfa: result.requiresMfa || false
        };
      }

      if (result.requiresMfa) {
        return {
          success: false,
          requiresMfa: true,
          message: 'MFA verification required'
        };
      }

      const { user, token, refreshToken } = result;
      
      if (!user || !token) {
        return {
          success: false,
          error: 'Invalid response from authentication service'
        };
      }

      // CRITICAL: Validate ResourceType is present
      if (!user.resourceType) {
        console.error('Authentication response missing ResourceType');
        return {
          success: false,
          error: 'Invalid authentication response - missing ResourceType'
        };
      }

      // Validate ResourceType constraints
      await this.validateUserResourceTypeConstraints(user);

      this.currentUser = user;
      this.authToken = token;
      this.saveToStorage(user, token, refreshToken);

      return {
        success: true,
        user: user,
        token: token,
        refreshToken: refreshToken,
        expiresAt: result.expiresAt,
        message: 'Authentication successful'
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
   * Validate current token with Identity Provider
   */
  async validateToken(): Promise<boolean> {
    if (!this.authToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.API_ENDPOINTS.baseUrl}${this.API_ENDPOINTS.validateEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        this.clearStorage();
        return false;
      }

      const validation = await response.json();
      
      if (!validation.isValid || !validation.resourceType) {
        this.clearStorage();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      this.clearStorage();
      return false;
    }
  }

  /**
   * Check ResourceType compatibility for cross-type operations
   */
  async checkResourceTypeCompatibility(
    targetResourceType: ResourceType, 
    operation: string
  ): Promise<CompatibilityResult> {
    if (!this.currentUser?.resourceType) {
      return {
        isCompatible: false,
        restrictions: ['No authenticated user or ResourceType'],
        warnings: ['Authentication required'],
        recommendations: ['Please log in first']
      };
    }

    try {
      const response = await fetch(`${this.API_ENDPOINTS.baseUrl}${this.API_ENDPOINTS.constraintsEndpoint}/compatibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          sourceResourceType: this.currentUser.resourceType,
          targetResourceType: targetResourceType,
          operation: operation
        })
      });

      if (!response.ok) {
        throw new Error('Compatibility check failed');
      }

      const result: CompatibilityResult = await response.json();
      
      // Log constraint violations for security monitoring
      if (!result.isCompatible) {
        console.warn('ResourceType compatibility violation detected:', {
          source: this.currentUser.resourceType,
          target: targetResourceType,
          operation: operation,
          restrictions: result.restrictions
        });
      }

      return result;
    } catch (error) {
      console.error('ResourceType compatibility check error:', error);
      return {
        isCompatible: false,
        restrictions: ['Compatibility check failed'],
        warnings: ['Unable to validate ResourceType constraints'],
        recommendations: ['Contact system administrator']
      };
    }
  }

  /**
   * Validate permission for current user's ResourceType
   */
  async validatePermissionForResourceType(permission: string): Promise<ResourceTypeValidationResult> {
    if (!this.currentUser?.resourceType) {
      return {
        isValid: false,
        allowedActions: [],
        blockedActions: [permission],
        reasons: ['No authenticated user or ResourceType']
      };
    }

    // Client-side validation for common restrictions
    if (this.isPermissionRestrictedForResourceType(this.currentUser.resourceType, permission)) {
      return {
        isValid: false,
        allowedActions: [],
        blockedActions: [permission],
        reasons: [`Permission '${permission}' is not allowed for ResourceType '${this.currentUser.resourceType}'`]
      };
    }

    try {
      const response = await fetch(`${this.API_ENDPOINTS.baseUrl}${this.API_ENDPOINTS.constraintsEndpoint}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          resourceType: this.currentUser.resourceType,
          permission: permission
        })
      });

      if (!response.ok) {
        throw new Error('Permission validation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Permission validation error:', error);
      return {
        isValid: false,
        allowedActions: [],
        blockedActions: [permission],
        reasons: ['Permission validation failed']
      };
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

      const response = await fetch(`${this.API_ENDPOINTS.baseUrl}${this.API_ENDPOINTS.refreshEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        this.clearStorage();
        return false;
      }

      const result = await response.json();
      
      if (result.success && result.accessToken) {
        this.authToken = result.accessToken;
        localStorage.setItem(this.STORAGE_TOKEN_KEY, result.accessToken);
        
        if (result.refreshToken) {
          localStorage.setItem(this.STORAGE_REFRESH_KEY, result.refreshToken);
        }
        
        return true;
      }
      
      this.clearStorage();
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearStorage();
      return false;
    }
  }

  /**
   * Logout user and clear authentication state
   */
  async logout(): Promise<void> {
    try {
      // Optionally call logout endpoint
      if (this.authToken) {
        await fetch(`${this.API_ENDPOINTS.baseUrl}/api/identity/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        });
      }
    } catch (error) {
      console.warn('Logout endpoint call failed:', error);
    } finally {
      this.clearStorage();
    }
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.currentUser?.roles?.includes(role) || false;
  }

  /**
   * Check if user has specific permission (with ResourceType validation)
   */
  hasPermission(permission: string): boolean {
    // First check if user has the permission
    const hasPermission = this.currentUser?.allowedPermissions?.includes(permission) || false;
    
    // Then check if it's restricted by ResourceType constraints
    if (hasPermission && this.currentUser?.resourceType) {
      return !this.isPermissionRestrictedForResourceType(this.currentUser.resourceType, permission);
    }
    
    return hasPermission;
  }

  /**
   * Check if user meets minimum security clearance level
   */
  hasMinimumClearanceLevel(requiredLevel: SecurityClearanceLevel): boolean {
    if (!this.currentUser?.clearanceLevel) {
      return false;
    }
    
    return this.currentUser.clearanceLevel >= requiredLevel;
  }

  /**
   * Get ResourceType for current user
   */
  getUserResourceType(): ResourceType | null {
    return this.currentUser?.resourceType || null;
  }

  /**
   * Get security clearance level for current user
   */
  getUserClearanceLevel(): SecurityClearanceLevel | null {
    return this.currentUser?.clearanceLevel || null;
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

  /**
   * Check if current user can access UI components (Dashboard restriction)
   */
  canAccessUI(): boolean {
    if (!this.currentUser?.resourceType) {
      return false;
    }
    
    // IMMUTABLE: AgentWorkerService cannot access UI components
    return this.currentUser.resourceType !== ResourceType.AgentWorkerService;
  }

  /**
   * Check if current user can perform admin operations
   */
  canPerformAdminOperations(): boolean {
    return this.hasRole('admin') && 
           this.hasMinimumClearanceLevel(SecurityClearanceLevel.Confidential) &&
           this.canAccessUI();
  }
}

export const resourceTypeAuthService = new ResourceTypeAuthService();