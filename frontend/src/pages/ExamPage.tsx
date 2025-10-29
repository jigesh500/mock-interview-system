// Create a new file at: src/pages/ExamPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewAPI } from '../services/api'; // Assuming you add interviewAPI to your api.ts
import toast, { Toaster } from 'react-hot-toast';

// Define the types for our data
interface Question {
  id: string;
  type: 'MCQ' | 'Coding';
  question: string;
  options?: string[];
}

const ExamPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();



  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided.');
      setLoading(false);
      return;
    }

    const fetchQuestions = async () => {
      try {
        toast.loading('Loading your interview questions...');
        const response = await interviewAPI.startInterviewWithSession(sessionId);
        setQuestions(response.data.questions);
        setLoading(false);
        toast.dismiss();
        toast.success('Interview started. Good luck!');
      } catch (err: any) {
        console.error('Failed to start interview:', err);
        const errorMessage = err.response?.data?.message || 'Failed to load interview. The link may be invalid or expired.';
        setError(errorMessage);
        setLoading(false);
        toast.dismiss();
        toast.error(errorMessage);
      }
    };

    fetchQuestions();
  }, [sessionId]);

  const handleAnswerChange = (questionIndex: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [`answer${questionIndex}`]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;

    if (Object.keys(answers).length < questions.length) {
      if (!window.confirm('You have not answered all questions. Are you sure you want to submit?')) {
        return;
      }
    }

    setIsSubmitting(true);
    toast.loading('Submitting your answers...');

    try {
      await interviewAPI.submitAnswers(answers, sessionId);

      // Log INTERVIEW_END event
      try {
            await fetch('http://localhost:8081/api/monitoring/log-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                sessionId,
                candidateEmail: 'anonymous@interview.com', // Or get from props/state
                eventType: 'INTERVIEW_END',
                description: 'Interview completed successfully',
                metadata: JSON.stringify({ submittedAt: new Date().toISOString() })
              })
            });
            console.log('INTERVIEW_END event logged successfully.');
          } catch (err) {
            console.error('Error logging interview end:', err);
          }

      toast.dismiss();
      toast.success('Interview submitted successfully!');

      // Wait a bit before redirecting to ensure the event is logged
      setTimeout(() => navigate('/thank-you'), 2000);
    } catch (err: any) {
      console.error('Failed to submit answers:', err);
      const errorMessage = err.response?.data?.message || 'An error occurred while submitting.';
      toast.dismiss();
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500 font-bold">{error}</div>;
  }

  return (
    <div className="bg-slate-100 min-h-screen p-8">
      <Toaster position="top-center" />
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-6 border-b pb-4">Technical Interview</h1>
        <form onSubmit={handleSubmit}>
          {questions.map((q, index) => (
            <div key={q.id} className="mb-8 p-6 bg-slate-50 rounded-md border">
              <p className="font-semibold text-lg text-slate-700 mb-4">
                Question {index + 1}: {q.question}
              </p>
              {q.type === 'MCQ' && q.options && (
                <div className="space-y-3">
                  {q.options.map((option, optIndex) => (
                    <label key={optIndex} className="flex items-center p-3 rounded-md hover:bg-slate-200 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name={`answer${index}`}
                        value={option}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        className="mr-3 h-4 w-4"
                        required
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'Coding' && (
                <textarea
                  rows={8}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  placeholder="Write your code here..."
                  className="w-full p-3 border rounded-md font-mono text-sm bg-gray-900 text-green-400"
                  required
                />
              )}
            </div>
          ))}
          <div className="text-center mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-green-600 disabled:bg-gray-400 transition-all"
            >
              {isSubmitting ? 'Submitting...' : 'Finish & Submit Interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExamPage;