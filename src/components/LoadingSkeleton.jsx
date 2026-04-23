import React from 'react';

function LoadingSkeleton({ lines = 3, className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}>
      <div className="animate-pulse space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={`skeleton-${index + 1}`}
            className={`rounded-full bg-gray-100 ${index === 0 ? 'h-5 w-1/3' : 'h-4 w-full'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default LoadingSkeleton;
