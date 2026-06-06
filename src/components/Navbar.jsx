import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ onMenuClick, onStateChange, selectedState, stateOptions, user, role, onLogout }) {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex h-20 items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            className="rounded-xl border border-gray-100 bg-white p-2.5 text-gray-600 shadow-sm transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-500">Predictive Analytics System</p>
            <h2 className="truncate text-xl font-semibold text-gray-900">UrbanIQ Dashboard</h2>
          </div>
        </div>

<<<<<<< HEAD
        <div className="hidden shrink-0 items-center gap-5 md:flex">
          <label className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
=======
        <div className="hidden min-w-0 items-center gap-3 md:flex">
          <label className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
>>>>>>> 04cffbe3dfa6d91461a08109e6202a210fa78ffc
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">State</span>
            <select
              value={selectedState}
              onChange={(event) => onStateChange(event.target.value)}
              className="bg-transparent text-sm font-semibold text-gray-800 outline-none"
            >
              {stateOptions.map((option) => (
                <option key={option.state} value={option.state}>
                  {option.state}
                </option>
              ))}
            </select>
          </label>
<<<<<<< HEAD
          <div className="min-w-20 max-w-32 text-right lg:max-w-40">
            <p className="truncate text-sm font-semibold text-gray-900" title={user.name}>
              {user.name}
            </p>
            <p className="text-xs capitalize text-gray-500">{user.role}</p>
=======
          {role === 'admin' && (
            <Link
              to="/admin"
              className="shrink-0 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
            >
              Admin Panel
            </Link>
          )}
          <div className="min-w-0 max-w-32 text-right lg:max-w-44">
            <p className="truncate text-sm font-semibold text-gray-900">{user?.email || 'User'}</p>
            <p className="text-xs capitalize text-gray-500">{role}</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm ring-4 ring-blue-50">
            {(user?.email?.[0] || 'U').toUpperCase()}
>>>>>>> 04cffbe3dfa6d91461a08109e6202a210fa78ffc
          </div>
          <button
            type="button"
            onClick={onLogout}
<<<<<<< HEAD
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
=======
            className="shrink-0 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-gray-800"
>>>>>>> 04cffbe3dfa6d91461a08109e6202a210fa78ffc
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
