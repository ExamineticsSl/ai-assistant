// Authentication Services Export
// Provides access to both legacy and ResourceType authentication

export { authService } from './authService';
export { resourceTypeAuthService } from './authService.resourceType';

// Export types from legacy auth service
export type { 
  AuthUser as LegacyAuthUser,
  LoginCredentials,
  AuthResponse 
} from './authService';

// Re-export ResourceType RBAC types
export type { 
  AuthUser,
  ResourceType,
  SecurityClearanceLevel,
  AuthenticationRequest,
  AuthenticationResponse,
  CompatibilityResult,
  ResourceTypeValidationResult
} from '../types/index';