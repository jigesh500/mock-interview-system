// src/hooks/useAuth.ts
import { initiateAuth0Login, checkAuthStatus } from '../redux/reducers/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../redux/hooks';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading, redirectUrl } = useAppSelector(state => state.auth);

  const login = () => dispatch(initiateAuth0Login());
  const checkAuth = () => dispatch(checkAuthStatus());

  return { user, isAuthenticated, loading, redirectUrl, login, checkAuth };
};
