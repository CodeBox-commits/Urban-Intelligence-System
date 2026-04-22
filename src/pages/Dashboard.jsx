import React, { useEffect, useMemo, useState } from 'react';
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
import AlertBox from '../components/AlertBox.jsx';
import ChartCard from '../components/ChartCard.jsx';
import KPICard from '../components/KPICard.jsx';
import MapView from '../components/MapView.jsx';
import Table from '../components/Table.jsx';
import ZoneSelector from '../components/ZoneSelector.jsx';
import { fetchDashboardData } from '../services/api.js';

const defaultDashboard = {
  country: 'India',
  state: 'Telangana',
  mapCenter: [17.385, 78.4867],
  mapZoom: 7,
  zones: [],
  zoneOptions: ['All Telangana'],
  kpis: [],
  aqiTrend: [],
  accidentByZone: [],
  waterQualityByZone: [],
  alerts: [],
};

const tableColumns = [
  { key: 'zone', header: 'Zone' },
  { key: 'aqi', header: 'AQI' },
  { key: 'water_quality', header: 'Water' },
  { key: 'risk_score', header: 'Risk Score' },
  { key: 'alerts', header: 'Alerts' },
];

const lineColors = ['#2563eb', '#f97316', '#16a34a', '#0f766e', '#dc2626', '#7c3aed'];

const riskColorMap = {
  High: '#dc2626',
  Medium: '#f97316',
  Low: '#16a34a',
};

const getRiskTone = (riskLevel) => {
  if (riskLevel === 'High') return 'rose';
  if (riskLevel === 'Medium') return 'orange';
  return 'emerald';
};

const buildZoneKpis = (zone) => [
  {
    label: 'AQI Level',
    value: String(zone.aqi),
    helper: `${zone.zone}, ${zone.state}`,
    tone: zone.aqi >= 75 ? 'amber' : 'cyan',
  },
  {
    label: 'Water Quality',
    value: zone.water_quality,
    helper: `Quality score ${zone.water_score}%`,
    tone: zone.water_quality === 'Potable' ? 'emerald' : 'amber',
  },
  {
    label: 'Accident Risk',
    value: `${zone.risk_score}%`,
    helper: `${zone.riskLevel} risk zone`,
    tone: getRiskTone(zone.riskLevel),
  },
  {
    label: 'Alerts',
    value: String(zone.alerts),
    helper: `Active alerts in ${zone.zone}`,
    tone: 'rose',
  },
];

function Dashboard({ selectedState }) {
  const [dashboard, setDashboard] = useState(defaultDashboard);
  const [selectedZone, setSelectedZone] = useState(defaultDashboard.zoneOptions[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      const response = await fetchDashboardData(selectedState);
      const nextDashboard = response.data || defaultDashboard;
      setDashboard(nextDashboard);
      setSelectedZone(nextDashboard.zoneOptions?.[0] || `All ${selectedState}`);
      setError(response.error || '');
      setLoading(false);
    };

    loadDashboard();
  }, [selectedState]);

  const selectedZoneData = useMemo(
    () => dashboard.zones.find((zone) => zone.zone === selectedZone),
    [dashboard.zones, selectedZone]
  );

  const visibleZones = useMemo(
    () => (selectedZoneData ? [selectedZoneData] : dashboard.zones),
    [dashboard.zones, selectedZoneData]
  );

  const kpis = selectedZoneData ? buildZoneKpis(selectedZoneData) : dashboard.kpis;
  const zoneNames = visibleZones.map((zone) => zone.zone);

  const accidentChartData = dashboard.accidentByZone.filter((item) => zoneNames.includes(item.zone));
  const waterChartData = dashboard.waterQualityByZone.filter((item) => zoneNames.includes(item.zone));
  const tableData = visibleZones.map((zone, index) => ({
    id: index + 1,
    zone: zone.zone,
    aqi: zone.aqi,
    water_quality: zone.water_quality,
    risk_score: `${zone.risk_score}%`,
    alerts: zone.alerts,
  }));

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm font-medium text-gray-500 shadow-sm">
        Loading Telangana dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            {dashboard.country} / {dashboard.state}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
            {dashboard.state} Urban Intelligence Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Zone-based smart city monitoring built for Telangana first, scalable across India later.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <ZoneSelector
            selectedZone={selectedZone}
            zoneOptions={dashboard.zoneOptions}
            onZoneChange={setSelectedZone}
          />
          <div className="inline-flex h-[46px] w-fit items-center rounded-full border border-gray-100 bg-white px-4 text-sm font-semibold text-gray-600 shadow-sm">
            Live Monitoring
          </div>
        </div>
      </div>

      {error && <AlertBox>{error}</AlertBox>}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <MapView
        mapCenter={dashboard.mapCenter}
        mapZoom={dashboard.mapZoom}
        selectedState={dashboard.state}
        selectedZone={selectedZone}
        zones={dashboard.zones}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="AQI Trend by Zone" subtitle="Weekly air quality movement for selected Telangana zones">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dashboard.aqiTrend} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip
                cursor={{ stroke: '#dbeafe', strokeWidth: 2 }}
                contentStyle={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                }}
              />
              {zoneNames.map((zoneName, index) => (
                <Line
                  key={zoneName}
                  type="monotone"
                  dataKey={zoneName}
                  stroke={lineColors[index % lineColors.length]}
                  strokeWidth={selectedZoneData ? 4 : 3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
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
              <Tooltip
                contentStyle={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                }}
              />
              <Bar dataKey="risk_score" radius={[8, 8, 0, 0]}>
                {accidentChartData.map((entry) => (
                  <Cell key={entry.zone} fill={riskColorMap[entry.riskLevel] || '#2563eb'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Water Quality per Zone" subtitle="Water quality score for monitored Telangana zones">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                }}
              />
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
    </div>
  );
}

export default Dashboard;
