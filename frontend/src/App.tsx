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

        {/* Temporarily remove ProtectedRoute wrapper */}
        <Route path="/hr/dashboard" element={<HRDashboard />} />
        <Route path="/candidate/portal-info/:sessionId" element={<CandidateDashboard />} />
        <Route path="/interview/start" element={<TestInterface/>} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/logout" element={<ThankYou2 />} />
        <Route path="/violation" element={<ViolationPage />} />
        <Route path="/exam/:sessionId" element={<TestInterface />} />
        <Route path="/candidate-dashboard/:sessionId" element={<CandidateDashboard />} />
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
        <Route path="/start-exam/:sessionId" element={<ExamPage />} />
                <Route path="/thank-you" element={
                  <div className="flex justify-center items-center h-screen">
                    <h1 className="text-2xl font-bold">Thank you for completing the interview!</h1>
                  </div>
                } />
      </Routes>
    </Router>
  );
};

export default App;
