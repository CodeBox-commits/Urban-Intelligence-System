import React from 'react';

function AlertBox({ children }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-yellow-600">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            d="M12 4 21 20H3L12 4Zm0 5v4m0 4h.01"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </div>
      <p className="font-medium leading-6">{children}</p>
    </div>
  );
}

export default AlertBox;
