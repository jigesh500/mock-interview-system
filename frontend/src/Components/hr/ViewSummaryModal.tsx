import React from 'react';

interface ViewSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: any;
  totalQuestions?: number;
}

const ViewSummaryModal: React.FC<ViewSummaryModalProps> = ({ isOpen, onClose, summary, totalQuestions }) => {
  if (!isOpen || !summary) return null;

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-xs" >
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Interview Summary</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

         <div className="space-y-4">
           <div>
             <h3 className="font-semibold text-lg">Score: {summary.score}/{totalQuestions}</h3>
           </div>

           <div>
             <h4 className="font-semibold">Summary:</h4>
             <p className="text-gray-700">{summary.summary}</p>
           </div>
         </div>


        <div className="mt-6 flex justify-end">
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
