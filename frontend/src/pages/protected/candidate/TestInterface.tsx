import React, { useEffect, useState, useCallback } from 'react';
import Editor from "@monaco-editor/react";
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { useExamSecurity } from '../../../hooks/useExamSecurity';
import { useParams } from 'react-router-dom';
import { interviewAPI } from '../../../services/api';
import { executeCode } from '../../../services/codeExecution';
import toast, { Toaster } from 'react-hot-toast';
import {
  Card,
  CardContent,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  Box,
  Button,
  CircularProgress,
  Alert,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  saveAnswer,
  nextQuestion,
  previousQuestion,
  markQuestionForReview,
  setQuestions,
  setSessionId as setReduxSessionId,
  resetTestState
} from '../../../redux/reducers/testSlice';
import TestSidebar from '../../../Components/candidate/TestSidebar';
import CameraMonitor from '../../../Components/CameraMonitor';
import PreInterviewSetup from '../../../Components/PreInterviewSetup';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VoiceMonitorNew from '../../../Components/VoiceMonitorNew';

interface StartTestProps {
  onExamSubmit?: () => void;
}

const TestInterface: React.FC<StartTestProps> = ({ onExamSubmit }) => {
  const dispatch = useAppDispatch();
  const { questions, currentQuestionIndex, answers, sessionId } = useAppSelector((state) => state.test);
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();

  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [currentLanguage, setCurrentLanguage] = useState('javascript');
  const [cameraReady, setCameraReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeOutput, setCodeOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState<string>('');
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [voiceBaselineStored, setVoiceBaselineStored] = useState(false);

  const handleSecurityViolation = useCallback(async (type: string, message: string) => {
    console.warn('Security violation:', type, message);
     if (type === 'UNKNOWN_VOICE_DETECTED') {
        toast.error(`Voice Security Alert: ${message}`, {
          duration: 5000,
          icon: '🔴'
        });
      }
    }, []);

  const { activateSecurity, deactivateSecurity } = useExamSecurity(handleSecurityViolation, sessionId);
  
  const getJavaClassName = (code: string): string | null => {
    const match = code.match(/public\s+class\s+([a-zA-Z_$][\w$]*)/);
    return match ? match[1] : null;
  };

  // Prevent refresh, back navigation, and reload shortcuts
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (examSubmitted) return;
      event.preventDefault();
      event.returnValue = "Are you sure you want to leave? Your interview progress will be lost.";
    };

    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      window.history.pushState(null, "", window.location.href);
      toast.error("Back navigation is disabled during the interview.");
    };

    const disableKeys = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.key.toLowerCase() === "r") ||
        e.key === "F5"
      ) {
        e.preventDefault();
        toast.error("Refreshing is disabled during the interview.");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", disableKeys);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", disableKeys);
    };
  }, [examSubmitted]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const answersPayload: { [key: string]: string } = {};
      questions.forEach((q, index) => {
        answersPayload["answer" + index] = answers[q.id] ?? "";
      });

      const response = await interviewAPI.submitAnswers(answersPayload, sessionId);

      if (response.data.status === "success") {
        setExamSubmitted(true);
        deactivateSecurity();
        (window as any).deactivateCameraSecurity?.();
        try {
          await fetch('http://localhost:8081/api/monitoring/log-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              sessionId,
              eventType: 'INTERVIEW_END',
              description: 'Interview completed successfully',
              metadata: JSON.stringify({ submittedAt: new Date().toISOString() })
            })
          });
          console.log('INTERVIEW_END event logged successfully.');
        } catch (err) {
          console.error('Error logging interview end:', err);
        }

        toast.success("Interview submitted successfully!");
        if (onExamSubmit) onExamSubmit();
        setTimeout(() => {
          window.location.href = '/thank-you';
        }, 1500);
      }
    } catch (error) {
      console.error("Error submitting interview:", error);
      toast.error("Failed to submit interview. Please try again.");
      setIsSubmitting(false);
    }
  }, [questions, answers, sessionId, onExamSubmit, isSubmitting, deactivateSecurity]);

  useEffect(() => {
    const startInterview = async () => {
      if (urlSessionId) {
        try {
          dispatch(resetTestState());
          const response = await interviewAPI.startInterviewWithSession(urlSessionId);
          const currentSessionId = response.data.sessionId;
          dispatch(setQuestions(response.data.questions));
          dispatch(setReduxSessionId(currentSessionId));

          const emailResponse = await fetch(`http://localhost:8081/api/monitoring/session/${currentSessionId}/candidate`);
          if (emailResponse.ok) {
            const data = await emailResponse.json();
            setCandidateEmail(data.candidateEmail);
          } else {
            console.error("Failed to fetch candidate email");
          }

        } catch (error) {
          console.error("Failed to start interview:", error);
          toast.error("Could not start the interview. The link may be invalid or expired.");
        }
      }
    };
    startInterview();
  }, [dispatch, urlSessionId]);

  useEffect(() => {
    if (questions.length > 0 && voiceBaselineStored) {
      activateSecurity();
    }
  }, [questions.length, voiceBaselineStored, activateSecurity]);

  useEffect(() => {
    if (timeLeft <= 0) {
      toast.error("Time is up! Submitting your test...");
      handleSubmit();
      return;
    }

    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  useEffect(() => {
    if (questions[currentQuestionIndex]?.type === "Coding") {
      setCodeOutput('');
    }
  }, [currentQuestionIndex, questions]);
  
  useEffect(() => {
    const currentQuestion = questions[currentQuestionIndex];
    const selectedAnswer = currentQuestion ? answers?.[currentQuestion.id] ?? "" : "";

    if (currentQuestion?.type === "Coding" && currentLanguage === 'java' && !selectedAnswer.trim()) {
      const template = `public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n        System.out.println("Hello, World!");\n    }\n}`;
      dispatch(saveAnswer({ questionId: currentQuestion.id, answer: template }));
    }
  }, [currentLanguage, currentQuestionIndex, questions, answers, dispatch]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    const showDisabledToast = (action: string) => {
      toast.error(`${action} is disabled during the test.`);
    };

    editor.addAction({
      id: 'disable-paste',
      label: 'Paste',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
      run: () => showDisabledToast('Pasting')
    });

    editor.addAction({
      id: 'disable-cut',
      label: 'Cut',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX],
      run: () => showDisabledToast('Cutting')
    });

    editor.addAction({
      id: 'disable-copy',
      label: 'Copy',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
      run: () => showDisabledToast('Copying')
    });
  };

  // Show pre-interview setup if not completed
  if (!setupComplete) {
    return (
      <>
        <Toaster position="top-center" />
        <PreInterviewSetup
          sessionId={sessionId || ''}
          onSetupComplete={() => {
            setSetupComplete(true);
            setCameraReady(true);
          }}
        />
      </>
    );
  }

  // Show voice baseline capture screen if not stored yet
  if (!voiceBaselineStored) {
    return (
      <>
        <Toaster position="top-center" />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-center mb-8">Voice Setup Required</h1>
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-4">Setting up voice monitoring...</h2>
              <p className="text-gray-600 mb-6">
                Please wait while we capture your voice baseline for security monitoring.
              </p>
            </div>
            
            <div className="max-w-md mx-auto">
              <VoiceMonitorNew
                sessionId={sessionId || ''}
                candidateEmail={candidateEmail}
                onViolation={handleSecurityViolation}
                onBaselineStored={() => {
                  setVoiceBaselineStored(true);
                  toast.success('Voice setup complete! Starting interview...');
                }}
                skipBaselineCapture={false}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (questions.length === 0) {
    return (
      <>
        <Toaster position="top-center" />
        <Box className="flex justify-center items-center h-64">
          <CircularProgress />
          <Typography className="ml-4">Loading interview questions...</Typography>
        </Box>
      </>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = currentQuestion ? answers?.[currentQuestion.id] ?? "":"";

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const allQuestionsAnswered = questions.every((q) => (answers[q.id] ?? "").trim() !== "");
  const unansweredQuestions = questions.filter((q) => (answers[q.id] ?? "").trim() === "").length;
  const progressPercentage = ((questions.length - unansweredQuestions) / questions.length) * 100;

  const handleAnswerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(saveAnswer({ questionId: currentQuestion.id, answer: event.target.value }));
  };

  const handleCodeChange = (value: string | undefined) => {
    dispatch(saveAnswer({ questionId: currentQuestion.id, answer: value || "" }));
  };

  const handleExecuteCode = async () => {
    if (!selectedAnswer.trim()) {
      toast.error('Please write some code first');
      return;
    }
    
    if (currentLanguage === 'java') {
      const className = getJavaClassName(selectedAnswer);
      if (!className) {
        toast.error('For Java, please wrap your code in a "public class YourClassName { ... }" block.');
        return;
      }
    }

    setIsExecuting(true);
    setCodeOutput('Executing...');

    const className = currentLanguage === 'java' ? getJavaClassName(selectedAnswer) : undefined;
    const result = await executeCode(selectedAnswer, currentLanguage, className);

    if (result.error) {
      setCodeOutput(`Error: ${result.error}`);
    } else {
      setCodeOutput(result.output || 'No output');
    }

    setIsExecuting(false);
  };

  return (
    <>
      <Toaster position="top-center" />
      <Box className="flex h-screen bg-gray-100">
        {/* Left Panel - Camera + Sidebar */}
        <Box className="w-80 flex flex-col">
          {/* Camera & Microphone Monitor - Top */}
          <Box className="bg-white p-2 m-2 rounded shadow-lg">
            <Box className="w-full space-y-2">
              <CameraMonitor
                sessionId={sessionId}
                onCameraReady={setCameraReady}
                onInterviewEnd={() => {
                  deactivateSecurity();
                  (window as any).deactivateCameraSecurity?.();
                }}
              />
              <VoiceMonitorNew
                sessionId={sessionId || ''}
                candidateEmail={candidateEmail}
                onViolation={handleSecurityViolation}
                skipBaselineCapture={true}
              />
            </Box>
          </Box>

          {/* Sidebar - Below Camera */}
          <Box className="flex-1">
            <TestSidebar />
          </Box>
        </Box>

        {/* Main Content */}
        <Box className="flex-1 p-4">
          <Card className="h-full bg-white shadow-lg">
            <CardContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    p: 3,
                  }}
                >
              {/* Header with Circular Timer */}
              <Box className="mb-4 flex justify-between items-center">
                <Typography variant="h6" className="text-gray-600">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </Typography>

                <Box sx={{ position: "relative", display: "inline-flex" }}>
                  <CircularProgress
                    variant="determinate"
                    value={(timeLeft / (60 * 60)) * 100}
                    size={90}
                    thickness={5}
                    color={timeLeft <= 30 ? "error" : "primary"}
                  />
                  <Box
                    sx={{
                      top: 0, left: 0, bottom: 0, right: 0,
                      position: "absolute",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography variant="h6" component="div" color="text.secondary" className="font-bold">
                      {formatTime(timeLeft)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Progress Bar */}
              <Box className="mb-4">
                <Box className="flex justify-between items-center mb-1">
                  <Typography variant="body2" color="text.secondary">
                    Progress
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {questions.length - unansweredQuestions} of {questions.length} answered
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progressPercentage}
                  color={progressPercentage === 100 ? "success" : "primary"}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              {/* Question Content */}
              <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, pr: 1 }}>
                      <Typography variant="h6" className="mb-4 font-semibold">
                        {currentQuestion.question}
                      </Typography>

                {/* MCQ Questions */}
                {currentQuestion.type === "MCQ" && currentQuestion.options && (
                  <FormControl component="fieldset" className="w-full">
                    <RadioGroup
                      value={selectedAnswer}
                      onChange={handleAnswerChange}
                      className="space-y-2"
                    >
                      {currentQuestion.options.map((option, index) => (
                        <FormControlLabel
                          key={index}
                          value={option}
                          control={<Radio />}
                          label={option}
                          className="border rounded p-2 hover:bg-gray-50"
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                )}

                {/* Coding Questions */}
                {currentQuestion.type === "Coding" && (
                  <Box className="border rounded">
                    <Box className="flex justify-between items-center p-2 bg-gray-100 border-b">
                      <select
                        value={currentLanguage}
                        onChange={(e) => {
                          const newLanguage = e.target.value;
                          setCurrentLanguage(newLanguage);
                          
                          if (newLanguage === 'java') {
                            const template = `public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n        System.out.println("Hello, World!");\n    }\n}`;
                            dispatch(saveAnswer({ questionId: currentQuestion.id, answer: template }));
                          } else {
                            dispatch(saveAnswer({ questionId: currentQuestion.id, answer: "" }));
                          }
                        }}
                        className="px-2 py-1 border rounded"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                        <option value="c">C</option>
                      </select>
                      <button
                        onClick={handleExecuteCode}
                        disabled={isExecuting}
                        className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        {isExecuting ? 'Running...' : 'Run Code'}
                      </button>
                    </Box>
                    <Editor
                      height="300px"
                      language={currentLanguage}
                      value={selectedAnswer}
                      onChange={handleCodeChange}
                      theme="vs-dark"
                      onMount={handleEditorDidMount}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: "on",
                        automaticLayout: true,
                        contextmenu: false,
                      }}
                    />
                    <Box className="p-3 bg-black text-green-400 font-mono text-sm min-h-[80px] border-t">
                      <div className="text-gray-300 mb-1">Output:</div>
                      <pre className="whitespace-pre-wrap">{codeOutput}</pre>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Enhanced Warning Message */}
              {!allQuestionsAnswered && (
                <Box className="mb-4">
                  <Alert
                    severity="warning"
                    icon={<WarningAmberIcon fontSize="inherit" />}
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" fontWeight="medium">
                      {unansweredQuestions} question{unansweredQuestions > 1 ? 's' : ''} remaining
                    </Typography>
                    <Typography variant="caption" display="block">
                      Complete all questions to enable submission
                    </Typography>
                  </Alert>
                </Box>
              )}

              {/* Navigation and Action Buttons */}
              <Box className="flex items-center justify-between">
                <Box className="flex space-x-2">
                  <Button
                    variant="outlined"
                    onClick={() => dispatch(previousQuestion())}
                    disabled={currentQuestionIndex === 0}
                  >
                    Previous
                  </Button>
                </Box>

                <Box className="flex-1 flex justify-center">
                  <Tooltip
                    title={!allQuestionsAnswered ?
                      `You have ${unansweredQuestions} unanswered question${unansweredQuestions > 1 ? 's' : ''}. Please answer all questions before submitting.` :
                      "Submit your interview"
                    }
                    placement="top"
                  >
                    <span>
                      <Button
                        variant="contained"
                        color="success"
                        size="large"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !allQuestionsAnswered}
                        sx={{ px: 6, py: 1.5 }}
                      >
                        {isSubmitting ? "Submitting..." : "Submit Interview"}
                      </Button>
                    </span>
                  </Tooltip>
                </Box>

                <Button
                  variant="outlined"
                  onClick={() => dispatch(nextQuestion())}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-[9999]">
          <div className="bg-white px-8 py-6 rounded-lg shadow-lg flex flex-col items-center">
            <CircularProgress color="primary" />
            <Typography variant="h6" className="mt-3 font-semibold text-gray-700">
              Submitting your interview...
            </Typography>
            <Typography variant="body2" color="text.secondary" className="mt-1">
              Please wait, do not close or refresh this window.
            </Typography>
          </div>
        </div>
      )}
    </>
  );
};

export default TestInterface;