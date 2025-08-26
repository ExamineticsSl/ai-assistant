import React from 'react';
import { LocalAuthTest } from './LocalAuthTest';

export const DevBypass: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-yellow-500 text-white text-center py-2">
        <strong>🚧 DEVELOPMENT MODE - Auth Bypass Active</strong>
      </div>
      
      <div className="container mx-auto py-8">
        <LocalAuthTest />
      </div>
      
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
        <p className="text-sm">
          🧪 Testing AI API at localhost:5000
        </p>
      </div>
    </div>
  );
};