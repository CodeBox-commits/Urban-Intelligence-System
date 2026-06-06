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

export const getInitialAuthState = async () => readState();

export const signInWithEmailPassword = async ({ email, password, name } = {}) => {
  // Simple local auth rules for demo purposes
  // If a `name` is provided, create a regular user session (no password required)
  if (name && String(name).trim()) {
    const user = { name: String(name).trim() };
    const state = { session: { user }, user, role: USER_ROLES.USER };
    saveState(state);
    return { data: state, error: null };
  }

  // Admin login: allow two emails with same password
  const allowedAdmins = ['team19@urbaniq.com', 'admin@urbaniq.com'];
  if (email && password && allowedAdmins.includes(String(email).trim().toLowerCase()) && password === 'team19') {
    const user = { email: String(email).trim(), name: String(email).split('@')[0] };
    const state = { session: { user }, user, role: USER_ROLES.ADMIN };
    saveState(state);
    return { data: state, error: null };
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
  return { error: null };
};

export const subscribeToAuthChanges = () => ({
  data: {
    subscription: {
      unsubscribe: () => {},
    },
  },
});
