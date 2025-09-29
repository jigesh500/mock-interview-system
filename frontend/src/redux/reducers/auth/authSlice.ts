import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';


// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'hr' | 'candidate';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  redirectUrl: string | null;
}

// Initial State
const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  redirectUrl: null,
};

// Async Thunks
export const initiateAuth0Login = createAsyncThunk(
  'auth/initiateAuth0Login',
  async (_, { rejectWithValue }) => {
    try {
      // Redirect to Auth0 login
      window.location.href = 'http://localhost:8081/oauth2/authorization/auth0';
      return null;
    } catch (err: any) {
      return rejectWithValue('Failed to initiate login');
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('http://localhost:8081/api/auth/user', { 
        withCredentials: true 
      });
  console.log('Auth Status Response:', response.data);
      return response.data; // Should return { user: User, authenticated: boolean }
    } catch (err: any) {
      return rejectWithValue('Not authenticated');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await axios.get('http://localhost:8081/hr/logout', {
        withCredentials: true
      });
      return null;
    } catch (err: any) {
      // Even if logout fails, clear the state
      return null;
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearRedirectUrl(state) {
      state.redirectUrl = null;
    },
clearAuth(state) {
    state.user = null;
    state.isAuthenticated = false;
    state.redirectUrl = null;
    state.error = null;
    state.loading = false;
  },
  },
  extraReducers: (builder) => {
    builder
      // Initiate Auth0 Login
      .addCase(initiateAuth0Login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiateAuth0Login.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(initiateAuth0Login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Check Auth Status
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action: PayloadAction<{ user: User, authenticated: boolean }>) => {
        state.loading = false;
        if (action.payload.authenticated) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
          // Role-based redirect
          if (action.payload.user.role === 'hr') {
            state.redirectUrl = '/hr/dashboard';
          } else if (action.payload.user.role === 'candidate') {
            state.redirectUrl = '/interview/start';
          }
        }
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
      })
      // Logout
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.redirectUrl = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearRedirectUrl, clearAuth } = authSlice.actions;
export default authSlice.reducer;
