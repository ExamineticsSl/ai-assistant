import React, { useState } from 'react';
import { localAuthService } from '../services/authService.local';
import type { AuthUser } from '../services/authService.local';

export const LocalAuthTest: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [credentials, setCredentials] = useState({
    username: 'matt.holton',
    password: 'dev-password'
  });

  const handleLogin = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await localAuthService.login(credentials);
      
      if (result.success && result.user) {
        setUser(result.user);
        setMessage(`✅ Login successful: ${result.message}`);
      } else {
        setMessage(`❌ Login failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Login error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await localAuthService.logout();
    setUser(null);
    setMessage('Logged out successfully');
  };

  const handleTestProtected = async () => {
    setMessage('Testing protected endpoint...');
    
    try {
      const response = await localAuthService.makeAuthenticatedRequest('/AuthTest/protected');
      
      if (response.ok) {
        const data = await response.json();
        setMessage(`✅ Protected endpoint success: ${data.message}`);
      } else {
        setMessage(`❌ Protected endpoint failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setMessage(`❌ Protected endpoint error: ${error}`);
    }
  };

  const handleTestPublic = async () => {
    setMessage('Testing public endpoint...');
    
    try {
      const response = await fetch('http://localhost:5000/api/v1/AuthTest/public');
      
      if (response.ok) {
        const data = await response.json();
        setMessage(`✅ Public endpoint success: ${data.message}`);
      } else {
        setMessage(`❌ Public endpoint failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setMessage(`❌ Public endpoint error: ${error}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-blue-800 mb-2">
          🧪 Local AI API Authentication Test
        </h2>
        <p className="text-blue-700">
          This component tests authentication with the local AI API running on localhost:5000
        </p>
      </div>

      {/* Connection Test */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">1. Connection Test</h3>
        <button
          onClick={handleTestPublic}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Test Public Endpoint
        </button>
      </div>

      {/* Login Test */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">2. Authentication Test</h3>
        
        {!user ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Username"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="border rounded px-3 py-2"
              />
              <input
                type="password"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="border rounded px-3 py-2"
              />
            </div>
            
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isLoading ? 'Logging in...' : 'Login (Local Dev)'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <h4 className="font-medium text-green-800">Logged in as:</h4>
              <p><strong>User ID:</strong> {user.userId}</p>
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Display Name:</strong> {user.displayName}</p>
              <p><strong>Roles:</strong> {user.roles.join(', ')}</p>
              <p><strong>Permissions:</strong> {user.permissions.join(', ')}</p>
            </div>
            
            <div className="space-x-3">
              <button
                onClick={handleTestProtected}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
              >
                Test Protected Endpoint
              </button>
              
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {message && (
        <div className={`border rounded-lg p-4 ${
          message.includes('✅') 
            ? 'bg-green-50 border-green-200 text-green-800'
            : message.includes('❌') 
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-gray-50 border-gray-200 text-gray-800'
        }`}>
          <h4 className="font-medium mb-1">Status:</h4>
          <p className="whitespace-pre-wrap font-mono text-sm">{message}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">📝 Instructions:</h4>
        <ol className="text-yellow-700 text-sm space-y-1">
          <li>1. Ensure the AI API is running on localhost:5000</li>
          <li>2. Click "Test Public Endpoint" to verify connectivity</li>
          <li>3. Enter any username/password and click "Login (Local Dev)"</li>
          <li>4. Test the protected endpoint to verify authentication</li>
          <li>5. Check browser console for detailed logs</li>
        </ol>
      </div>
    </div>
  );
};