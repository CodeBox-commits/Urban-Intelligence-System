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
import { buildExportUrl, fetchAqiAnalytics, getDefaultDateRange, predictAQICategory } from '../services/api.js';

const predictionFields = [
  ['pm25', 'PM2.5', 0, 1000],
  ['pm10', 'PM10', 0, 1000],
  ['no2', 'NO2', 0, 500],
  ['so2', 'SO2', 0, 500],
  ['co', 'CO', 0, 100],
  ['o3', 'O3', 0, 500],
  ['nh3', 'NH3', 0, 500],
  ['temperature', 'Temperature', -10, 60],
  ['humidity', 'Humidity', 0, 100],
  ['wind_speed', 'Wind Speed', 0, 150],
];

const airColumns = [
  { key: 'zone', header: 'Zone' },
  { key: 'date', header: 'Date' },
  { key: 'aqi', header: 'AQI' },
];

const buildPredictionForm = (aqi = 80) => ({
  pm25: String(Math.round(aqi * 0.5)),
  pm10: String(Math.round(aqi * 0.8)),
  no2: String(Math.round(aqi * 0.35)),
  so2: String(Math.round(aqi * 0.2)),
  co: '1.1',
  o3: String(Math.round(aqi * 0.3)),
  nh3: String(Math.round(aqi * 0.25)),
  temperature: '31',
  humidity: '56',
  wind_speed: '3.4',
});

function Air({ selectedState }) {
  const [selectedZone, setSelectedZone] = useState(`All ${selectedState}`);
  const [filters, setFilters] = useState(getDefaultDateRange());
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [predictionForm, setPredictionForm] = useState(() => buildPredictionForm());
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionError, setPredictionError] = useState('');
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    setSelectedZone(`All ${selectedState}`);
  }, [selectedState]);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError('');
      const response = await fetchAqiAnalytics({
        state: selectedState,
        zone: selectedZone,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      if (response.error) {
        setError(response.error);
      }

      setAnalytics(response.data);
      setPredictionForm(buildPredictionForm(response.data?.currentAqi || 80));
      setLoading(false);
    };

    loadAnalytics();
  }, [filters.endDate, filters.startDate, selectedState, selectedZone]);

  const zoneOptions = analytics?.zoneOptions || [`All ${selectedState}`];
  const lastUpdated = analytics?.lastUpdated ? new Date(analytics.lastUpdated).toLocaleString() : 'Unavailable';

  const handleFilterChange = ({ field, value }) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const handlePredictionChange = (event) => {
    const { name, value } = event.target;
    const fieldDef = predictionFields.find(([f]) => f === name);
    if (fieldDef && value !== '') {
      const val = Number(value);
      const [, , min, max] = fieldDef;
      if (Number.isNaN(val) || val < min - 20 || val > max * 5) {
        return;
      }
    }
    setPredictionForm((current) => ({ ...current, [name]: value }));
  };

  const handlePredictionSubmit = async (event) => {
    event.preventDefault();
    for (const [field, label, min, max] of predictionFields) {
      const val = Number(predictionForm[field]);
      if (Number.isNaN(val) || val < min || val > max) {
        setPredictionError(`${label} must be between ${min} and ${max}.`);
        return;
      }
    }
    setPredicting(true);
    setPredictionError('');
    setPredictionResult(null);
    const response = await predictAQICategory(predictionForm);
    if (response.error) {
      setPredictionError(response.error);
    } else {
      setPredictionResult(response.data);
    }
    setPredicting(false);
  };

  const exportParams = useMemo(
    () => ({
      dataset: 'aqi',
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
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Air Quality Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Database-driven AQI trends, pollutant indicators, and live weather context.</p>
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
        <KPICard label="AQI Value" value={analytics?.currentAqi ?? '0'} helper="Average of latest filtered records" tone="amber" />
        <KPICard label="AQI Category" value={analytics?.category || 'No Data'} helper="Derived from filtered dataset" tone="cyan" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard title="AQI Trend" subtitle="Day-wise AQI movement across the selected filters">
          {analytics?.trend?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="aqi" stroke="#2563eb" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No AQI trend available" />
          )}
        </ChartCard>

        <WeatherWidget weather={analytics?.weather} title="Weather Widget" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Pollutant Levels" subtitle="Current pollutant indicators derived from the selected AQI">
          {analytics?.pollutants?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.pollutants} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
                <YAxis axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#16a34a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No pollutant data available" />
          )}
        </ChartCard>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Try AQI Model</h2>
              <p className="mt-1 text-sm text-gray-500">Predictions stay independent from uploaded analytics data.</p>
            </div>
          </div>
          <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" onSubmit={handlePredictionSubmit}>
            {predictionFields.map(([field, label, min, max]) => (
              <label key={field} className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
                <input
                  name={field}
                  type="number"
                  step="0.1"
                  min={min}
                  max={max}
                  value={predictionForm[field]}
                  onChange={handlePredictionChange}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </label>
            ))}
            <div className="sm:col-span-2 xl:col-span-5">
              <button className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700" disabled={predicting}>
                {predicting ? 'Predicting...' : 'Predict AQI Category'}
              </button>
            </div>
          </form>
          {predictionResult && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Category: {predictionResult.aqi_category}</p>
              <p className="mt-1">Confidence: {(Number(predictionResult.confidence) * 100).toFixed(1)}%</p>
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
            <h2 className="text-xl font-semibold text-gray-900">AQI Records</h2>
            <p className="mt-1 text-sm text-gray-500">Filtered analytics data from the admin-uploaded AQI dataset.</p>
          </div>
          <ExportButtons
            onExportCsv={() => window.open(buildExportUrl({ ...exportParams, format: 'csv' }), '_blank')}
            onExportPdf={() => window.open(buildExportUrl({ ...exportParams, format: 'pdf' }), '_blank')}
          />
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          <Table columns={airColumns} data={analytics?.tableRows || []} />
        </div>
      </section>
    </div>
  );
}

export default Air;
