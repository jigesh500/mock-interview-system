import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import ProtectedRoute from './Components/auth/ProtectedRoute';
import TestInterface from './pages/protected/candidate/TestInterface';
const HRDashboard = () => <div className="p-8">HR Dashboard</div>;

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/auth/login" element={<Login />} />
        {/* Protected Routes */}
        <Route path="hr/dashboard" element={
          <ProtectedRoute allowedRoles={['hr']}>
            <HRDashboard />
          </ProtectedRoute>
        } />
        <Route path="/interview/start" element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <TestInterface/>
          </ProtectedRoute>
        } />
        
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
