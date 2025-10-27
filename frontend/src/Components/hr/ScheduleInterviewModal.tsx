import React, { useState, useEffect } from 'react';
import { hrAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: any[]; // List of candidates available for scheduling
  onInterviewScheduled: (magicLink: string) => void;
}

const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onInterviewScheduled,
}) => {
  const [selectedCandidateEmail, setSelectedCandidateEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && candidates.length > 0) {
      setSelectedCandidateEmail(candidates[0].candidateEmail); // Select first candidate by default
    }
  }, [isOpen, candidates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateEmail) {
      toast.error('Please select a candidate.');
      return;
    }

    setLoading(true);
    try {
      const response = await hrAPI.scheduleInterview(selectedCandidateEmail);
      if (response.data.magicLink) {
        toast.success('Interview scheduled successfully!');
        onInterviewScheduled(response.data.magicLink); // Pass the magic link to HRDashboard
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to schedule interview.');
      }
    } catch (error: any) {
      console.error('Scheduling failed:', error);
      toast.error(error.response?.data?.message || 'Scheduling failed: An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Schedule Interview</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="candidateEmail" className="block text-sm font-medium text-slate-700 mb-2">
                Select Candidate
              </label>
              <select
                id="candidateEmail"
                value={selectedCandidateEmail}
                onChange={(e) => setSelectedCandidateEmail(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              >
                {candidates.length === 0 ? (
                  <option value="">No candidates available</option>
                ) : (
                  candidates.map((candidate) => (
                    <option key={candidate.candidateEmail} value={candidate.candidateEmail}>
                      {candidate.candidateName} ({candidate.positionApplied})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loading || candidates.length === 0}
              >
                {loading ? 'Scheduling...' : 'Schedule Interview'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ScheduleInterviewModal;