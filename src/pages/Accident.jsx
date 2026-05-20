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
import { getDefaultDateRange, fetchAccidentAnalytics } from '../services/dataService.js';
import { DEFAULT_STATE } from '../services/api.js';
import { predictAccidentRisk } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const defaultAccident = {
  zoneOptions: [`All ${DEFAULT_STATE}`],
  totalIncidents: 0,
  riskScore: 0,
  riskLevel: 'No Data',
  trend: [],
  zoneTotals: [],
};

function Accident({ selectedState = DEFAULT_STATE }) {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated } = useAuth();
  const [filters, setFilters] = useState({
    zone: `All ${selectedState}`,
    ...getDefaultDateRange(),
  });
  const [accident, setAccident] = useState(defaultAccident);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionError, setPredictionError] = useState('');
  const [predictionForm, setPredictionForm] = useState({
    weather: 'Rain',
    visibility: '3.5',
    road_type: 'Highway',
    lighting: 'Night-unlit',
    traffic_density: 'High',
    speed_limit: '80',
    time_of_day: 'Night',
  });

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      zone: `All ${selectedState}`,
    }));
  }, [selectedState]);

  useEffect(() => {
    const loadAccidents = async () => {
      setLoading(true);
      const response = await fetchAccidentAnalytics({
        state: selectedState,
        zone: filters.zone,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      setAccident(response.data || defaultAccident);
      setError(response.error || '');
      setLoading(false);
    };

    loadAccidents();
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
      navigate('/login?redirect=%2Faccidents');
      return;
    }

    setPredicting(true);
    setPredictionError('');
    setPredictionResult(null);
    const response = await predictAccidentRisk(predictionForm);

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
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Accident Risk</h1>
          <p className="mt-1 text-sm text-gray-500">Zone-wise totals and day-wise incident trends for Telangana monitoring.</p>
        </div>
        {isAdmin && (
          <Link
            to="/admin/upload"
            className="inline-flex w-fit rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
          >
            Admin Data
          </Link>
        )}
      </div>

      {error && <AlertBox>{error}</AlertBox>}
      {!isAuthenticated && <AlertBox>Prediction requires login. Accident analytics remain public.</AlertBox>}
      {predictionError && <AlertBox>{predictionError}</AlertBox>}

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <ZoneSelector selectedZone={filters.zone} zoneOptions={accident.zoneOptions} onZoneChange={(zone) => setFilters((current) => ({ ...current, zone }))} />
        <DateRangeFilter startDate={filters.startDate} endDate={filters.endDate} onChange={handleDateChange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KPICard label="Risk Score" value={`${accident.riskScore}%`} helper={`Filter: ${filters.zone}`} tone="rose" />
        <KPICard
          label="Total Incidents"
          value={accident.totalIncidents}
          helper={`${accident.riskLevel} operational risk for selected range`}
          tone="orange"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Zone Incidents" subtitle="Incident totals grouped by zone for the selected date range">
          {accident.zoneTotals.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accident.zoneTotals} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                <Bar dataKey="incidents" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState
              title="No zone incident data"
              description={isAdmin ? 'Upload accident records or change the filters.' : 'No accident records match the current filters.'}
            />
          )}
        </ChartCard>

        <ChartCard title="Accident Trend" subtitle="Daily incidents over time for the selected zone/date range">
          {accident.trend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accident.trend} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
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
                  stroke="#f97316"
                  strokeWidth={4}
                  dot={{ r: 3, fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState
              title="No accident trend data"
              description={isAdmin ? 'Adjust the filters or upload incident data from the admin panel.' : 'No accident records match the selected date range.'}
            />
          )}
        </ChartCard>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Accident Risk Prediction</h2>
          <p className="mt-1 text-sm text-gray-500">Predict accident risk from road, lighting, traffic, and weather conditions.</p>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handlePredictSubmit}>
          {[
            ['weather', 'Weather', ['Clear', 'Rain', 'Fog', 'Storm', 'Drizzle']],
            ['road_type', 'Road Type', ['Highway', 'Urban', 'Rural', 'Intersection']],
            ['lighting', 'Lighting', ['Daylight', 'Night-lit', 'Night-unlit', 'Dawn/Dusk']],
            ['traffic_density', 'Traffic Density', ['Low', 'Medium', 'High', 'Very High']],
            ['time_of_day', 'Time of Day', ['Morning', 'Afternoon', 'Evening', 'Night']],
          ].map(([name, label, options]) => (
            <label key={name} className="space-y-2">
              <span className="text-sm font-medium text-gray-600">{label}</span>
              <select
                name={name}
                value={predictionForm[name]}
                onChange={handlePredictionChange}
                className="w-full rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}

          {[
            ['visibility', 'Visibility'],
            ['speed_limit', 'Speed Limit'],
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

          <div className="md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              disabled={predicting}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {predicting ? 'Predicting...' : 'Predict Accident Risk'}
            </button>
          </div>
        </form>

        {predictionResult && (
          <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-800">
            <p className="text-sm font-medium">Prediction Result</p>
            <p className="mt-1 text-2xl font-bold">{predictionResult.accident_risk}</p>
            <p className="mt-1 text-sm">Confidence: {(Number(predictionResult.confidence) * 100).toFixed(1)}%</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Accident;
