import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = () => {
  const { login, isAuthenticated, user, loading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Only check auth on login page load
    if (!hasCheckedAuth) {
      checkAuth();
      setHasCheckedAuth(true);
    }
  }, [checkAuth, hasCheckedAuth]);

  useEffect(() => {
    if (isAuthenticated && user && !loading) {
      const fromLogout = location.state?.fromLogout;
      if (!fromLogout) {
        if (user.role === 'hr') {
          console.log("hr from login")
          navigate('/hr/dashboard', { replace: true });
        } else if (user.role === 'candidate') {
          console.log("candidate from login")
          navigate('/candidate/dashboard', { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, loading, navigate, location.state]);

  const handleLogin = () => {
    login();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome to MSBC Group</h1>
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default Login;