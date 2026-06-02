import React from 'react';

function ExportButtons({ onExportCsv, onExportPdf }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onExportCsv}
        className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
      >
        Export CSV
      </button>
      <button
        type="button"
        onClick={onExportPdf}
        className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
      >
        Export PDF
      </button>
    </div>
  );
}

export default ExportButtons;
