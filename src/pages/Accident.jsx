import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard.jsx';
import KPICard from '../components/KPICard.jsx';
import ZoneSelector from '../components/ZoneSelector.jsx';
import { predictAccidentRisk } from '../services/api.js';

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

function Accident({ selectedState, zones, user, onSaveZone }) {
  const [selectedZone, setSelectedZone] = useState(zones[0]?.zone || '');
  const [adminRisk, setAdminRisk] = useState('');
  const [adminAlerts, setAdminAlerts] = useState('');
  const [adminLevel, setAdminLevel] = useState('Low');
  const [predictionForm, setPredictionForm] = useState(() => buildPredictionForm());
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionError, setPredictionError] = useState('');
  const [predicting, setPredicting] = useState(false);

  React.useEffect(() => {
    setSelectedZone(zones[0]?.zone || '');
  }, [zones]);

  const zone = useMemo(() => zones.find((item) => item.zone === selectedZone) || zones[0], [selectedZone, zones]);

  React.useEffect(() => {
    if (!zone) return;
    setAdminRisk(String(zone.risk_score));
    setAdminAlerts(String(zone.alerts));
    setAdminLevel(zone.riskLevel || 'Low');
    setPredictionForm(buildPredictionForm(zone.risk_score));
    setPredictionResult(null);
    setPredictionError('');
  }, [zone]);

  if (!zone) {
    return <p className="text-sm text-gray-500">No area data available.</p>;
  }

  const level = zone.risk_score >= 70 ? 'High' : zone.risk_score >= 40 ? 'Medium' : 'Low';

  const incidents = zones.map((item) => ({
    zone: item.zone,
    incidents: Math.max(1, Math.round((item.risk_score + item.alerts * 3) / 6)),
  }));

  const saveAdmin = (event) => {
    event.preventDefault();
    onSaveZone(selectedState, selectedZone, {
      risk_score: Number(adminRisk),
      alerts: Number(adminAlerts),
      riskLevel: adminLevel,
    });
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

    const response = await predictAccidentRisk(predictionForm);
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
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Accident Risk</h1>
          <p className="mt-1 text-sm text-gray-500">Select an area to view safety risk details.</p>
        </div>
        <ZoneSelector selectedZone={selectedZone} zoneOptions={zones.map((item) => item.zone)} onZoneChange={setSelectedZone} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KPICard label="Risk Score" value={`${zone.risk_score}%`} helper={`Current road safety risk in ${zone.zone}`} tone="rose" />
        <KPICard label="Risk Level" value={level} helper="Computed from stored area score" tone="amber" />
      </div>

      <ChartCard title="Zone Incidents" subtitle="Estimated incident intensity by zone">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={incidents} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="zone" axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
            <YAxis axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
            <Tooltip />
            <Bar dataKey="incidents" fill="#f97316" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Try Accident Model</h2>
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
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-semibold">Risk: {predictionResult.accident_risk}</p>
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
          <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={saveAdmin}>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Risk Score</span>
              <input
                type="number"
                value={adminRisk}
                onChange={(event) => setAdminRisk(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Alerts</span>
              <input
                type="number"
                value={adminAlerts}
                onChange={(event) => setAdminAlerts(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Risk Level</span>
              <select
                value={adminLevel}
                onChange={(event) => setAdminLevel(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>
            <div className="sm:col-span-3">
              <button className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black">Save Risk Data</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

export default Accident;
