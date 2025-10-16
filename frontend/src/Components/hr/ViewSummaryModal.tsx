import React from 'react';
import toast from 'react-hot-toast';
import { useAppSelector } from '../../redux/hooks';

interface ViewSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: any;
  onSelect?: (candidateEmail: string) => void;
  onReject?: (candidateEmail: string) => void;
  candidateEmail?: string;
  interviewStatus?: string;
}

const ViewSummaryModal: React.FC<ViewSummaryModalProps> = ({ 
  isOpen, 
  onClose,
  summary,
  onSelect, 
  onReject, 
  candidateEmail,
  interviewStatus 
}) => {
     const { questions } = useAppSelector((state) => state.test);




  if (!isOpen || !summary) return null;

const totalQuestions = questions.length;

  const isInterviewScheduled = interviewStatus === 'Scheduled';
  const isDisabled = isInterviewScheduled;

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-xs">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Interview Summary</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">Score: {summary.score}/25</h3>
          </div>

          <div>
            <h4 className="font-semibold">Summary:</h4>
            <p className="text-gray-700">{summary.summary}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (isDisabled) {
                  toast.error('Interview is scheduled. Please wait for candidate to complete the interview before making a decision.');
                  return;
                }
                if (window.confirm(`Are you sure you want to SELECT candidate ${candidateEmail}?`)) {
                  onSelect?.(candidateEmail!);
                }
              }}
              disabled={isDisabled}
              className={`text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm ${
                isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'
              }`}
              style={{ backgroundColor: '#56C5D0' }}
            >
              Select Candidate
            </button>
            <button
              onClick={() => {
                if (isDisabled) {
                  toast.error('Interview is scheduled. Please wait for candidate to complete the interview before making a decision.');
                  return;
                }
                if (window.confirm(`Are you sure you want to REJECT candidate ${candidateEmail}?`)) {
                  onReject?.(candidateEmail!);
                }
              }}
              disabled={isDisabled}
              className={`text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm ${
                isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'
              }`}
              style={{ backgroundColor: '#ED1C24' }}
            >
              Reject Candidate
            </button>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewSummaryModal;
