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
  round?: string;
}

const ViewSummaryModal: React.FC<ViewSummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
  onSelect,
  onReject,
  candidateEmail,
  interviewStatus,
  round = 'first'
}) => {
  const { questions } = useAppSelector((state) => state.test);

  if (!isOpen || !summary) return null;

  const totalQuestions = questions.length;
  const isInterviewScheduled = interviewStatus === 'Scheduled';
  const isDisabled = isInterviewScheduled;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-slate-800">
              {round === 'first' ? 'First' : 'Second'} Round Interview Summary
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Candidate Information */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-semibold text-slate-800 mb-2">Candidate Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-600">Email:</span>
                  <span className="ml-2 text-slate-800">{candidateEmail}</span>
                </div>

              </div>
            </div>

            {/* Score Information */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-slate-800 mb-2">Score</h4>
              <div className="flex items-center">
                <div className="text-2xl font-bold text-green-600">
                  {summary.score}
                </div>
              </div>
            </div>

            {/* Questions and Answers */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-4">Interview Questions & Answers</h4>
              <div className="space-y-4">
                {summary.questions?.map((q: any, index: number) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-slate-800">Q{index + 1}: {q.question}</h5>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        q.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {q.correct ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Answer:</span> {q.answer}
                    </p>
                    {q.feedback && (
                      <p className="text-sm text-slate-500 mt-2">
                        <span className="font-medium">Feedback:</span> {q.feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Overall Summary */}
            {summary.summary && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-slate-800 mb-2">Overall Summary</h4>
                <p className="text-sm text-slate-700">{summary.summary}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-between">
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
            className="px-6 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewSummaryModal;