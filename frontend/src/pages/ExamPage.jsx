// src/pages/ExamPage.jsx
import React from 'react';
import CameraMonitor from '../components/CameraMonitor';

const ExamPage = ({ sessionId }) => {
  return (
    <div>
      <h1>Mock Interview Exam</h1>
      <CameraMonitor sessionId={sessionId} />
      {/* MCQ + Coding Questions components go here */}
    </div>
  );
};

export default ExamPage;
