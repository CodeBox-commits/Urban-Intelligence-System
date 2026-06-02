import React from 'react';

const toneClasses = {
  amber: {
    icon: 'bg-amber-50 text-amber-600 ring-amber-100',
    accent: 'text-amber-600',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    accent: 'text-emerald-600',
  },
  orange: {
    icon: 'bg-orange-50 text-orange-600 ring-orange-100',
    accent: 'text-orange-600',
  },
  rose: {
    icon: 'bg-rose-50 text-rose-600 ring-rose-100',
    accent: 'text-rose-600',
  },
  cyan: {
    icon: 'bg-blue-50 text-blue-600 ring-blue-100',
    accent: 'text-blue-600',
  },
  slate: {
    icon: 'bg-gray-100 text-gray-600 ring-gray-200',
    accent: 'text-gray-600',
  },
};

const icons = {
  aqi: (
    <path
      d="M4 14.5a4.5 4.5 0 0 1 6.7-3.9A5.5 5.5 0 0 1 21 13.5a3.5 3.5 0 0 1-3.5 3.5H8.5A4.5 4.5 0 0 1 4 14.5Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  ),
  water: (
    <path
      d="M12 3s6 6.1 6 10.2A6 6 0 0 1 6 13.2C6 9.1 12 3 12 3Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  ),
  risk: (
    <path
      d="M12 4 21 20H3L12 4Zm0 5v4m0 4h.01"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  ),
  alerts: (
    <path
      d="M15 17H9m9-2V11a6 6 0 0 0-12 0v4l-2 2h16l-2-2Zm-4 4a2 2 0 0 1-4 0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  ),
  default: (
    <path
      d="M4 19V5m5 14V9m5 10V3m5 16v-7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  ),
};

const getIconKey = (label) => {
  const normalized = label.toLowerCase();

  if (normalized.includes('aqi') || normalized.includes('air')) return 'aqi';
  if (normalized.includes('water')) return 'water';
  if (normalized.includes('risk') || normalized.includes('accident')) return 'risk';
  if (normalized.includes('alert')) return 'alerts';

  return 'default';
};

function TrendBadge({ trend }) {
  if (!trend || typeof trend.delta === 'undefined') {
    return null;
  }

  const directionStyles = {
    up: 'bg-rose-50 text-rose-600',
    down: 'bg-emerald-50 text-emerald-600',
    flat: 'bg-gray-100 text-gray-600',
  };

  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '•';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${directionStyles[trend.direction] || directionStyles.flat}`}>
      <span>{arrow}</span>
      <span>{trend.delta}%</span>
    </span>
  );
}

function KPICard({ label, value, helper, tone = 'cyan', trend }) {
  const styles = toneClasses[tone] || toneClasses.cyan;
  const icon = icons[getIconKey(label)];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={`mt-3 break-words text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl ${styles.accent}`}>
            {value}
          </p>
          <div className="mt-3">
            <TrendBadge trend={trend} />
          </div>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${styles.icon}`}>
          <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
            {icon}
          </svg>
        </div>
      </div>
      {helper && <p className="mt-4 text-sm leading-6 text-gray-500">{helper}</p>}
    </div>
  );
}

export default KPICard;
