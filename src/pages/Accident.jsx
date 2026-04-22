import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard.jsx';
import KPICard from '../components/KPICard.jsx';
import ZoneSelector from '../components/ZoneSelector.jsx';

function Accident({ selectedState, zones, user, onSaveZone }) {
  const [selectedZone, setSelectedZone] = useState(zones[0]?.zone || '');
  const [adminRisk, setAdminRisk] = useState('');
  const [adminAlerts, setAdminAlerts] = useState('');
  const [adminLevel, setAdminLevel] = useState('Low');

  React.useEffect(() => {
    setSelectedZone(zones[0]?.zone || '');
  }, [zones]);

  const zone = useMemo(() => zones.find((item) => item.zone === selectedZone) || zones[0], [selectedZone, zones]);

  React.useEffect(() => {
    if (!zone) return;
    setAdminRisk(String(zone.risk_score));
    setAdminAlerts(String(zone.alerts));
    setAdminLevel(zone.riskLevel || 'Low');
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
