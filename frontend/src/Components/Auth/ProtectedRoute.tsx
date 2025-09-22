import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {

  const userRole = localStorage.getItem('role');

  if (userRole && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return <Navigate to="/auth/login" replace />;
};

export default ProtectedRoute;