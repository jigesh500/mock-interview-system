import React, { useEffect, useState, useCallback } from 'react';
import Editor from "@monaco-editor/react";
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { useAuth } from '../../../hooks/useAuth';
import { useExamSecurity } from '../../../hooks/useExamSecurity';
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
  startTest
} from '../../../redux/reducers/testSlice';
import TestSidebar from '../../../Components/candidate/TestSidebar';
import CameraMonitor from '../../../Components/CameraMonitor';
import MicrophoneMonitor from '../../../Components/MicrophoneMonitor';

interface StartTestProps {
  onExamSubmit?: () => void;
}

const StartTest: React.FC<StartTestProps> = ({ onExamSubmit }) => {

  const dispatch = useAppDispatch();
  const { questions, currentQuestionIndex, answers, sessionId } = useAppSelector((state) => state.test);
  const { isAuthenticated, authLoading, user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [currentLanguage, setCurrentLanguage] = useState('javascript');
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [isSubmitting,setIsSubmitting] =useState(false)

  // Security violation handler
  const handleSecurityViolation = useCallback(async (type: string, message: string) => {
    console.warn('Security violation:', type, message);
    //alert(`⚠️ Security Alert: ${message}`);
  }, [])

  // Audio violation handler
  const handleAudioViolation = useCallback(async (type: string, message: string) => {
    console.warn('Audio violation:', type, message);
    
    try {
      await fetch('http://localhost:8081/api/monitoring/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          candidateEmail: user?.email,
          eventType: type,
          description: message,
          metadata: JSON.stringify({ timestamp: new Date().toISOString() })
        })
      });
    } catch (err) {
      console.error('Error logging audio violation:', err);
    }
  }, [sessionId, user?.email]);

  const { activateSecurity, deactivateSecurity } = useExamSecurity(handleSecurityViolation,sessionId,user?.email);

  // Submit function
  const handleSubmit = useCallback(async () => {
    const allQuestionsAnswered = questions.every((q) => (answers[q.id] ?? "").trim() !== "");
    if (isSubmitting) return; //

      setIsSubmitting(true);

    try {
      const answersPayload: { [key: string]: string } = {};
      questions.forEach((q, index) => {
        answersPayload["answer" + index] = answers[q.id] ?? "";
      });

      const response = await axios.post(
        'http://localhost:8081/interview/submit-answers',
        answersPayload,
        {
          params: { sessionId: sessionId },
          withCredentials: true
        }
      );

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
                        candidateEmail: user.email,
                        eventType: 'INTERVIEW_END',
                        description: 'Interview completed successfully',
                        metadata: JSON.stringify({ submittedAt: new Date().toISOString() })
                      })
                    });
                    await new Promise(resolve => setTimeout(resolve, 700));
                  } catch (err) {
                    console.error('Error logging interview end:', err);
                  }

        alert("Interview submitted successfully!");
        if (onExamSubmit) onExamSubmit();
        window.location.href = '/thank-you';
      }
    } catch (error) {
      console.error("Error submitting interview:", error);
      alert("Failed to submit interview. Please try again.");
      setIsSubmitting(false);
    }
  }, [questions, answers, sessionId, onExamSubmit, user, isSubmitting]);

  useEffect(() => {
    if (isAuthenticated && questions.length === 0) {
      dispatch(startTest());
    }
  }, [dispatch, questions.length, isAuthenticated]);

  // Activate exam security when test starts
  useEffect(() => {
    if (isAuthenticated && questions.length > 0) {
      activateSecurity();
    }
  }, [isAuthenticated, questions.length, activateSecurity]);

  useEffect(() => {
    if (timeLeft <= 0) {
      alert("Time is up! Submitting your test...");
      handleSubmit();
      return;
    }

    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  if (authLoading) {
    return (
      <Box className="flex justify-center items-center h-64">
        <CircularProgress />
        <Typography className="ml-4">Checking authentication...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box className="flex justify-center items-center h-64">
        <Typography className="ml-4">Please log in to start the interview.</Typography>
      </Box>
    );
  }

if (!cameraReady || !micReady) {
    return (
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
    );
  }

  if (questions.length === 0) {
    return (
      <Box className="flex justify-center items-center h-64">
        <CircularProgress />
        <Typography className="ml-4">Loading interview questions...</Typography>
      </Box>
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

  return (
    <Box className="flex h-screen bg-gray-100">
      {/* Left Panel - Camera + Sidebar */}
      <Box className="w-80 flex flex-col">
        {/* Camera & Microphone Monitor - Top */}
        <Box className="bg-white p-2 m-2 rounded shadow-lg">
          <Box className="w-full space-y-2">
            <CameraMonitor sessionId={sessionId}
            onCameraReady={setCameraReady}
            onInterviewEnd={() => {
                deactivateSecurity();
                (window as any).deactivateCameraSecurity?.();
              }}/>
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
                  value={(timeLeft / (15 * 60)) * 100}
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
                    fontWeight: "bold",
                    fontSize: "1.5rem",
                    color: timeLeft <= 30 ? "red" : "inherit",
                    transition: "color 0.3s"
                  }}
                >
                  {formatTime(timeLeft)}
                </Box>
              </Box>
            </Box>

            {/* Progress Bar */}
            <div className="bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question */}
            <Typography variant="h5" className="mb-6 font-semibold leading-relaxed" sx={{ minHeight: 120 }}>
              {currentQuestion.question}
            </Typography>

            {/* Question Type */}
            {currentQuestion.type?.toLowerCase() === 'mcq' ? (
              <FormControl component="fieldset" className="w-full">
                <RadioGroup
                  value={selectedAnswer}
                  onChange={handleAnswerChange}
                  name={`question-${currentQuestion.id}`}
                >
                  {currentQuestion.options?.map((option, index) => (
                    <FormControlLabel
                      key={index}
                      value={option}
                      control={<Radio color="primary" />}
                      label={<Typography variant="body1">{option}</Typography>}
                      sx={{
                        margin: 0,
                        width: '100%',
                        border: selectedAnswer === option ? '2px solid #1976d2' : '1px solid #e0e0e0',
                        borderRadius: '8px',
                      }}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            ) : currentQuestion.type?.toLowerCase() === 'coding' ? (
              <Box className="w-full">
                <Typography variant="subtitle1" className="mb-2 font-medium">Write your code:</Typography>
                <Editor
                  height="300px"
                  language={currentLanguage}
                  value={selectedAnswer}
                  onChange={(value) => dispatch(saveAnswer({ questionId: currentQuestion.id, answer: value || "" }))}
                  theme="vs-dark"
                  options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
                />
              </Box>
            ) : (
              <Typography color="error">Unknown question type</Typography>
            )}

            {/* Navigation & Submit */}
            <Box className="mt-8 flex flex-col items-center gap-4">
              <Box className="flex justify-between w-full max-w-xl">
                <Button
                  variant="outlined"
                  onClick={() => dispatch(previousQuestion())}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-2"
                >
                  Previous
                </Button>

                <Box className="flex gap-3">
                  <Button
                    variant="contained"
                    color="info"
                    onClick={() => dispatch(markQuestionForReview(currentQuestion.id))}
                    className="px-6 py-2"
                  >
                    {currentQuestionIndex === questions.length - 1 ? "Mark as Review" : "Mark for Review & Next"}
                  </Button>

                  {currentQuestionIndex !== questions.length - 1 && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        if (selectedAnswer) dispatch(markQuestionAsAnswered(currentQuestion.id));
                        dispatch(nextQuestion());
                      }}
                      className="px-6 py-2"
                    >
                      Next
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Submit button only on last question */}
              {currentQuestionIndex === questions.length - 1 && (
                <Box className="flex flex-col items-center">
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleSubmit}
                    className="px-8 py-3 mt-4"
                    disabled={!allQuestionsAnswered || isSubmitting} // 👈 disabled while submitting
                  >
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Submit"}
                  </Button>


                  {!allQuestionsAnswered && (
                    <Typography color="error" className="mt-2 text-sm">
                      You must attempt all questions before submitting.
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default StartTest;
