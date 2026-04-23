import React from 'react';

function DateRangeFilter({ startDate, endDate, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Start Date</span>
        <input
          type="date"
          value={startDate}
          onChange={(event) => onChange({ field: 'startDate', value: event.target.value })}
          className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">End Date</span>
        <input
          type="date"
          value={endDate}
          onChange={(event) => onChange({ field: 'endDate', value: event.target.value })}
          className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
        />
      </label>
    </div>
  );
}

export default DateRangeFilter;
