import React, { useState, useEffect } from 'react';
import { hrAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface ScheduleSecondRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateEmail: string;
  onScheduled: () => void;
}

const ScheduleSecondRoundModal: React.FC<ScheduleSecondRoundModalProps> = ({
  isOpen,
  onClose,
  candidateEmail,
  onScheduled,
}) => {
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset fields every time modal opens
      setInterviewerEmail('');
      setInterviewerName('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!interviewerEmail || !interviewerName) {
      toast.error('Please enter both interviewer email and name.');
      return;
    }

    setIsLoading(true);
    try {
      await hrAPI.scheduleSecondRound({
        candidateEmail,
        interviewerEmail,
        interviewerName,
      });

      toast.success('Second round scheduled successfully!');
      onScheduled(); // refresh parent data
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to schedule interview.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-slate-800">Schedule Second Round</h2>
        <p className="mb-4 text-slate-600">
          Assign an interviewer for <span className="font-semibold">{candidateEmail}</span>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="interviewerEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Interviewer Email
            </label>
            <input
              type="email"
              id="interviewerEmail"
              value={interviewerEmail}
              onChange={(e) => setInterviewerEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., john@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="interviewerName" className="block text-sm font-medium text-gray-700 mb-1">
              Interviewer Name
            </label>
            <input
              type="text"
              id="interviewerName"
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., John Doe"
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !interviewerEmail || !interviewerName}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Scheduling...' : 'Assign Interviewer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleSecondRoundModal;
