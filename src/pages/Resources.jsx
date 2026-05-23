import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AlertBox from '../components/AlertBox.jsx';
import ChartCard from '../components/ChartCard.jsx';
import DateRangeFilter from '../components/DateRangeFilter.jsx';
import KPICard from '../components/KPICard.jsx';
import LoadingSkeleton from '../components/LoadingSkeleton.jsx';
import NoDataState from '../components/NoDataState.jsx';
import ZoneSelector from '../components/ZoneSelector.jsx';
import { getDefaultDateRange, fetchResourceAnalytics } from '../services/dataService.js';
import { DEFAULT_STATE, predictResourceAnomaly } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const defaultResource = {
  zoneOptions: [`All ${DEFAULT_STATE}`],
  usageScore: null,
  anomalyCount: 0,
  riskLevel: 'No Data',
  trend: [],
  zoneTotals: [],
};

const initialForm = {
  power_usage: '120',
  water_usage: '48',
  gas_usage: '26',
  temperature: '29',
  humidity: '52',
};

function Resources({ selectedState = DEFAULT_STATE }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState({
    zone: `All ${selectedState}`,
    ...getDefaultDateRange(),
  });
  const [resource, setResource] = useState(defaultResource);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionError, setPredictionError] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [predictionForm, setPredictionForm] = useState(initialForm);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      zone: `All ${selectedState}`,
    }));
  }, [selectedState]);

  useEffect(() => {
    const loadResources = async () => {
      setLoading(true);
      const response = await fetchResourceAnalytics({
        state: selectedState,
        zone: filters.zone,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      setResource(response.data || defaultResource);
      setError(response.error || '');
      setLoading(false);
    };

    loadResources();
  }, [filters.endDate, filters.startDate, filters.zone, selectedState]);

  const handleDateChange = ({ field, value }) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const handlePredictionChange = (event) => {
    const { name, value } = event.target;
    setPredictionForm((current) => ({ ...current, [name]: value }));
  };

  const handlePredictSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      navigate('/login?redirect=%2Fresources');
      return;
    }

    setPredicting(true);
    setPredictionError('');
    const response = await predictResourceAnomaly(predictionForm);

    if (response.error) {
      setPredictionError(response.error);
    }
    setPredictionResult(response.data);
    setPredicting(false);
  };

  if (loading) {
    return <LoadingSkeleton lines={6} className="h-[420px]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Resource Monitor</h1>
          <p className="mt-1 text-sm text-gray-500">Track energy, water, and gas usage for Telangana zones with anomaly detection.</p>
        </div>
        <Link
          to="/admin/upload"
          className="inline-flex w-fit rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
        >
          Admin Data
        </Link>
      </div>

      {error && <AlertBox>{error}</AlertBox>}
      {!isAuthenticated && <AlertBox>Prediction requires login. Resource analytics remain public.</AlertBox>}
      {predictionError && <AlertBox>{predictionError}</AlertBox>}

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <ZoneSelector selectedZone={filters.zone} zoneOptions={resource.zoneOptions} onZoneChange={(zone) => setFilters((current) => ({ ...current, zone }))} />
        <DateRangeFilter startDate={filters.startDate} endDate={filters.endDate} onChange={handleDateChange} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          label="Usage Score"
          value={resource.usageScore !== null ? `${resource.usageScore}` : '--'}
          helper={resource.latestDate ? `Latest reading on ${resource.latestDate}` : 'No recent resource readings'}
          tone="emerald"
        />
        <KPICard label="Anomalies" value={resource.anomalyCount} helper={`Filtered zone: ${filters.zone}`} tone="rose" />
        <KPICard label="Risk Level" value={resource.riskLevel} helper="Resource anomaly assessment" tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Zone Anomalies" subtitle="Anomaly counts by zone for the selected filters">
          {resource.zoneTotals.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resource.zoneTotals} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="zone" axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
                <YAxis axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                  }}
                />
                <Bar dataKey="anomalies" fill="#f43f5e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No resource anomalies" description="Upload resource usage data or adjust the filters." />
          )}
        </ChartCard>

        <ChartCard title="Usage Trend" subtitle="Average resource usage score over time">
          {resource.trend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={resource.trend} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  cursor={{ stroke: '#fed7aa', strokeWidth: 2 }}
                  contentStyle={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#14b8a6"
                  strokeWidth={4}
                  dot={{ r: 3, fill: '#14b8a6', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No usage trend" description="Change the date range or upload resource data." />
          )}
        </ChartCard>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Resource Anomaly Prediction</h2>
            <p className="mt-1 text-sm text-gray-500">Estimate anomaly likelihood from usage metrics and environmental inputs.</p>
          </div>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handlePredictSubmit}>
          {[
            ['power_usage', 'Power Usage'],
            ['water_usage', 'Water Usage'],
            ['gas_usage', 'Gas Usage'],
            ['temperature', 'Temperature'],
            ['humidity', 'Humidity'],
          ].map(([name, label]) => (
            <label key={name} className="space-y-2">
              <span className="text-sm font-medium text-gray-600">{label}</span>
              <input
                type="number"
                step="0.1"
                name={name}
                value={predictionForm[name]}
                onChange={handlePredictionChange}
                className="w-full rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </label>
          ))}

          <div className="md:col-span-2 xl:col-span-3">
            <button
              type="submit"
              disabled={predicting}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {predicting ? 'Predicting...' : 'Predict Anomaly'}
            </button>
          </div>
        </form>

        {predictionResult && (
          <div className={`mt-5 rounded-2xl border p-5 transition-all duration-200 ${predictionResult.anomaly ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            <p className="text-sm font-medium">Prediction Result</p>
            <p className="mt-1 text-2xl font-bold">{predictionResult.anomaly ? 'Anomaly Detected' : 'Normal Usage'}</p>
            <p className="mt-1 text-sm">Confidence: {(Number(predictionResult.confidence) * 100).toFixed(1)}%</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Resources;
