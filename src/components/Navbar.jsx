import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ onMenuClick, onStateChange, selectedState, stateOptions, user, onLogout }) {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex h-20 items-center justify-between px-6">
        <div className="flex items-center gap-4">
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
          <div>
            <p className="text-sm font-medium text-gray-500">Predictive Analytics System</p>
            <h2 className="text-xl font-semibold text-gray-900">UrbanIQ Dashboard</h2>
          </div>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <label className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
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
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
            >
              Admin Data
            </Link>
          )}
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</p>
            <p className="text-xs capitalize text-gray-500">{user?.role}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm ring-4 ring-blue-50">
            {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-gray-800"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;