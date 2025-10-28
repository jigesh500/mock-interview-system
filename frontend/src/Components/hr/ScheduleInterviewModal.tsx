import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface Candidate {
  candidateEmail: string;
  candidateName: string;
}

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onInterviewScheduled: (magicLink: string) => void;
}

const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onInterviewScheduled,
}) => {
  const [selectedCandidateEmail, setSelectedCandidateEmail] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateEmail) {
      toast.error('Please select a candidate.');
      return;
    }

    setLoading(true);
    try {
      // The backend expects candidateEmail as a request parameter
      const response = await axios.post(
        `http://localhost:8081/hr/schedule-interview`,
        null, // No request body is needed
        {
          params: { candidateEmail: selectedCandidateEmail }, // Send as URL parameter
          withCredentials: true // Include cookies to maintain session
        }
      );

      // The backend returns an object like { magicLink: "..." }. We need to extract the link.
      if (response.data && response.data.magicLink) {
        toast.success('Interview scheduled and link generated!');
        onInterviewScheduled(response.data.magicLink); // Pass only the magic link string back
      }
      onClose();
    } catch (error: any) {
      console.error('Scheduling failed:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule interview.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Schedule First Round Interview</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="candidate" className="block text-sm font-medium text-slate-700 mb-2">
                Select Candidate
              </label>
              <select
                id="candidate"
                value={selectedCandidateEmail}
                onChange={(e) => setSelectedCandidateEmail(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              >
                <option value="" disabled>-- Choose a candidate --</option>
                {candidates.map((candidate) => (
                  <option key={candidate.candidateEmail} value={candidate.candidateEmail}>
                    {candidate.candidateName} ({candidate.candidateEmail})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Assign & Generate Link'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ScheduleInterviewModal;