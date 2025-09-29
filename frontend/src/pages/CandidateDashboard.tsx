import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { candidateAPI, authAPI } from '../services/api';
import { clearAuth } from '../redux/reducers/auth/authSlice';
import { useAppDispatch } from '../redux/hooks';

const CandidateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [interviewInfo, setInterviewInfo] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadInterviewInfo();
  }, []);

  const loadInterviewInfo = async () => {
    try {
      const response = await candidateAPI.getInterviewInfo();
      setInterviewInfo(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const joinInterview = async () => {
    try {
      const response = await candidateAPI.joinInterview();
      const { teamsUrl, sessionId: newSessionId } = response.data;

      // Open Teams meeting
      window.open(teamsUrl, '_blank');
      
      // Store session ID and show exam button
      setSessionId(newSessionId);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const startExam = () => {
    if (sessionId) {
      navigate(`/interview/start?sessionId=${sessionId}`);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch(clearAuth());
      localStorage.clear();
      sessionStorage.clear();
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Candidate Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        {interviewInfo?.hasInterview ? (
          <div>
            <h2 className="text-xl font-semibold text-green-600 mb-4">
              Interview Scheduled!
            </h2>
            <p className="mb-2"><strong>Meeting ID:</strong> {interviewInfo.meetingId}</p>
            {!sessionId ? (
              <button
                onClick={joinInterview}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 text-lg"
              >
                Join Teams & Start Interview
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-green-600 font-semibold">Teams meeting opened! Ready to start exam?</p>
                <button
                  onClick={startExam}
                  className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 text-lg"
                >
                  Start Interview Exam
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600">No interview scheduled</p>
        )}
      </div>
    </div>
  );
};

export default CandidateDashboard;
