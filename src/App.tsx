import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { HumanApprovalDashboard } from './components/HumanApprovalDashboard';
import { LoginForm } from './components/LoginForm';
import { Header } from './components/Header';
import { DebugPanel } from './components/DebugPanel';
import { LocalAuthTest } from './components/LocalAuthTest';
import { DevBypass } from './components/DevBypass';
import { resourceTypeAuthService as authService } from './services/authService.resourceType';
import { AuthUser } from './types/index';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dev bypass - check URL for test mode
  const isDevBypass = window.location.pathname.includes('/dev-test') || 
                     window.location.search.includes('devtest=true');

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const authenticated = authService.isAuthenticated();
        const user = authService.getCurrentUser();
        setIsAuthenticated(authenticated);
        setCurrentUser(user);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    const user = authService.getCurrentUser();
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Dev bypass mode - skip authentication
  if (isDevBypass) {
    return <DevBypass />;
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // Check if authenticated user can access UI (ResourceType constraint)
  if (isAuthenticated && !authService.canAccessUI()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-4">
            Access Restricted
          </h2>
          <p className="text-red-600 mb-4">
            Your ResourceType ({authService.getUserResourceType()}) does not have UI access permissions.
          </p>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-gray-50">
      {currentUser && (
        <Header user={currentUser} onLogout={handleLogout} />
      )}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HumanApprovalDashboard />} />
          <Route path="/approvals" element={<HumanApprovalDashboard />} />
          <Route path="/projects" element={<HumanApprovalDashboard />} />
          <Route path="/project-progress" element={<HumanApprovalDashboard />} />
          <Route path="/history" element={<HumanApprovalDashboard />} />
          <Route path="/stats" element={<HumanApprovalDashboard />} />
          <Route path="/analytics" element={<HumanApprovalDashboard />} />
          <Route path="/local-auth-test" element={<LocalAuthTest />} />
          {/* Fallback to dashboard */}
          <Route path="*" element={<HumanApprovalDashboard />} />
        </Routes>
      </main>
      
      {/* Debug Panel for development */}
      {currentUser && <DebugPanel />}
    </div>
  );
}

export default App;