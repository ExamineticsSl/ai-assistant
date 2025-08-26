import React, { useState } from 'react';
import { authService } from '../services/authService';

export const DebugPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const user = authService.getCurrentUser();
  const token = authService.getAuthToken();

  const testApiCall = async () => {
    try {
      setTestResult('Testing API call...');
      const response = await fetch('http://localhost:5000/api/v1/authtest/protected', {
        headers: authService.getAuthHeader() as Record<string, string>
      });
      
      if (response.ok) {
        const data = await response.text();
        setTestResult(`✅ Success: ${data}`);
      } else {
        setTestResult(`❌ Failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`);
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Debug 🔍
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white shadow-xl rounded-lg border p-4 w-96 max-h-96 overflow-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Authentication Debug</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          ×
        </button>
      </div>

      <div className="space-y-3 text-xs">
        {/* User Info */}
        <div>
          <h4 className="font-medium text-gray-700 mb-1">User Info:</h4>
          <div className="bg-gray-50 p-2 rounded">
            <div><strong>User ID:</strong> {user?.userId || 'None'}</div>
            <div><strong>Username:</strong> {user?.username || 'None'}</div>
            <div><strong>Display Name:</strong> {user?.displayName || 'None'}</div>
            <div><strong>Authenticated:</strong> {user?.isAuthenticated ? '✅ Yes' : '❌ No'}</div>
          </div>
        </div>

        {/* Roles */}
        <div>
          <h4 className="font-medium text-gray-700 mb-1">Roles:</h4>
          <div className="bg-gray-50 p-2 rounded">
            {user?.roles?.length ? (
              user.roles.map(role => (
                <span key={role} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-1 mb-1">
                  {role}
                </span>
              ))
            ) : (
              <span className="text-gray-500">No roles</span>
            )}
          </div>
        </div>

        {/* Token Info */}
        <div>
          <h4 className="font-medium text-gray-700 mb-1">Bearer Token:</h4>
          <div className="bg-gray-50 p-2 rounded break-all">
            {token ? (
              <span className="text-green-600 font-mono">
                Bearer {token.substring(0, 20)}...
              </span>
            ) : (
              <span className="text-red-600">No token</span>
            )}
          </div>
        </div>

        {/* API Test */}
        <div>
          <h4 className="font-medium text-gray-700 mb-1">API Test:</h4>
          <button
            onClick={testApiCall}
            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 mb-2"
          >
            Test Protected Endpoint
          </button>
          {testResult && (
            <div className="bg-gray-50 p-2 rounded text-xs">
              {testResult}
            </div>
          )}
        </div>

        {/* Headers Preview */}
        <div>
          <h4 className="font-medium text-gray-700 mb-1">Request Headers:</h4>
          <div className="bg-gray-50 p-2 rounded font-mono text-xs">
            {JSON.stringify(authService.getAuthHeader(), null, 2)}
          </div>
        </div>
      </div>
    </div>
  );
};