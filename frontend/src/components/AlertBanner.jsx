import React from 'react';

function AlertBanner({ alert }) {
  if (!alert) {
    return null;
  }

  const severityStyles = {
    critical: 'border-rose-200 bg-rose-50 text-rose-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${severityStyles[alert.severity] || severityStyles.warning}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{alert.type}</p>
      <p className="mt-1 text-base font-semibold">{alert.message}</p>
      {alert.zone && <p className="mt-1 text-sm opacity-80">Zone: {alert.zone}</p>}
    </div>
  );
}

export default AlertBanner;
