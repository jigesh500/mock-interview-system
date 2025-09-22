import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/auth/Login';
import ProtectedRoute from './Components/Auth/ProtectedRoute';

// Dashboard Components
const HRDashboard = () => <div className="p-8">HR Dashboard</div>;
const CandidateStartTest = () => <div className="p-8">Start Your Test</div>;

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/auth/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/hr/dashboard" element={
          <ProtectedRoute allowedRoles={['hr']}>
            <HRDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/candidate/start-test" element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <CandidateStartTest />
          </ProtectedRoute>
        } />
        
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
