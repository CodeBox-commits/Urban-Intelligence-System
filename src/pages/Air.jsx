import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard.jsx';
import KPICard from '../components/KPICard.jsx';
import ZoneSelector from '../components/ZoneSelector.jsx';
import { predictAQICategory } from '../services/api.js';

const predictionFields = [
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

function Air({ selectedState, zones, user, onSaveZone }) {
  const [selectedZone, setSelectedZone] = useState(zones[0]?.zone || '');
  const [adminAqi, setAdminAqi] = useState('');
  const [predictionForm, setPredictionForm] = useState(() => buildPredictionForm());
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionError, setPredictionError] = useState('');
  const [predicting, setPredicting] = useState(false);

  React.useEffect(() => {
    setSelectedZone(zones[0]?.zone || '');
  }, [zones]);

  const zone = useMemo(() => zones.find((item) => item.zone === selectedZone) || zones[0], [selectedZone, zones]);

  React.useEffect(() => {
    setAdminAqi(zone ? String(zone.aqi) : '');
    setPredictionForm(buildPredictionForm(zone?.aqi));
    setPredictionResult(null);
    setPredictionError('');
  }, [zone]);

  if (!zone) {
    return <p className="text-sm text-gray-500">No area data available.</p>;
  }

  const pollutants = [
    { name: 'PM2.5', value: Math.round(zone.aqi * 0.5) },
    { name: 'PM10', value: Math.round(zone.aqi * 0.8) },
    { name: 'NO2', value: Math.round(zone.aqi * 0.35) },
    { name: 'SO2', value: Math.round(zone.aqi * 0.2) },
  ];

  const category = zone.aqi <= 50 ? 'Good' : zone.aqi <= 100 ? 'Moderate' : 'Poor';

  const saveAdmin = (event) => {
    event.preventDefault();
    onSaveZone(selectedState, selectedZone, { aqi: Number(adminAqi) });
  };

  const handlePredictionChange = (event) => {
    const { name, value } = event.target;
    setPredictionForm((current) => ({ ...current, [name]: value }));
  };

  const handlePredictionSubmit = async (event) => {
    event.preventDefault();
    setPredicting(true);
    setPredictionResult(null);
    setPredictionError('');

    const response = await predictAQICategory(predictionForm);
    if (response.error) {
      setPredictionError(response.error);
    } else {
      setPredictionResult(response.data);
    }
    setPredicting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Air Quality</h1>
          <p className="mt-1 text-sm text-gray-500">Select an area to view AQI and pollutant indicators.</p>
        </div>
        <ZoneSelector selectedZone={selectedZone} zoneOptions={zones.map((item) => item.zone)} onZoneChange={setSelectedZone} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KPICard label="AQI Value" value={zone.aqi} helper={`Current value for ${zone.zone}`} tone="amber" />
        <KPICard label="AQI Category" value={category} helper="Based on stored AQI levels" tone="cyan" />
      </div>

      <ChartCard title="Pollutant Levels" subtitle="Derived indicators for selected area">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pollutants} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
            <YAxis axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#16a34a" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Try AQI Model</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" onSubmit={handlePredictionSubmit}>
          {predictionFields.map(([field, label]) => (
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
          <div className="sm:col-span-2 xl:col-span-5">
            <button className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700" disabled={predicting}>
              {predicting ? 'Predicting...' : 'Predict AQI Category'}
            </button>
          </div>
        </form>
        {predictionResult && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-semibold">Category: {predictionResult.aqi_category}</p>
            <p>Confidence: {(Number(predictionResult.confidence) * 100).toFixed(1)}%</p>
          </div>
        )}
        {predictionError && (
          <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-medium text-rose-800">
            {predictionError}
          </div>
        )}
      </section>

      {user.role === 'admin' && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Admin Update: {selectedZone}</h2>
          <form className="mt-4 flex flex-col gap-3 sm:max-w-xs" onSubmit={saveAdmin}>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">AQI</span>
              <input
                type="number"
                value={adminAqi}
                onChange={(event) => setAdminAqi(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </label>
            <button className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black">Save AQI</button>
          </form>
        </section>
      )}
    </div>
  );
}

export default Air;
