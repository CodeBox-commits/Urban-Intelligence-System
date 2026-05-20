import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getInitialAuthState,
  isAdminRole,
  resolveUserRole,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signOutUser,
  subscribeToAuthChanges,
} from '../services/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('guest');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const initialState = await getInitialAuthState();
      if (!isMounted) return;

      setSession(initialState.session);
      setUser(initialState.user);
      setRole(initialState.role);
      setAuthLoading(false);
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = subscribeToAuthChanges((event, nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user || null);

      setTimeout(async () => {
        if (!isMounted) return;

        if (!nextSession?.user) {
          setRole('guest');
          setAuthLoading(false);
          return;
        }

        const nextRole = await resolveUserRole(nextSession.user);
        if (!isMounted) return;
        setRole(nextRole);
        setAuthLoading(false);
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials) => {
    const response = await signInWithEmailPassword(credentials);

    if (!response.error && response.data) {
      setSession(response.data.session);
      setUser(response.data.user);
      setRole(response.data.role);
    }

    return response;
  };

  const logout = async () => {
    const response = await signOutUser();
    setSession(null);
    setUser(null);
    setRole('guest');
    return response;
  };

  const signup = async (credentials) => {
    const response = await signUpWithEmailPassword(credentials);

    if (!response.error && response.data?.session) {
      setSession(response.data.session);
      setUser(response.data.user);
      setRole(response.data.role);
    }

    return response;
  };

  const value = useMemo(
    () => ({
      session,
      user,
      role,
      authLoading,
      isAuthenticated: Boolean(session?.user),
      isAdmin: isAdminRole(role),
      login,
      signup,
      logout,
    }),
    [authLoading, role, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
