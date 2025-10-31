import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import TestInterface from './pages/protected/candidate/TestInterface';
import HRDashboard from './pages/HRDashboard';
import CandidateDashboard from './pages/CandidateDashboard';
import ThankYou from './components/ThankYou';
import ThankYou2 from './components/ThankYou2';
import ViolationPage from './pages/ViolationPage';
import InterviewLogin from './pages/InterviewLogin';
import ExamPage from './pages/ExamPage';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/interview-login" element={<InterviewLogin />} />
        <Route path="/invalid-link" element={<p style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>This interview link is invalid or has expired.</p>} />

        {/* Routes without protection for now */}
        <Route path="/hr/dashboard" element={<HRDashboard />} />
        <Route path="/candidate/portal-info/:sessionId" element={<CandidateDashboard />} />
        <Route path="/interview/start" element={<TestInterface/>} />
        <Route path="/exam/:sessionId" element={<TestInterface />} />
        <Route path="/candidate-dashboard/:sessionId" element={<CandidateDashboard />} />
        <Route path="/start-exam/:sessionId" element={<ExamPage />} />

        {/* Public completion pages */}
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/logout" element={<ThankYou2 />} />
        <Route path="/violation" element={<ViolationPage />} />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;