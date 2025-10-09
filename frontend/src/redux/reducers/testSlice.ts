import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

export interface Question {
    id:string,
    type:string,
    question:string,
    options?:string[]
}

export interface TestState {
    userId:string,
    sessionId:string,
    questions: Question[],
    currentQuestionIndex: number,
    isLoading: boolean,
    error: string | null,
    markedQuestions:string[],

    answeredQuestions: string[]; // <-- Added
  isSubmitted: boolean;
  answers: { [questionId: string]: string | string[] }; 
  reviewedQuestions: string[]; // <-- Added
}

const initialState:TestState={
    userId:"",
    sessionId:"",
    questions:[],
    currentQuestionIndex:0,
    isLoading:false,
    error:null,
    markedQuestions:[],
    answeredQuestions:[], // <-- Added
    isSubmitted:false,
    answers:{},
    reviewedQuestions:[], // <-- Added
}

export const startTest = createAsyncThunk(
  'interview/startTest',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:8081/interview/start', {
        withCredentials: true,
      });
  console.log(response.data)
      return response.data; // { questions: Question[], userId: string }
    } catch (err: any) {
      return rejectWithValue('Failed to start interview');
    }
  }
);

const testSlice =createSlice({
name:'test',
initialState,
reducers:{
    setCurrentQuestionIndex:(state,action:PayloadAction<number>)=>{
        state.currentQuestionIndex=action.payload;
    },

    saveAnswer(state,action:PayloadAction<{questionId:string,answer:string | string[]}>){
        const prevAnswer = state.answers[action.payload.questionId];
        state.answers[action.payload.questionId] = action.payload.answer;
        // If already answered and answer is changed, mark as reviewed
        if (
            state.answeredQuestions.includes(action.payload.questionId) &&
            prevAnswer !== undefined &&
            prevAnswer !== action.payload.answer &&
            !state.reviewedQuestions.includes(action.payload.questionId)
        ) {
            state.reviewedQuestions.push(action.payload.questionId);
        }
    },
    markQuestionForReview:(state,action:PayloadAction<string>)=>{
        if (!state.markedQuestions.includes(action.payload)) {
            state.markedQuestions.push(action.payload);
        }
    },
    unmarkQuestionForReview:(state,action:PayloadAction<string>)=>{
        state.markedQuestions = state.markedQuestions.filter(id => id !== action.payload);
    },
    markQuestionAsAnswered:(state,action:PayloadAction<string>)=>{
        if (!state.answeredQuestions.includes(action.payload)) {
            state.answeredQuestions.push(action.payload);
        }
        // Remove from markedQuestions if present
        state.markedQuestions = state.markedQuestions.filter(id => id !== action.payload);
    },
    nextQuestion:(state)=>{
        if (state.currentQuestionIndex < state.questions.length - 1) {
            state.currentQuestionIndex += 1;
        }
    },
    previousQuestion:(state)=>{
        if (state.currentQuestionIndex > 0) {
            state.currentQuestionIndex -= 1;
        }
    }
},
extraReducers: (builder) => {
    builder
      .addCase(startTest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startTest.fulfilled, (state, action: PayloadAction<{ questions: Question[]; sessionId: string }>) => {
        state.isLoading = false;
        state.questions = action.payload.questions;
        state.sessionId = action.payload.sessionId;
      })
      .addCase(startTest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
    }

})
export const { setCurrentQuestionIndex, saveAnswer, markQuestionForReview, unmarkQuestionForReview, nextQuestion, previousQuestion, markQuestionAsAnswered } = testSlice.actions;
export default testSlice.reducer;