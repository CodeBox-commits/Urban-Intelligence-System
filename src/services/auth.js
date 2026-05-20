import { supabase, isSupabaseConfigured } from './supabaseClient.js';

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

const getAppRoleFromUser = (user) => user?.app_metadata?.role || null;

export const resolveUserRole = async (user) => {
  if (!user) return USER_ROLES.GUEST;

  const appRole = getAppRoleFromUser(user);
  if (appRole) return normalizeRole(appRole);

  if (!isSupabaseConfigured || !supabase) {
    return USER_ROLES.USER;
  }

  try {
    const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!error && data?.role) {
      return normalizeRole(data.role);
    }
  } catch {
    return USER_ROLES.USER;
  }

  return USER_ROLES.USER;
};

export const getInitialAuthState = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return defaultAuthState;
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    return defaultAuthState;
  }

  return {
    session,
    user: session.user,
    role: await resolveUserRole(session.user),
  };
};

export const signInWithEmailPassword = async ({ email, password }) => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      session: data.session,
      user: data.user,
      role: await resolveUserRole(data.user),
    },
    error: null,
  };
};

export const signUpWithEmailPassword = async ({ email, password }) => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  const emailRedirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: USER_ROLES.USER,
      },
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      session: data.session,
      user: data.user,
      role: await resolveUserRole(data.user),
      needsEmailConfirmation: !data.session,
    },
    error: null,
  };
};

export const signOutUser = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return { error: null };
  }

  const { error } = await supabase.auth.signOut();
  return { error: error?.message || null };
};

export const subscribeToAuthChanges = (callback) => {
  if (!isSupabaseConfigured || !supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};
