import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { candidateAPI, authAPI } from '../services/api';
import { clearAuth } from '../redux/reducers/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import toast, { Toaster } from 'react-hot-toast';

interface PortalInfo {
  candidateName: string;
  positionApplied: string;
  message: string;
}

const CandidateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // State for the new magic link flow
  const [portalInfo, setPortalInfo] = useState<PortalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the original logged-in flow
  const [interviewInfo, setInterviewInfo] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (urlSessionId) {
      // --- Magic Link Flow (Unauthenticated) ---
      const fetchPortalInfo = async () => {
        try {
          const response = await candidateAPI.getPortalInfo(urlSessionId);
          setPortalInfo(response.data);
        } catch (err: any) {
          const errorMessage = err.response?.data?.message || 'Failed to load interview details. The link may be invalid or expired.';
          setError(errorMessage);
          toast.error(errorMessage);
        } finally {
          setLoading(false);
        }
      };
      fetchPortalInfo();
    } else if (isAuthenticated) {
      // --- Logged-in User Flow ---
      loadInterviewInfo();
    } else {
      // Not a magic link and not logged in, redirect away
      navigate('/');
    }
  }, [urlSessionId, isAuthenticated, navigate]);

  const loadInterviewInfo = async () => {
    try {
      const response = await candidateAPI.getInterviewInfo();
      setInterviewInfo(response.data);
    } catch (error) {
      console.error('Error loading interview info for logged-in user:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers for Logged-in Flow ---
  const joinInterview = async () => {
    try {
      const response = await candidateAPI.joinInterview();
      const { teamsUrl, sessionId: newSessionId } = response.data;
      window.open(teamsUrl, '_blank');
      setSessionId(newSessionId);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const startExam = () => {
    if (sessionId) {
      const examUrl = `${window.location.origin}/interview/start?sessionId=${sessionId}`;
      window.open(examUrl, '_blank', 'width=2100,height=1200,toolbar=no,menubar=no,scrollbars=yes,resizable=no,location=no,status=no');
      setTimeout(() => {
        loadInterviewInfo();
        setSessionId(null);
      }, 2000);
    }
  };

  // --- Handler for Magic Link Flow ---
  const handleStartInterview = () => {
    if (urlSessionId) {
      navigate(`/exam/${urlSessionId}`);
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

  // --- Render Logic ---

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-slate-100 text-slate-700">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen bg-red-50 text-red-700 font-semibold p-8">{error}</div>;
  }

  // Render Magic Link Portal
  if (urlSessionId && portalInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Toaster position="top-center" />
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome, {portalInfo.candidateName}!</h1>
          <p className="text-lg text-slate-600 mb-4">
            You are being interviewed for the position of <span className="font-semibold text-slate-700">{portalInfo.positionApplied}</span>.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 rounded-r-lg my-6 text-left">
            <p className="font-semibold">Instructions:</p>
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>Ensure you have a stable internet connection.</li>
              <li>The interview is timed. Please complete it in one session.</li>
              <li>Click the "Start Interview" button below when you are ready to begin.</li>
            </ul>
          </div>
          <button
            onClick={handleStartInterview}
            className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-12 rounded-lg text-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
          >
            Start Interview
          </button>
          <p className="text-xs text-slate-400 mt-8">
            If you encounter any issues, please contact the HR representative who sent you this link.
          </p>
        </div>
      </div>
    );
  }

  // Render Original Logged-in Dashboard
  if (isAuthenticated) {
    return (
      <div className="p-8">
        <Toaster position="top-center" />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Candidate Dashboard</h1>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
            Logout
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          {interviewInfo?.hasInterview ? (
            <div>
              <h2 className="text-xl font-semibold text-green-600 mb-4">Interview Scheduled!</h2>
              <p className="mb-2"><strong>Meeting ID:</strong> {interviewInfo.meetingId}</p>
              {!sessionId ? (
                <button onClick={joinInterview} className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 text-lg">
                  Join Teams & Start Interview
                </button>
              ) : (
                <div className="space-y-4">
                  <p className="text-green-600 font-semibold">Teams meeting opened! Ready to start exam?</p>
                  <button onClick={startExam} className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 text-lg">
                    Start Interview Exam
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">{interviewInfo?.message || 'No interview scheduled'}</p>
          )}
        </div>
      </div>
    );
  }

  // Fallback render
  return null;
};

export default CandidateDashboard;
