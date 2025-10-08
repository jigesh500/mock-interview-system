import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import TestInterface from './pages/protected/candidate/TestInterface';
import HRDashboard from './pages/HRDashboard';
import CandidateDashboard from './pages/CandidateDashboard';
// import StartTest from './components/StartTest';
import ThankYou from './components/ThankYou';
import ThankYou2 from './components/ThankYou2';
import ViolationPage from './pages/ViolationPage';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/auth/login" element={<Login />} />

        {/* Temporarily remove ProtectedRoute wrapper */}
        <Route path="/hr/dashboard" element={<HRDashboard />} />
        <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
        <Route path="/interview/start" element={<TestInterface/>} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/thank-you2" element={<ThankYou2 />} />
        <Route path="/violation" element={<ViolationPage />} />
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
