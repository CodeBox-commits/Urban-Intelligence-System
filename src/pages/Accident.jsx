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
import { buildExportUrl, fetchAccidentAnalytics, getDefaultDateRange, predictAccidentRisk } from '../services/api.js';

const optionFields = [
  ['weather', 'Weather', ['Clear', 'Rain', 'Fog', 'Storm', 'Drizzle']],
  ['road_type', 'Road Type', ['Highway', 'Urban', 'Rural', 'Intersection']],
  ['lighting', 'Lighting', ['Daylight', 'Night-lit', 'Night-unlit', 'Dawn/Dusk']],
  ['traffic_density', 'Traffic Density', ['Low', 'Medium', 'High', 'Very High']],
  ['time_of_day', 'Time of Day', ['Morning', 'Afternoon', 'Evening', 'Night']],
];

const numericPredictionFields = [
  ['visibility', 'Visibility'],
  ['speed_limit', 'Speed Limit'],
];

const accidentColumns = [
  { key: 'zone', header: 'Zone' },
  { key: 'date', header: 'Date' },
  { key: 'accident_count', header: 'Incidents' },
  { key: 'severity', header: 'Severity' },
  { key: 'risk_score', header: 'Risk Score' },
];

const buildPredictionForm = (riskScore = 45) => {
  const highRisk = Number(riskScore) >= 70;
  const mediumRisk = Number(riskScore) >= 40 && !highRisk;

  return {
    weather: highRisk ? 'Rain' : mediumRisk ? 'Drizzle' : 'Clear',
    visibility: highRisk ? '3.2' : mediumRisk ? '5.1' : '7.4',
    road_type: highRisk ? 'Highway' : mediumRisk ? 'Urban' : 'Rural',
    lighting: highRisk ? 'Night-unlit' : mediumRisk ? 'Night-lit' : 'Daylight',
    traffic_density: highRisk ? 'High' : mediumRisk ? 'Medium' : 'Low',
    speed_limit: highRisk ? '80' : mediumRisk ? '60' : '40',
    time_of_day: highRisk ? 'Night' : mediumRisk ? 'Evening' : 'Morning',
  };
};

function Accident({ selectedState }) {
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
      const response = await fetchAccidentAnalytics({
        state: selectedState,
        zone: selectedZone,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (response.error) {
        setError(response.error);
      }
      setAnalytics(response.data);
      setPredictionForm(buildPredictionForm(response.data?.riskScore || 45));
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
    setPredictionForm((current) => ({ ...current, [name]: value }));
  };

  const handlePredictionSubmit = async (event) => {
    event.preventDefault();
    setPredicting(true);
    setPredictionError('');
    setPredictionResult(null);
    const response = await predictAccidentRisk(predictionForm);
    if (response.error) {
      setPredictionError(response.error);
    } else {
      setPredictionResult(response.data);
    }
    setPredicting(false);
  };

  const exportParams = useMemo(
    () => ({
      dataset: 'accident',
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
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Accident Risk Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Track incident trends and risk build-up from admin-uploaded traffic datasets.</p>
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
        <KPICard label="Risk Score" value={`${analytics?.riskScore || 0}%`} helper="Average filtered road risk score" tone="rose" />
        <KPICard label="Total Incidents" value={String(analytics?.totalIncidents || 0)} helper={`Risk level: ${analytics?.riskLevel || 'No Data'}`} tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard title="Accident Trend" subtitle="Incidents per day over the selected period">
          {analytics?.trend?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="accident_count" stroke="#f97316" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No accident trend available" />
          )}
        </ChartCard>

        <WeatherWidget weather={analytics?.weather} title="Weather Widget" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Zone Incident Intensity" subtitle="Zone-wise incident totals from the filtered dataset">
          {analytics?.zoneTotals?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.zoneTotals} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="zone" axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
                <YAxis axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
                <Tooltip />
                <Bar dataKey="incidents" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No zone totals available" />
          )}
        </ChartCard>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Try Accident Model</h2>
          <p className="mt-1 text-sm text-gray-500">Predictions stay independent from uploaded analytics data.</p>
          <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={handlePredictionSubmit}>
            {optionFields.map(([field, label, options]) => (
              <label key={field} className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
                <select
                  name={field}
                  value={predictionForm[field]}
                  onChange={handlePredictionChange}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {numericPredictionFields.map(([field, label]) => (
              <label key={field} className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
                <input
                  name={field}
                  type="number"
                  step="0.1"
                  value={predictionForm[field]}
                  onChange={handlePredictionChange}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </label>
            ))}
            <div className="sm:col-span-2 xl:col-span-4">
              <button className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700" disabled={predicting}>
                {predicting ? 'Predicting...' : 'Predict Accident Risk'}
              </button>
            </div>
          </form>
          {predictionResult && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Risk: {predictionResult.accident_risk}</p>
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
            <h2 className="text-xl font-semibold text-gray-900">Accident Records</h2>
            <p className="mt-1 text-sm text-gray-500">Filtered traffic analytics from the latest uploaded accident dataset.</p>
          </div>
          <ExportButtons
            onExportCsv={() => window.open(buildExportUrl({ ...exportParams, format: 'csv' }), '_blank')}
            onExportPdf={() => window.open(buildExportUrl({ ...exportParams, format: 'pdf' }), '_blank')}
          />
        </div>
        <Table columns={accidentColumns} data={analytics?.tableRows || []} />
      </section>
    </div>
  );
}

export default Accident;
