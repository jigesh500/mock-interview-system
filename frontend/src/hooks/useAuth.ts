// src/hooks/useAuth.ts
import { useEffect } from 'react';

import { checkAuthStatus, initiateAuth0Login } from '../redux/reducers/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../redux/hooks';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading, redirectUrl } = useAppSelector(state => state.auth);

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  const login = () => dispatch(initiateAuth0Login());

  return { user, isAuthenticated, loading, redirectUrl, login };
};
