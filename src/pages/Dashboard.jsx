import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from '../components/ChartCard.jsx';
import KPICard from '../components/KPICard.jsx';
import MapView from '../components/MapView.jsx';
import Table from '../components/Table.jsx';
import ZoneSelector from '../components/ZoneSelector.jsx';

const tableColumns = [
  { key: 'zone', header: 'Zone' },
  { key: 'aqi', header: 'AQI' },
  { key: 'water_quality', header: 'Water' },
  { key: 'risk_score', header: 'Risk Score' },
  { key: 'alerts', header: 'Alerts' },
];

const lineColors = ['#2563eb', '#f97316', '#16a34a', '#0f766e', '#dc2626', '#7c3aed'];
const riskColorMap = { High: '#dc2626', Medium: '#f97316', Low: '#16a34a' };

const avg = (items, key) =>
  items.length ? Math.round(items.reduce((total, item) => total + Number(item[key] || 0), 0) / items.length) : 0;

function Dashboard({ selectedState, zones, user, onSaveZone }) {
  const [selectedZone, setSelectedZone] = useState(`All ${selectedState}`);
  const [adminForm, setAdminForm] = useState({});

  const zoneOptions = useMemo(() => [`All ${selectedState}`, ...zones.map((zone) => zone.zone)], [selectedState, zones]);

  React.useEffect(() => {
    setSelectedZone(`All ${selectedState}`);
  }, [selectedState]);

  const selectedZoneData = useMemo(
    () => zones.find((zone) => zone.zone === selectedZone),
    [selectedZone, zones]
  );

  React.useEffect(() => {
    if (!selectedZoneData) return;
    setAdminForm({
      aqi: selectedZoneData.aqi,
      water_score: selectedZoneData.water_score,
      water_quality: selectedZoneData.water_quality,
      risk_score: selectedZoneData.risk_score,
      riskLevel: selectedZoneData.riskLevel,
      alerts: selectedZoneData.alerts,
    });
  }, [selectedZoneData]);

  const visibleZones = selectedZoneData ? [selectedZoneData] : zones;

  const kpis = useMemo(() => {
    if (!visibleZones.length) return [];
    const potableCount = visibleZones.filter((zone) => zone.water_quality === 'Potable').length;
    return [
      {
        label: 'AQI Level',
        value: String(avg(visibleZones, 'aqi')),
        helper: `Average across ${visibleZones.length} zones`,
        tone: 'amber',
      },
      {
        label: 'Water Quality',
        value: `${Math.round((potableCount / visibleZones.length) * 100)}%`,
        helper: `${potableCount}/${visibleZones.length} zones potable`,
        tone: 'emerald',
      },
      {
        label: 'Accident Risk',
        value: `${avg(visibleZones, 'risk_score')}%`,
        helper: 'Average zone risk score',
        tone: 'orange',
      },
      {
        label: 'Alerts',
        value: String(visibleZones.reduce((total, zone) => total + Number(zone.alerts || 0), 0)),
        helper: `Active alerts across ${selectedState}`,
        tone: 'rose',
      },
    ];
  }, [selectedState, visibleZones]);

  const zoneNames = visibleZones.map((zone) => zone.zone);

  const trendData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, idx) => {
      const row = { day };
      visibleZones.forEach((zone) => {
        row[zone.zone] = zone.aqiTrend?.[idx] ?? zone.aqi;
      });
      return row;
    });
  }, [visibleZones]);

  const accidentChartData = visibleZones.map((zone) => ({
    zone: zone.zone,
    risk_score: zone.risk_score,
    riskLevel: zone.riskLevel,
  }));

  const waterChartData = visibleZones.map((zone) => ({
    zone: zone.zone,
    water_score: zone.water_score,
  }));

  const tableData = visibleZones.map((zone, index) => ({
    id: index + 1,
    zone: zone.zone,
    aqi: zone.aqi,
    water_quality: zone.water_quality,
    risk_score: `${zone.risk_score}%`,
    alerts: zone.alerts,
  }));

  const saveAdmin = (event) => {
    event.preventDefault();
    if (!selectedZoneData) return;
    onSaveZone(selectedState, selectedZoneData.zone, {
      aqi: Number(adminForm.aqi),
      water_score: Number(adminForm.water_score),
      water_quality: adminForm.water_quality,
      risk_score: Number(adminForm.risk_score),
      riskLevel: adminForm.riskLevel,
      alerts: Number(adminForm.alerts),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">India / {selectedState}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{selectedState} Urban Intelligence Dashboard</h1>
          
        </div>

        <ZoneSelector selectedZone={selectedZone} zoneOptions={zoneOptions} onZoneChange={setSelectedZone} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <MapView
        mapCenter={zones[0]?.coordinates || [17.385, 78.4867]}
        mapZoom={7}
        selectedState={selectedState}
        selectedZone={selectedZone}
        zones={zones}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="AQI Trend by Zone" subtitle="Weekly air quality movement for selected zones">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip />
              {zoneNames.map((zoneName, index) => (
                <Line key={zoneName} type="monotone" dataKey={zoneName} stroke={lineColors[index % lineColors.length]} strokeWidth={3} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Accident Risk per Zone" subtitle="Risk score comparison across selected zones">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={accidentChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="risk_score" radius={[8, 8, 0, 0]}>
                {accidentChartData.map((entry) => (
                  <Cell key={entry.zone} fill={riskColorMap[entry.riskLevel] || '#2563eb'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Water Quality per Zone" subtitle="Water quality score for monitored zones">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="water_score" radius={[8, 8, 0, 0]} fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Zone Summary</h2>
            <p className="mt-1 text-sm text-gray-500">Current zone-level AQI, water, risk, and alerts.</p>
          </div>
          <Table columns={tableColumns} data={tableData} />
        </section>
      </div>

      {user.role === 'admin' && selectedZoneData && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Admin Quick Update: {selectedZoneData.zone}</h2>
          
          <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={saveAdmin}>
            {['aqi', 'water_score', 'risk_score', 'alerts'].map((field) => (
              <label key={field} className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{field}</span>
                <input
                  type="number"
                  value={adminForm[field] ?? ''}
                  onChange={(event) => setAdminForm((current) => ({ ...current, [field]: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </label>
            ))}
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">water_quality</span>
              <select
                value={adminForm.water_quality ?? 'Potable'}
                onChange={(event) => setAdminForm((current) => ({ ...current, water_quality: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              >
                <option value="Potable">Potable</option>
                <option value="Needs Review">Needs Review</option>
                <option value="Not Potable">Not Potable</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">riskLevel</span>
              <select
                value={adminForm.riskLevel ?? 'Low'}
                onChange={(event) => setAdminForm((current) => ({ ...current, riskLevel: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>
            <div className="sm:col-span-3">
              <button className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black">Save Area Data</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
