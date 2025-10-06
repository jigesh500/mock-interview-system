import React, { useEffect, useState ,useCallback} from 'react';
import Editor from "@monaco-editor/react";
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
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
  markQuestionAsAnswered
} from '../../redux/reducers/testSlice';

const StartTest: React.FC = () => {
  const dispatch = useAppDispatch();
  const { questions, currentQuestionIndex, answers, sessionId } = useAppSelector((state) => state.test);

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return <Typography>Loading question...</Typography>;

  const selectedAnswer = answers?.[currentQuestion.id] ?? "";
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const [currentLanguage, setCurrentLanguage] = useState('javascript');

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit function
const handleSubmit = useCallback(async () => {
  try {
    const answersPayload: { [key: string]: string } = {};
    questions.forEach((q, index) => {
      answersPayload["answer" + index] = answers[q.id] ?? "";
    });

    console.log("Submitting SessionId:", sessionId, "Answers:", answersPayload);

    const response = await axios.post(
      'http://localhost:8081/interview/submit-answers',
      answersPayload,
      { params: { sessionId: sessionId } }
    );

    if (response.data.status === "success") {
      alert("Interview submitted successfully!");
      setIsExamActive(false);
      window.location.href = '/thank-you';
    }
  } catch (error) {
    console.error("Error submitting interview:", error);
    alert("Failed to submit interview. Please try again.");
  }
}, [questions, answers, sessionId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      alert("Time is up! Submitting your test...");
      handleSubmit(); // Auto-submit when time runs out
      return;
    }

    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAnswerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(saveAnswer({ questionId: currentQuestion.id, answer: event.target.value }));
  };

// Check if all questions are answered
const allQuestionsAnswered = questions.every((q) => (answers[q.id] ?? "").trim() !== "");


  return (
    <Card className="h-full bg-white shadow-lg w-[1430px] mx-auto">
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
          {/* Submit button only on last question */}
          {currentQuestionIndex === questions.length - 1 && (
            <Box className="flex flex-col items-center">
              <Button
                variant="contained"
                color="error"
                onClick={handleSubmit}
                className="px-8 py-3 mt-4"
                disabled={!allQuestionsAnswered}   // disable if not all answered
              >
                Submit
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
  );
};

export default StartTest;
