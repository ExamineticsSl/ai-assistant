import React from 'react';
import { authService, AuthUser } from '../services/authService';

interface HeaderProps {
  user: AuthUser;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const handleLogout = async () => {
    await authService.logout();
    onLogout();
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Title */}
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              ExamineticsSl AI Assistant
            </h1>
          </div>

          {/* User info and logout */}
          <div className="flex items-center space-x-4">
            {/* User info */}
            <div className="text-sm text-gray-700">
              <span className="font-medium">{user.displayName}</span>
              <span className="text-gray-500 ml-2">({user.username})</span>
            </div>

            {/* Roles badge */}
            <div className="flex space-x-1">
              {user.roles.slice(0, 2).map((role) => (
                <span
                  key={role}
                  className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                >
                  {role}
                </span>
              ))}
              {user.roles.length > 2 && (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  +{user.roles.length - 2}
                </span>
              )}
            </div>

            {/* Authentication status */}
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-gray-600">Authenticated</span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};