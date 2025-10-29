import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { hrAPI, authAPI } from '../services/api';
import { clearAuth } from '../redux/reducers/auth/authSlice';
import { useAppDispatch } from '../redux/hooks';
import AddCandidateModal from '../Components/hr/AddCandidateModal';
import ScheduleInterviewModal from '../Components/hr/ScheduleInterviewModal';
import toast, { Toaster } from 'react-hot-toast';
import ViewCandidateModal from '../Components/hr/ViewCandidateModal';
import ScheduleSecondRoundModal from '../Components/hr/ScheduleSecondRoundModal';
import ViewSummaryModal from '../Components/hr/ViewSummaryModal';
import { useAppSelector } from '../redux/hooks';
import { FaCopy } from 'react-icons/fa';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const HRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [candidateEmail, setCandidateEmail] = useState(''); // Used for both first and second round scheduling
  const [candidates, setCandidates] = useState<any[]>([]);
  const [gridApi, setGridApi] = useState<any>(null);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [updateCandidateEmail, setUpdateCandidateEmail] = useState<string>('');
  const [showScheduleInterviewModal, setShowScheduleInterviewModal] = useState(false);
  const [showViewCandidateModal, setShowViewCandidateModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  // CHANGE: This state is for the second round scheduling modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const { questions } = useAppSelector((state) => state.test);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [summaryTimes, setSummaryTimes] = useState<{[key: string]: string}>({});
  // NEW: State for the report options modal
  const [showReportOptionsModal, setShowReportOptionsModal] = useState(false);
  const [reportOptionsCandidate, setReportOptionsCandidate] = useState<string>('');
  // NEW: State for the view report modal
  const [showViewReportModal, setShowViewReportModal] = useState(false);
  const [viewReportData, setViewReportData] = useState<any>(null);

  // Derived counts for dashboard overview
  const { passedCount, failedCount, inProgressCount } = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let inProgress = 0;

    candidates.forEach(candidate => {
      const status = candidate.overallStatus || 'Pending';
      if (status === 'Completed') {
        if (candidate.secondRoundStatus === 'PASS') {
          passed++;
        } else {
          failed++;
        }
      } else {
        inProgress++;
      }
    });
    return {
      passedCount: passed,
      failedCount: failed,
      inProgressCount: inProgress,
    };
  }, [candidates]);

  // Filter candidates available for first-round scheduling
  const availableForSchedulingCandidates = useMemo(() => {
    return candidates.filter(c => !c.overallStatus || c.overallStatus === 'Pending');
  }, [candidates]);

  // Cell renderer components
  const StatusRenderer = (props: any) => {
    const status = props.value || 'Pending';
    const colorClass =
      status === 'Completed' ? 'bg-green-100 text-green-700 border border-green-200' :
      status === 'In Progress' ? 'text-white border' :
      status === 'Pending' ? 'text-white border' :
      'text-white border';

    const bgStyle =
      status === 'In Progress' ? { backgroundColor: '#56C5D0', borderColor: '#56C5D0' } :
      status === 'Pending' ? { backgroundColor: '#F58220', borderColor: '#F58220' } :
      status === 'Completed' ? {} :
      { backgroundColor: '#ED1C24', borderColor: '#ED1C24' };

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}
        style={bgStyle}
      >
        {status}
      </span>
    );
  };

  const loadCandidates = useCallback(async () => {
    try {
      const response = await hrAPI.getDashboard();
      setCandidates(response.data);
    } catch (error) {
      console.error('Operation failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }, []);

  const handleViewSummary = useCallback(async (candidateEmail: string) => {
    try {
      const response = await hrAPI.getInterviewSummary(candidateEmail);
      if (response.data) {
        setSelectedSummary({ ...response.data, candidateEmail });
        setShowSummaryModal(true);

        // Store the summary time if available
        if (response.data.summaryTime) {
          setSummaryTimes(prev => ({
            ...prev,
            [candidateEmail]: response.data.summaryTime
          }));
        }
      } else {
        toast.error('No summary data found');
      }
    } catch (error: any) {
      console.error('Operation failed:', error.response?.status || 'Unknown error');
      toast.error('No interview summary found');
    }
  }, []);

  const handleSelectCandidate = useCallback(async (candidateEmail: string) => {
    try {
      const response = await hrAPI.selectCandidate(candidateEmail);
      if (response.data.success) {
        toast.success(response.data.message);
        setShowSummaryModal(false);
        // Refresh candidates list
        await loadCandidates();
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to select candidate');
    }
  }, [loadCandidates]);

  const handleRejectCandidate = useCallback(async (candidateEmail: string) => {
    try {
      const response = await hrAPI.rejectCandidate(candidateEmail);
      if (response.data.success) {
        toast.success(response.data.message);
        setShowSummaryModal(false);
        // Refresh candidates list
        await loadCandidates();
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject candidate');
    }
  }, [loadCandidates]);

  // NEW: Function to view report without select/reject options
  const handleViewReport = useCallback(async (candidateEmail: string, round: 'first' | 'second' = 'first') => {
    try {
      const response = await hrAPI.getInterviewSummary(candidateEmail, round);
      if (response.data) {
        setViewReportData({ ...response.data, candidateEmail, round });
        setShowViewReportModal(true);
        setShowReportOptionsModal(false);
      } else {
        toast.error(`No ${round} round report data found`);
      }
    } catch (error: any) {
      console.error('Operation failed:', error.response?.status || 'Unknown error');
      toast.error(`No ${round} round interview report found`);
    }
  }, []);

  // UPDATED: This function now opens the second round scheduling modal
  const handleOpenScheduleModal = useCallback((candidateEmail: string) => {
    setCandidateEmail(candidateEmail);
    setShowScheduleModal(true);
  }, []);

  const handleBack = () => {
    dispatch(clearAuth());
    navigate('/auth/login');
  };

  const FirstRoundRenderer = useMemo(() => (props: any) => {
    const firstRoundStatus = props.data.firstRoundStatus;
    const interviewStatus = props.data.interviewStatus;
    const summaryStatus = props.data.summaryStatus;
    const candidateEmail = props.data.candidateEmail;

    if (firstRoundStatus === 'FAIL') {
      return (
        <span
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white border"
          style={{ backgroundColor: '#ED1C24', borderColor: '#ED1C24' }}
        >
          Fail
        </span>
      );
    }

    if (firstRoundStatus === 'PASS') {
      return (
        <span
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white border"
          style={{ backgroundColor: '#56C5D0', borderColor: '#56C5D0' }}
        >
          Pass
        </span>
      );
    }

    if (interviewStatus === 'Completed' && summaryStatus && !firstRoundStatus) {
      return (
        <button
          className="text-white px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#F58220' }}
          onClick={() => handleViewSummary(props.data.candidateEmail)}
        >
          View Summary
        </button>
      );
    }

    return <span className="text-slate-400 text-xs italic">Pending</span>;
  }, [handleViewSummary]);

  const ActionsRenderer = (props: any) => {
    return (
      <div className="flex gap-1.5">
        <button
          className="text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#56C5D0' }}
          onClick={() => handleViewCandidate(props.data.candidateEmail)}
          title="View Details"
        >
          View
        </button>
        <button
          className="text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#F58220' }}
          onClick={() => handleUpdateResume(props.data.candidateEmail)}
          title="Update Resume"
        >
          Update
        </button>
        <button
          className="text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#ED1C24' }}
          onClick={() => deleteCandidate(props.data.candidateName)}
          title="Delete Candidate"
        >
          Delete
        </button>
      </div>
    );
  };

  // UPDATED: SecondRoundRenderer with full logic for scheduling
  const SecondRoundRenderer = useMemo(() => (props: any) => {
    const {
      secondRoundInterviewerName,
      candidateEmail,
      secondRoundStatus,
      firstRoundStatus,
    } = props.data;

    if (firstRoundStatus === 'FAIL') {
      return <span className="text-slate-400 text-xs">-</span>;
    }

    if (secondRoundStatus === 'PASS') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white border"
              style={{ backgroundColor: '#56C5D0', borderColor: '#56C5D0' }}>
          Pass
        </span>
      );
    }

    if (secondRoundStatus === 'FAIL') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white border"
              style={{ backgroundColor: '#ED1C24', borderColor: '#ED1C24' }}>
          Fail
        </span>
      );
    }

    if (firstRoundStatus === 'PASS' && (!secondRoundStatus || secondRoundStatus === 'PENDING')) {
      return (
        <button
          className="text-white px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#F58220' }}
          onClick={() => handleOpenScheduleModal(candidateEmail)}
        >
          Schedule
        </button>
      );
    }

    if (secondRoundStatus === 'SCHEDULED' && secondRoundInterviewerName) {
      return (
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium">{secondRoundInterviewerName}</span>
          <button
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
            onClick={() => handleOpenScheduleModal(candidateEmail)}
          >
            Change
          </button>
        </div>
      );
    }

    return <span className="text-slate-400 text-xs italic">Pending</span>;
  }, [handleOpenScheduleModal]); // Dependency on the callback

  // UPDATED: ReportRenderer with new functionality to open report options modal
  const ReportRenderer = useMemo(() => (props: any) => {
    const { candidateEmail, summaryStatus, interviewStatus, firstRoundStatus, secondRoundStatus } = props.data;
    const summaryTime = summaryTimes[candidateEmail];

    if (interviewStatus === 'Completed' && summaryStatus) {
      return (
        <div className="flex flex-col items-center gap-1">

          {summaryTime && (
            <div className="text-xs text-slate-500">
              {new Date(summaryTime).toLocaleString()}
            </div>
          )}
          <button
            className="text-white px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 shadow-sm hover:opacity-90"
            style={{ backgroundColor: '#28a745' }}
            onClick={() => {
              setReportOptionsCandidate(candidateEmail);
              setShowReportOptionsModal(true);
            }}
            title="View Interview Reports"
          >
            Report
          </button>
        </div>
      );
    }

    return <span className="text-slate-400 text-xs italic">-</span>;
  }, [summaryTimes]);

  const columnDefs = useMemo(() => [
    {
      field: 'candidateName',
      headerName: 'Name',
      flex: 1,
      minWidth: 150,
      cellStyle: {
        fontWeight: '600',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }
    },
    {
      field: 'candidateEmail',
      headerName: 'Email',
      flex: 1.5,
      minWidth: 200,
      cellStyle: {
        color: '#4F46E5',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }
    },
    {
      field: 'positionApplied',
      headerName: 'Role',
      flex: 1,
      minWidth: 120,
      cellStyle: {
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }
    },
    {
      field: 'experienceYears',
      headerName: 'Experience',
      flex: 0.7,
      minWidth: 100,
      cellRenderer: (params: any) => `${params.value} `,
      cellStyle: {
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '500'
      }
    },
    {
      field: 'skills',
      headerName: 'Skills',
      flex: 1.2,
      minWidth: 150,
      tooltipField: 'skills',
      cellStyle: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }
    },
    {
      field: 'overallStatus',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 100,
      cellRenderer: StatusRenderer,
      cellStyle: {
        textAlign: 'center',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    },
    {
      field: 'firstRoundStatus',
      headerName: 'First Round',
      flex: 1,
      minWidth: 120,
      cellRenderer: FirstRoundRenderer,
      cellStyle: {
        textAlign: 'center',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    },
    {
      field: 'secondRoundStatus',
      headerName: 'Second Round',
      flex: 1,
      minWidth: 130,
      cellRenderer: SecondRoundRenderer,
      cellStyle: {
        textAlign: 'center',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    },
    {
      headerName: 'Report',
      field: 'report',
      flex: 1.2,
      minWidth: 150,
      cellRenderer: ReportRenderer,
      cellStyle: {
        textAlign: 'center',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      sortable: false,
      filter: false
    },
    {
      headerName: 'Actions',
      flex: 1.2,
      minWidth: 180,
      cellRenderer: ActionsRenderer,
      cellStyle: {
        textAlign: 'center',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      sortable: false,
      filter: false
    }
  ], [FirstRoundRenderer, SecondRoundRenderer, ReportRenderer]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    headerClass: 'center-header',
    suppressSizeToFit: false
  }), []);







  useEffect(() => {
    loadCandidates();
    const intervalId = setInterval(() => {
      loadCandidates();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [loadCandidates]);

  const handleUpdateResume = (candidateEmail: string) => {
    setUpdateCandidateEmail(candidateEmail);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.docx,.txt';
    fileInput.onchange = (e) => uploadUpdatedResume(e, candidateEmail);
    fileInput.click();
  };

  const handleViewCandidate = async (candidateEmail: string) => {
    try {
      const response = await hrAPI.getCandidateByEmail(candidateEmail);
      setSelectedCandidate(response.data);
      setShowViewCandidateModal(true);
    } catch (error) {
      console.error('Operation failed:', error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to load candidate details');
    }
  };

  const uploadUpdatedResume = async (e: any, candidateEmail: string) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('candidateEmail', candidateEmail);

    try {
      const response = await hrAPI.updateResume(formData);
      if (response.data.success) {
        toast.success('Resume updated successfully!');
        loadCandidates();
      }
    } catch (error: any) {
      console.error('Operation failed:', error.response?.status || 'Unknown error');
      alert(`Error: ${error.response?.data?.error || 'Failed to update resume'}`);
    }
  };

  const deleteCandidate = async (candidateName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${candidateName}?`)) {
      return;
    }

    try {
      await hrAPI.deleteCandidate(candidateName);
      toast.success('Candidate deleted successfully!');
      loadCandidates();
    } catch (error: any) {
      console.error('Operation failed:', error.response?.status || 'Unknown error');
      alert(`Error: ${error.response?.data?.message || 'Failed to delete candidate'}`);
    }
  };

  const handleCandidateAssigned = (link: string) => {
    setMagicLink(link);
    loadCandidates();
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Operation failed:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      dispatch(clearAuth());
      localStorage.clear();
      sessionStorage.clear();
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex justify-between items-center p-6 bg-white shadow-sm border-b border-slate-200 flex-shrink-0">
        <h1 className="text-3xl font-bold" style={{ color: '#F58220' }}>HR Dashboard</h1>
        <button
          onClick={handleLogout}
          className="text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#ED1C24' }}
        >
          Logout
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-6 pb-4 flex-shrink-0">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-3 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Quick Actions</h3>
          </div>
          <div className="p-4">
            <div className="flex gap-4">
              <button
                onClick={() => setShowScheduleInterviewModal(true)}
                className="text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm flex items-center gap-2 hover:opacity-90"
                style={{ backgroundColor: '#56C5D0' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule Interview
              </button>
              <button
                onClick={() => setShowAddCandidateModal(true)}
                className="text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm flex items-center gap-2 hover:opacity-90"
                style={{ backgroundColor: '#F58220' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Candidate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Candidates List - Takes remaining space */}
      <div className="flex-1 px-6 pb-6 min-h-0">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Candidates List</h2>
                <div className="flex gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Total: <span className="font-semibold text-slate-700">{candidates.length}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Passed: <span className="font-semibold text-slate-700">{passedCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span> In Progress: <span className="font-semibold text-slate-700">{inProgressCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Failed: <span className="font-semibold text-slate-700">{failedCount}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 p-4 min-h-0">
            <div className="ag-theme-alpine rounded-lg border border-slate-200 h-full w-full">
              <style>{`
                .center-header .ag-header-cell-label {
                  justify-content: center;
                }
                .ag-tooltip {
                  background-color: white !important;
                  color: black !important;
                  border: 1px solid #ccc !important;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
                }
              `}</style>
              <AgGridReact
                rowData={candidates}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={10}
                domLayout="normal"
                rowHeight={50}
                headerHeight={45}
                animateRows={true}
                suppressCellFocus={true}
                rowClass="hover:bg-gray-50"
                suppressRowHoverHighlight={false}
                onGridReady={(params) => {
                  setGridApi(params.api);
                  params.api.sizeColumnsToFit();
                }}
                onGridSizeChanged={(params) => {
                  params.api.sizeColumnsToFit();
                }}
                onFirstDataRendered={(params) => {
                  params.api.sizeColumnsToFit();
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {showAddCandidateModal && (
        <AddCandidateModal
          isOpen={showAddCandidateModal}
          onClose={() => setShowAddCandidateModal(false)}
          onCandidateAdded={loadCandidates}
        />
      )}

      {showScheduleInterviewModal && (
        <ScheduleInterviewModal
          isOpen={showScheduleInterviewModal}
          onClose={() => setShowScheduleInterviewModal(false)}
          candidates={availableForSchedulingCandidates}
          onInterviewScheduled={handleCandidateAssigned}
        />
      )}

      {/* CHANGE: Modal for scheduling the second round */}
      {showScheduleModal && (
        <ScheduleSecondRoundModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          candidateEmail={candidateEmail}
          onScheduled={loadCandidates}
        />
      )}

      {showViewCandidateModal && selectedCandidate && (
        <ViewCandidateModal
          isOpen={showViewCandidateModal}
          candidate={selectedCandidate}
          onClose={() => setShowViewCandidateModal(false)}
        />
      )}

      {showSummaryModal && selectedSummary && (
        <ViewSummaryModal
          isOpen={showSummaryModal}
          summary={selectedSummary}
          totalQuestions={questions.length}
          onClose={() => setShowSummaryModal(false)}
          onSelect={handleSelectCandidate}
          onReject={handleRejectCandidate}
          candidateEmail={selectedSummary.candidateEmail}
          interviewStatus={candidates.find(c => c.candidateEmail === selectedSummary.candidateEmail)?.interviewStatus}
        />
      )}

      {/* NEW: Report Options Modal */}
      {showReportOptionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">View Candidate Reports</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <span className="font-medium text-slate-700">First Round Report</span>
                  <button
                    className="px-4 py-2 text-white rounded-md text-sm font-medium transition-all duration-200 shadow-sm hover:opacity-90"
                    style={{ backgroundColor: '#56C5D0' }}
                    onClick={() => handleViewReport(reportOptionsCandidate, 'first')}
                  >
                    View
                  </button>
                </div>
              </div>
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowReportOptionsModal(false)}
                  className="px-6 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: View Report Modal (without select/reject options) */}
      {showViewReportModal && viewReportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-slate-800">
                  {viewReportData.round === 'first' ? 'First' : 'Second'} Round Interview Report
                </h3>
                <button
                  onClick={() => setShowViewReportModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                {/* Candidate Information */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-slate-800 mb-2">Candidate Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-slate-600">Email:</span>
                      <span className="ml-2 text-slate-800">{viewReportData.candidateEmail}</span>
                    </div>
                  </div>
                </div>

                {/* Questions and Answers */}
                <div>

                  <div className="space-y-4">
                    {viewReportData.questions?.map((q: any, index: number) => (
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
                {viewReportData.summary && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-800 mb-2">Overall Summary</h4>
                    <p className="text-sm text-slate-700">{viewReportData.summary}</p>
                  </div>
                )}

                {/* Score Information */}
                {viewReportData.score !== undefined && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-800 mb-2">Score</h4>
                    <div className="flex items-center">
                      <div className="text-2xl font-bold text-green-600">
                        {viewReportData.score}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowViewReportModal(false)}
                className="px-6 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to display the generated Magic Link */}
      {magicLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Interview Link Generated</h3>
              <p className="text-sm text-slate-600 mb-2">Share this secure link with the candidate:</p>
              <div className="flex items-center gap-2 p-2 bg-slate-100 border border-slate-300 rounded">
                <input
                  type="text"
                  value={magicLink}
                  readOnly
                  className="w-full bg-transparent outline-none text-slate-700"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(magicLink);
                    toast.success('Link copied to clipboard!');
                  }}
                  className="p-2 text-slate-500 hover:text-slate-800 transition-colors"
                  title="Copy to clipboard"
                >
                  <FaCopy />
                </button>
              </div>
              <div className="mt-6 text-right">
                <button onClick={() => setMagicLink(null)} className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;