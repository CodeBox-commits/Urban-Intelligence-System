import React from 'react';

function NoDataState({ title = 'No data available', description = 'Try adjusting the filters or upload fresh data.' }) {
  return (
    <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">{description}</p>
    </div>
  );
}

export default NoDataState;
