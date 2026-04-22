import React from 'react';

function ZoneSelector({ selectedZone, zoneOptions, onZoneChange }) {
  return (
    <label className="flex w-full flex-col gap-2 sm:w-64">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected Zone</span>
      <select
        value={selectedZone}
        onChange={(event) => onZoneChange(event.target.value)}
        className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm outline-none transition-all duration-200 hover:border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      >
        {zoneOptions.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </select>
    </label>
  );
}

export default ZoneSelector;
