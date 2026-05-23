import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const baseLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { name: 'Water Quality', path: '/water', icon: 'water' },
  { name: 'Air Quality', path: '/air', icon: 'air' },
  { name: 'Resource Monitor', path: '/resources', icon: 'resources' },
  { name: 'Accidents', path: '/accidents', icon: 'accidents' },
];

const iconPaths = {
  dashboard: 'M4 13h6V5H4v8Zm10 6h6V5h-6v14ZM4 19h6v-4H4v4Z',
  water: 'M12 3s6 6.1 6 10.2A6 6 0 0 1 6 13.2C6 9.1 12 3 12 3Z',
  resources: 'M4 7h16v10H4V7Zm2 2v6h12V9H6Zm3 2h2v2H9v-2Zm4 0h2v2h-2v-2Z',
  accidents: 'M12 4 21 20H3L12 4Zm0 5v4m0 4h.01',
  upload: 'M12 16V8m0 0-3.5 3.5M12 8l3.5 3.5M5 18h14',
};

function SidebarIcon({ name }) {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={iconPaths[name]}
        fill={name === 'dashboard' ? 'currentColor' : 'none'}
        stroke={name === 'dashboard' ? 'none' : 'currentColor'}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function Sidebar({ isOpen, onClose }) {
  const { role } = useAuth();
  const links = role === 'admin' ? [...baseLinks, { name: 'Admin Upload', path: '/admin/upload', icon: 'upload' }] : baseLinks;

  const linkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
      isActive
        ? 'bg-blue-100 text-blue-600 shadow-sm'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
    ].join(' ');

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-gray-950/40 transition lg:hidden ${
          isOpen ? 'block' : 'hidden'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-100 bg-white px-4 py-6 shadow-sm transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-9 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-base font-bold text-white shadow-sm">
              UI
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900">UrbanIQ</h1>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                Smart City Analytics
              </p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="m6 6 12 12M18 6 6 18"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>

        <nav className="space-y-3">
          {links.map((link) => (
            <NavLink key={link.path} to={link.path} className={linkClass} onClick={onClose}>
              <SidebarIcon name={link.icon} />
              <span>{link.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-6 left-4 right-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-700">Urban Intelligence</p>
          <p className="mt-1 text-xs leading-5 text-blue-600/80">
            Predictive insights for cleaner, safer city operations.
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
