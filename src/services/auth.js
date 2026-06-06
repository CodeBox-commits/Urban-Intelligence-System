import axios from 'axios';

const SESSION_STORAGE_KEY = 'urbaniq-auth-session';

const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  timeout: 5000,
});

const defaultAuthState = {
  session: null,
  user: null,
  role: 'guest',
};

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
};

const VALID_ROLES = new Set(Object.values(USER_ROLES));

export const normalizeRole = (role) => {
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
  return VALID_ROLES.has(normalizedRole) ? normalizedRole : USER_ROLES.USER;
};

export const isAdminRole = (role) => normalizeRole(role) === USER_ROLES.ADMIN;

const readSession = () => {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveSession = (session) => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

const clearSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

const getErrorMessage = (error, fallback) => error?.response?.data?.detail || error?.message || fallback;

export const resolveUserRole = async (user) => normalizeRole(user?.role || USER_ROLES.USER);

export const getInitialAuthState = async () => {
  const session = readSession();

  if (!session?.user) {
    return defaultAuthState;
  }

  return {
    session,
    user: session.user,
    role: await resolveUserRole(session.user),
  };
};

export const signInWithEmailPassword = async ({ email, password }) => {
  try {
    const response = await authApi.post('/auth/login', { email, password });
    const session = response.data.session || { user: response.data.user };
    saveSession(session);

    return {
      data: {
        session,
        user: response.data.user,
        role: await resolveUserRole(response.data.user),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: getErrorMessage(error, 'Login failed.'),
    };
  }
};

export const signUpWithEmailPassword = async ({ email, password }) => {
  try {
    const response = await authApi.post('/auth/signup', { email, password });
    const session = response.data.session || { user: response.data.user };
    saveSession(session);

    return {
      data: {
        session,
        user: response.data.user,
        role: await resolveUserRole(response.data.user),
        needsEmailConfirmation: false,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: getErrorMessage(error, 'Signup failed.'),
    };
  }
};

export const signOutUser = async () => {
  clearSession();
  return { error: null };
};

export const subscribeToAuthChanges = () => ({
  data: {
    subscription: {
      unsubscribe: () => {},
    },
  },
});
