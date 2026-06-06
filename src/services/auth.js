import { loginRequest, logoutRequest, fetchSession } from './api.js';

const STORAGE_KEY = 'urbaniq_auth_v1';

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
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  return VALID_ROLES.has(normalized) ? normalized : USER_ROLES.USER;
};

export const isAdminRole = (role) => normalizeRole(role) === USER_ROLES.ADMIN;

const saveState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // ignore
  }
};

const readState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAuthState;
    const parsed = JSON.parse(raw);
    return {
      session: parsed.session || null,
      user: parsed.user || null,
      role: parsed.role || 'guest',
    };
  } catch (e) {
    return defaultAuthState;
  }
};

export const getInitialAuthState = async () => {
  const localState = readState();
  if (localState && localState.session) {
    const response = await fetchSession();
    if (!response.error && response.data?.is_authenticated) {
      const user = response.data.email 
        ? { email: response.data.email, name: response.data.email.split('@')[0] } 
        : localState.user;
      const state = {
        session: { user },
        user,
        role: normalizeRole(response.data.role),
      };
      saveState(state);
      return state;
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      return defaultAuthState;
    }
  }
  return defaultAuthState;
};

export const signInWithEmailPassword = async ({ email, password, name } = {}) => {
  if (name && String(name).trim()) {
    const userEmail = `${String(name).trim().toLowerCase()}@urbaniq.com`;
    const response = await loginRequest({ email: userEmail, password: 'user-default' });
    if (response.error) {
      return { data: null, error: response.error };
    }
    const user = { name: String(name).trim() };
    const state = { session: { user }, user, role: USER_ROLES.USER };
    saveState(state);
    return { data: state, error: null };
  }

  if (email && password) {
    const response = await loginRequest({ email, password });
    if (response.error) {
      return { data: null, error: response.error };
    }
    if (response.data && response.data.role === 'admin') {
      const user = { email: String(email).trim(), name: String(email).split('@')[0] };
      const state = { session: { user }, user, role: USER_ROLES.ADMIN };
      saveState(state);
      return { data: state, error: null };
    } else {
      return { data: null, error: 'Access denied. Administrator privileges required.' };
    }
  }

  return { data: null, error: 'Invalid credentials.' };
};

export const signUpWithEmailPassword = async () => {
  return { data: null, error: 'Signups are disabled for this demo.' };
};

export const signOutUser = async () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  await logoutRequest();
  return { error: null };
};

export const subscribeToAuthChanges = () => ({
  data: {
    subscription: {
      unsubscribe: () => {},
    },
  },
});

