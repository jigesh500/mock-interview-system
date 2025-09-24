import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Header from '../Header';

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated && user && allowedRoles.includes(user.role)) {
    return <>
    <Header />
    {children}</>;
  }

  return <Navigate to="/auth/login" replace />;
};

export default ProtectedRoute;
