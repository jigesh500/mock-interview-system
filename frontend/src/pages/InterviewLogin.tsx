// src/pages/InterviewLogin.tsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const InterviewLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const email = params.get('email');
    const meetingId = params.get('meetingId');

    if (email && meetingId) {
      // Store the candidate's details in localStorage.
      // The interview page will read these to initialize the session.
      localStorage.setItem('candidateEmail', email);
      localStorage.setItem('meetingId', meetingId);

      // Redirect to the actual interview start page.
      // Update this path if your interview page is at a different route.
      navigate('/interview/start');
    } else {
      // If params are missing, the link was likely tampered with.
      navigate('/invalid-link?reason=missing_params');
    }
  }, [navigate, location]);

  // Display a simple loading message while redirecting.
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Authenticating...</h2>
      <p>Please wait while we prepare your interview session.</p>
    </div>
  );
};

export default InterviewLogin;