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
import { getDefaultDateRange, fetchAQIAnalytics } from '../services/dataService.js';
import { DEFAULT_STATE } from '../services/api.js';
import { predictAQICategory } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const defaultAir = {
  zoneOptions: [`All ${DEFAULT_STATE}`],
  currentAqi: null,
  category: 'No Data',
  pollutants: [],
  trend: [],
  latestDate: null,
};

function Air({ selectedState = DEFAULT_STATE }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState({
    zone: `All ${selectedState}`,
    ...getDefaultDateRange(),
  });
  const [air, setAir] = useState(defaultAir);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionError, setPredictionError] = useState('');
  const [predictionForm, setPredictionForm] = useState({
    pm25: '62',
    pm10: '108',
    no2: '34',
    so2: '18',
    co: '1.1',
    o3: '29',
    nh3: '22',
    temperature: '31',
    humidity: '56',
    wind_speed: '3.4',
  });

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      zone: `All ${selectedState}`,
    }));
  }, [selectedState]);

  useEffect(() => {
    const loadAir = async () => {
      setLoading(true);
      const response = await fetchAQIAnalytics({
        state: selectedState,
        zone: filters.zone,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      setAir(response.data || defaultAir);
      setError(response.error || '');
      setLoading(false);
    };

    loadAir();
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
      navigate('/login?redirect=%2Fair');
      return;
    }

    setPredicting(true);
    setPredictionError('');
    const response = await predictAQICategory(predictionForm);

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
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Air Quality</h1>
          <p className="mt-1 text-sm text-gray-500">Day-wise AQI analytics for Telangana zones with date-range filtering.</p>
        </div>
        <Link
          to="/admin/upload"
          className="inline-flex w-fit rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
        >
          Admin Data
        </Link>
      </div>

      {error && <AlertBox>{error}</AlertBox>}
      {!isAuthenticated && <AlertBox>Prediction requires login. AQI analytics stay public.</AlertBox>}
      {predictionError && <AlertBox>{predictionError}</AlertBox>}

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <ZoneSelector selectedZone={filters.zone} zoneOptions={air.zoneOptions} onZoneChange={(zone) => setFilters((current) => ({ ...current, zone }))} />
        <DateRangeFilter startDate={filters.startDate} endDate={filters.endDate} onChange={handleDateChange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KPICard
          label="AQI Value"
          value={air.currentAqi !== null ? air.currentAqi : '--'}
          helper={air.latestDate ? `Latest reading on ${air.latestDate}` : 'No AQI records found'}
          tone="amber"
        />
        <KPICard label="AQI Category" value={air.category} helper={`Zone filter: ${filters.zone}`} tone="cyan" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Pollutant Levels" subtitle="Current pollutant mix estimated from the latest AQI reading">
          {air.pollutants.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={air.pollutants} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
                <YAxis axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                  }}
                />
                <Bar dataKey="value" fill="#16a34a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No pollutant data" description="Upload AQI data or change the current filters." />
          )}
        </ChartCard>

        <ChartCard title="AQI Trend" subtitle="Line chart by date, filtered by zone and date range">
          {air.trend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={air.trend} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  cursor={{ stroke: '#dbeafe', strokeWidth: 2 }}
                  contentStyle={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  strokeWidth={4}
                  dot={{ r: 3, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No AQI trend data" description="Adjust the date range or upload records from the admin panel." />
          )}
        </ChartCard>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AQI Prediction</h2>
            <p className="mt-1 text-sm text-gray-500">Predict AQI category from live pollutant inputs.</p>
          </div>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handlePredictSubmit}>
          {[
            ['pm25', 'PM2.5'],
            ['pm10', 'PM10'],
            ['no2', 'NO2'],
            ['so2', 'SO2'],
            ['co', 'CO'],
            ['o3', 'O3'],
            ['nh3', 'NH3'],
            ['temperature', 'Temperature'],
            ['humidity', 'Humidity'],
            ['wind_speed', 'Wind Speed'],
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

          <div className="md:col-span-2 xl:col-span-5">
            <button
              type="submit"
              disabled={predicting}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {predicting ? 'Predicting...' : 'Predict AQI'}
            </button>
          </div>
        </form>

        {predictionResult && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-800">
            <p className="text-sm font-medium">Prediction Result</p>
            <p className="mt-1 text-2xl font-bold">{predictionResult.aqi_category}</p>
            <p className="mt-1 text-sm">Confidence: {(Number(predictionResult.confidence) * 100).toFixed(1)}%</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Air;
