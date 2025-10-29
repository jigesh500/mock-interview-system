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
  CircularProgress
} from '@mui/material';
import {
  saveAnswer,
  nextQuestion,
  previousQuestion,
  markQuestionForReview,
  markQuestionAsAnswered,
  setQuestions,
  setSessionId as setReduxSessionId,
  resetTestState
} from '../../../redux/reducers/testSlice';
import TestSidebar from '../../../Components/candidate/TestSidebar';
import CameraMonitor from '../../../Components/CameraMonitor';
import MicrophoneMonitor from '../../../Components/MicrophoneMonitor';

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
  const [micReady, setMicReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeOutput, setCodeOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const handleSecurityViolation = useCallback(async (type: string, message: string) => {
    console.warn('Security violation:', type, message);
  }, []);

  const handleAudioViolation = useCallback(async (type: string, message: string) => {
    console.warn('Audio violation:', type, message);
    try {
      await interviewAPI.logEvent({
        sessionId,
        eventType: type,
        description: message,
        metadata: JSON.stringify({ timestamp: new Date().toISOString() })
      });
    } catch (err) {
      console.error('Error logging audio violation:', err);
    }
  }, [sessionId]);

  const { activateSecurity, deactivateSecurity } = useExamSecurity(handleSecurityViolation, sessionId, null);

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
        deactivateSecurity();
        (window as any).deactivateCameraSecurity?.();
        try {
                await fetch('http://localhost:8081/api/monitoring/log-event', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    sessionId,
                    candidateEmail: 'anonymous@interview.com', // Or get from state/redux
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
          dispatch(setQuestions(response.data.questions));
          dispatch(setReduxSessionId(response.data.sessionId));
        } catch (error) {
          console.error("Failed to start interview:", error);
          toast.error("Could not start the interview. The link may be invalid or expired.");
        }
      }
    }
    startInterview();
  }, [dispatch, urlSessionId]);

  useEffect(() => {
    if (questions.length > 0) {
      activateSecurity();
    }
  }, [questions.length, activateSecurity]);

  useEffect(() => {
    if (timeLeft <= 0) {
      toast.error("Time is up! Submitting your test...");
      handleSubmit();
      return;
    }

    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  if (!cameraReady || !micReady) {
    return (
      <>
        <Toaster position="top-center" />
        <Box className="flex justify-center items-center h-screen">
          <Card className="p-8 text-center">
            <Typography variant="h6" className="mb-4">
              📷🎤 Camera & Microphone Permission Required
            </Typography>
            <Typography className="mb-4">
              Please allow camera and microphone access to start your interview
            </Typography>
            <div className="space-y-4">
              <CameraMonitor
                sessionId={sessionId || ''}
                onCameraReady={setCameraReady}
              />
              <MicrophoneMonitor
                sessionId={sessionId || ''}
                onMicReady={setMicReady}
                onAudioViolation={handleAudioViolation}
                threshold={80}
              />
            </div>
          </Card>
        </Box>
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
  const selectedAnswer = answers?.[currentQuestion.id] ?? "";

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const allQuestionsAnswered = questions.every((q) => (answers[q.id] ?? "").trim() !== "");

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

    setIsExecuting(true);
    setCodeOutput('Executing...');
    
    const result = await executeCode(selectedAnswer, currentLanguage);
    
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
              <MicrophoneMonitor
                sessionId={sessionId}
                onMicReady={setMicReady}
                onAudioViolation={handleAudioViolation}
                threshold={80}
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
            <CardContent className="p-6">
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
                    <Typography variant="caption" component="div" color="text.secondary" className="font-bold">
                      {formatTime(timeLeft)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Question Content */}
              <Box className="mb-6">
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
                        onChange={(e) => setCurrentLanguage(e.target.value)}
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
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: "on",
                        automaticLayout: true,
                      }}
                    />
                    <Box className="p-3 bg-black text-green-400 font-mono text-sm min-h-[80px] border-t">
                      <div className="text-gray-300 mb-1">Output:</div>
                      <pre className="whitespace-pre-wrap">{codeOutput}</pre>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Navigation and Action Buttons */}
              <Box className="flex justify-between items-center">
                <Box className="space-x-2">
                  <Button
                    variant="outlined"
                    onClick={() => dispatch(previousQuestion())}
                    disabled={currentQuestionIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => dispatch(nextQuestion())}
                    disabled={currentQuestionIndex === questions.length - 1}
                  >
                    Next
                  </Button>
                </Box>

                <Box className="space-x-2">
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => dispatch(markQuestionForReview(currentQuestion.id))}
                  >
                    Mark for Review
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Interview"}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </>
  );
};

export default TestInterface;
