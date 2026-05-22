import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard.jsx';
import KPICard from '../components/KPICard.jsx';
import ZoneSelector from '../components/ZoneSelector.jsx';

function Air({ selectedState, zones, user, onSaveZone }) {
  const [selectedZone, setSelectedZone] = useState(zones[0]?.zone || '');
  const [adminAqi, setAdminAqi] = useState('');

  React.useEffect(() => {
    setSelectedZone(zones[0]?.zone || '');
  }, [zones]);

  const zone = useMemo(() => zones.find((item) => item.zone === selectedZone) || zones[0], [selectedZone, zones]);

  React.useEffect(() => {
    setAdminAqi(zone ? String(zone.aqi) : '');
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
