import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard.jsx';
import DateRangeFilter from '../components/DateRangeFilter.jsx';
import ExportButtons from '../components/ExportButtons.jsx';
import KPICard from '../components/KPICard.jsx';
import LoadingSkeleton from '../components/LoadingSkeleton.jsx';
import NoDataState from '../components/NoDataState.jsx';
import Table from '../components/Table.jsx';
import WeatherWidget from '../components/WeatherWidget.jsx';
import ZoneSelector from '../components/ZoneSelector.jsx';
import { DEFAULT_WATER_INPUTS, buildExportUrl, fetchWaterAnalytics, getDefaultDateRange, predictWaterQuality } from '../services/api.js';

const waterFields = [
  ['ph', 'pH'],
  ['hardness', 'Hardness'],
  ['solids', 'Solids'],
  ['chloramines', 'Chloramines'],
  ['sulfate', 'Sulfate'],
  ['conductivity', 'Conductivity'],
  ['organic_carbon', 'Organic Carbon'],
  ['temperature', 'Temperature'],
  ['dissolved_oxygen', 'Dissolved Oxygen'],
  ['turbidity', 'Turbidity'],
];

const waterColumns = [
  { key: 'zone', header: 'Zone' },
  { key: 'date', header: 'Date' },
  { key: 'water_score', header: 'Score' },
  { key: 'water_quality', header: 'Quality' },
];

const buildWaterForm = (inputs = {}) =>
  Object.fromEntries(
    waterFields.map(([field]) => [field, String(inputs[field] ?? DEFAULT_WATER_INPUTS[field])])
  );

function Water({ selectedState }) {
  const [selectedZone, setSelectedZone] = useState(`All ${selectedState}`);
  const [filters, setFilters] = useState(getDefaultDateRange());
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => buildWaterForm());
  const [result, setResult] = useState(null);
  const [predictionError, setPredictionError] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setSelectedZone(`All ${selectedState}`);
  }, [selectedState]);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError('');
      const response = await fetchWaterAnalytics({
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
  const waterInputs = DEFAULT_WATER_INPUTS;

  const chartData = waterFields.map(([field, label]) => ({
    name: label,
    value: Number(form[field] || waterInputs[field]),
  }));

  const handleFilterChange = ({ field, value }) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const onTestChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleTest = async (event) => {
    event.preventDefault();
    setTesting(true);
    setPredictionError('');
    setResult(null);
    const response = await predictWaterQuality(form);
    if (response.error) {
      setPredictionError(response.error);
    } else {
      setResult(response.data);
    }
    setTesting(false);
  };

  const exportParams = useMemo(
    () => ({
      dataset: 'water',
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
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Water Quality Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Live water quality trends with independent model prediction tools.</p>
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

      <div className="grid gap-4 md:grid-cols-2">
        <KPICard label="Water Score" value={`${analytics?.currentScore || 0}%`} helper="Average quality score from the filtered dataset" tone="emerald" />
        <KPICard label="Water Quality" value={analytics?.waterQuality || 'No Data'} helper="Current selected-zone quality band" tone="cyan" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard title="Water Quality Trend" subtitle="Day-wise water score movement">
          {analytics?.trend?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="water_score" stroke="#16a34a" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No water trend available" />
          )}
        </ChartCard>

        <WeatherWidget weather={analytics?.weather} title="Weather Widget" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Prediction Input Snapshot" subtitle="Current model input values">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Try Water Model</h2>
          <p className="mt-1 text-sm text-gray-500">Prediction requests go directly to FastAPI and remain separate from uploaded analytics data.</p>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleTest}>
            {waterFields.map(([field, label]) => (
              <label key={field} className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
                <input
                  name={field}
                  type="number"
                  step="0.1"
                  value={form[field]}
                  onChange={onTestChange}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </label>
            ))}
            <div className="sm:col-span-2">
              <button className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700" disabled={testing}>
                {testing ? 'Testing...' : 'Predict Potability'}
              </button>
            </div>
          </form>
          {result && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Result: {result.potability === 1 ? 'Potable' : 'Not Potable'}</p>
              <p className="mt-1">Confidence: {(Number(result.confidence) * 100).toFixed(1)}%</p>
            </div>
          )}
          {predictionError && (
            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-800">
              {predictionError}
            </div>
          )}
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Water Records</h2>
            <p className="mt-1 text-sm text-gray-500">Admin-uploaded water analytics data for the selected filters.</p>
          </div>
          <ExportButtons
            onExportCsv={() => window.open(buildExportUrl({ ...exportParams, format: 'csv' }), '_blank')}
            onExportPdf={() => window.open(buildExportUrl({ ...exportParams, format: 'pdf' }), '_blank')}
          />
        </div>
        <Table columns={waterColumns} data={analytics?.tableRows || []} />
      </section>
    </div>
  );
}

export default Water;
