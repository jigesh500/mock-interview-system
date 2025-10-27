import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { RootState } from '../store';

// Interface for a single question
export interface Question {
    id: string;
    type: string;
    question: string;
    options?: string[];
}

// The shape of the state for this slice
export interface TestState {
    sessionId: string | null;
    questions: Question[];
    currentQuestionIndex: number;
    isLoading: boolean;
    error: string | null;
    answers: { [questionId: string]: string | string[] };
    // Tracking for the sidebar
    markedForReview: string[];
    answeredQuestions: string[];
}

// The initial state when the app loads or when the test is reset
const initialState: TestState = {
    sessionId: null,
    questions: [],
    currentQuestionIndex: 0,
    isLoading: false,
    error: null,
    answers: {},
    markedForReview: [],
    answeredQuestions: [],
};

const testSlice = createSlice({
    name: 'test',
    initialState,
    // Reducers are functions that define how the state can be updated
    reducers: {
        // Resets the entire test state to its initial values.
        // Crucial for when a candidate opens a new exam link.
        resetTestState: () => {
            return initialState;
        },

        // Sets the questions for the test, received from the API call.
        setQuestions: (state, action: PayloadAction<Question[]>) => {
            state.questions = action.payload;
            state.currentQuestionIndex = 0;
            state.answers = {}; // Reset answers when new questions are set
            state.isLoading = false;
        },

        // Stores the session ID for the current test.
        setSessionId: (state, action: PayloadAction<string>) => {
            state.sessionId = action.payload;
        },

        // Saves the candidate's answer for a specific question.
        saveAnswer: (state, action: PayloadAction<{ questionId: string; answer: string | string[] }>) => {
            const { questionId, answer } = action.payload;
            state.answers[questionId] = answer;

            // Automatically mark the question as answered when an answer is saved.
            if (!state.answeredQuestions.includes(questionId)) {
                state.answeredQuestions.push(questionId);
            }
        },

        // Moves to the next question in the list.
        nextQuestion: (state) => {
            if (state.currentQuestionIndex < state.questions.length - 1) {
                state.currentQuestionIndex += 1;
            }
        },

        // Moves to the previous question in the list.
        previousQuestion: (state) => {
            if (state.currentQuestionIndex > 0) {
                state.currentQuestionIndex -= 1;
            }
        },

        // Jumps directly to a specific question index (for the sidebar).
        setCurrentQuestionIndex: (state, action: PayloadAction<number>) => {
            state.currentQuestionIndex = action.payload;
        },

        // Toggles the "Mark for Review" status for a question.
        markQuestionForReview: (state, action: PayloadAction<string>) => {
            const questionId = action.payload;
            const index = state.markedForReview.indexOf(questionId);
            if (index > -1) {
                // If already marked, unmark it
                state.markedForReview.splice(index, 1);
            } else {
                // Otherwise, mark it
                state.markedForReview.push(questionId);
            }
        },

        // Adds a question to the list of answered questions.
        markQuestionAsAnswered: (state, action: PayloadAction<string>) => {
            const questionId = action.payload;
            if (!state.answeredQuestions.includes(questionId)) {
                state.answeredQuestions.push(questionId);
            }
        },
    },
});

// Export the actions so they can be used in components
export const {
    resetTestState,
    setQuestions,
    setSessionId,
    saveAnswer,
    nextQuestion,
    previousQuestion,
    setCurrentQuestionIndex,
    markQuestionForReview,
    markQuestionAsAnswered,
} = testSlice.actions;

// Export the reducer to be included in the Redux store
export default testSlice.reducer;