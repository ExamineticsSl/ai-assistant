// Development configuration for local testing with AI API

export const developmentConfig = {
  // Use local AI API for development
  useLocalAuth: true,
  
  // Local AI API endpoints
  localAiApi: {
    baseUrl: 'http://localhost:5000/api/v1',
    authEndpoint: '/AuthTest',
    protectedEndpoint: '/AuthTest/protected'
  },
  
  // Production SourceLink endpoints (for reference)
  sourceLinkApi: {
    baseUrl: 'https://backend-dev.1sourcelink.com',
    authEndpoint: '/IdentityApp/api/v1/Auth',
    loginEndpoint: '/IdentityApp/api/v1/Auth/login',
    decodeEndpoint: '/IdentityApp/api/v1/Auth/decode'
  },
  
  // ResourceType Identity Provider endpoints
  resourceTypeIdp: {
    baseUrl: 'http://localhost:5000',
    authEndpoint: '/api/identity/authenticate',
    validateEndpoint: '/api/identity/validate',
    constraintsEndpoint: '/api/identity/constraints',
    refreshEndpoint: '/api/identity/refresh'
  },
  
  // Development settings
  development: {
    enableDebugLogging: true,
    mockAuthentication: true,
    bypassTokenValidation: true
  }
};

// Helper to check if we're in development mode
export const isDevelopment = () => {
  return (import.meta as any).env?.DEV || (import.meta as any).env?.MODE === 'development';
};

// Helper to get current config based on environment
export const getConfig = () => {
  return developmentConfig;
};