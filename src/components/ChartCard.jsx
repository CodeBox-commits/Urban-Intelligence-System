import React from 'react';

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="mb-5">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="h-72 w-full">{children}</div>
    </section>
  );
}

export default ChartCard;
