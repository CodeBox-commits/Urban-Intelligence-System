import React, { useState } from 'react';

function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin({
      name: name.trim() || (role === 'admin' ? 'Administrator' : 'Citizen User'),
      role,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">UrbanIQ Access</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">Choose your role to continue to the dashboard.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-700">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-700">Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            >
              <option value="user">User (View only)</option>
              <option value="admin">Admin (Manage area data)</option>
            </select>
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
