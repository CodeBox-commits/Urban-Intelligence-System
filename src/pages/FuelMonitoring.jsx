import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard.jsx';
import DateRangeFilter from '../components/DateRangeFilter.jsx';
import ExportButtons from '../components/ExportButtons.jsx';
import KPICard from '../components/KPICard.jsx';
import LoadingSkeleton from '../components/LoadingSkeleton.jsx';
import NoDataState from '../components/NoDataState.jsx';
import Table from '../components/Table.jsx';
import ZoneSelector from '../components/ZoneSelector.jsx';
import { buildExportUrl, fetchFuelAnalytics, getDefaultDateRange } from '../services/api.js';

const fuelColumns = [
  { key: 'zone', header: 'Zone' },
  { key: 'date', header: 'Date' },
  { key: 'petrol_availability', header: 'Petrol' },
  { key: 'diesel_availability', header: 'Diesel' },
  { key: 'lpg_availability', header: 'LPG' },
  { key: 'ev_utilization', header: 'EV Usage' },
];

function FuelMonitoring({ selectedState }) {
  const [selectedZone, setSelectedZone] = useState(`All ${selectedState}`);
  const [filters, setFilters] = useState(getDefaultDateRange());
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedZone(`All ${selectedState}`);
  }, [selectedState]);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError('');
      const response = await fetchFuelAnalytics({
        state: selectedState,
        zone: selectedZone,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (response.error) {
        setError(response.error);
      }
      setAnalytics(response.data);
      setLoading(false);
    };

    loadAnalytics();
  }, [filters.endDate, filters.startDate, selectedState, selectedZone]);

  const zoneOptions = analytics?.zoneOptions || [`All ${selectedState}`];
  const lastUpdated = analytics?.lastUpdated ? new Date(analytics.lastUpdated).toLocaleString() : 'Unavailable';

  const handleFilterChange = ({ field, value }) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const exportParams = useMemo(
    () => ({
      dataset: 'fuel',
      state: selectedState,
      zone: selectedZone,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    [filters.endDate, filters.startDate, selectedState, selectedZone]
  );

  if (loading) {
    return <LoadingSkeleton lines={8} className="min-h-[420px]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Fuel Monitoring</h1>
          <p className="mt-1 text-sm text-gray-500">Urban fuel availability and EV utilization driven by admin-uploaded data.</p>
          <p className="mt-2 text-sm text-gray-500">Last updated: {lastUpdated}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ZoneSelector selectedZone={selectedZone} zoneOptions={zoneOptions} onZoneChange={setSelectedZone} />
          <DateRangeFilter startDate={filters.startDate} endDate={filters.endDate} onChange={handleFilterChange} />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard label="Petrol Availability" value={`${analytics?.petrolAvailability || 0}%`} helper="Average petrol availability" tone="amber" />
        <KPICard label="Diesel Availability" value={`${analytics?.dieselAvailability || 0}%`} helper="Average diesel availability" tone="orange" />
        <KPICard label="LPG Availability" value={`${analytics?.lpgAvailability || 0}%`} helper="Average LPG availability" tone="emerald" />
        <KPICard label="EV Utilization" value={`${analytics?.evUtilization || 0}%`} helper="Charging utilization coverage" tone="cyan" />
      </div>

      <div className="grid gap-6 xl:grid-cols-1">
        <ChartCard title="Fuel Trend" subtitle="Day-wise fuel availability and EV usage">
          {analytics?.trend?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="petrol_availability" stroke="#f59e0b" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="diesel_availability" stroke="#f97316" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="lpg_availability" stroke="#16a34a" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="ev_utilization" stroke="#2563eb" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No fuel trend available" />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Zone Fuel Snapshot" subtitle="Latest zone-wise energy availability">
        {analytics?.zoneBreakdown?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.zoneBreakdown} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="zone" axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
              <Tooltip />
              <Bar dataKey="petrol_availability" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              <Bar dataKey="diesel_availability" fill="#f97316" radius={[8, 8, 0, 0]} />
              <Bar dataKey="lpg_availability" fill="#16a34a" radius={[8, 8, 0, 0]} />
              <Bar dataKey="ev_utilization" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoDataState title="No fuel data available" />
        )}
      </ChartCard>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Fuel Records</h2>
            <p className="mt-1 text-sm text-gray-500">Dataset rows currently powering the fuel monitoring module.</p>
          </div>
          <ExportButtons
            onExportCsv={() => window.open(buildExportUrl({ ...exportParams, format: 'csv' }), '_blank')}
            onExportPdf={() => window.open(buildExportUrl({ ...exportParams, format: 'pdf' }), '_blank')}
          />
        </div>
        <Table columns={fuelColumns} data={analytics?.tableRows || []} />
      </section>
    </div>
  );
}

export default FuelMonitoring;
