import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isSupabaseConfigured } from '../services/supabaseClient.js';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = new URLSearchParams(location.search).get('redirect') || '/dashboard';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const response = await login(form);

    if (response.error) {
      setError(response.error);
      setSubmitting(false);
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">UrbanIQ Access</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Login</h1>
      <p className="mt-2 text-sm leading-6 text-gray-500">
        Same email/password form for both user and admin accounts. Role is resolved after sign-in.
      </p>

      {!isSupabaseConfigured && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-700">
          Supabase environment variables are not configured yet.
        </div>
      )}

      {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-600">Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            placeholder="admin@urbaniq.in"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-600">Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            placeholder="Enter password"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {submitting ? 'Signing in...' : 'Login'}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <Link to="/signup" className="font-semibold text-blue-600 transition hover:text-blue-700">
          Create new account
        </Link>
        <Link to="/dashboard" className="font-semibold text-gray-600 transition hover:text-gray-900">
          Return to public dashboard
        </Link>
      </div>
    </div>
  );
}

export default Login;
