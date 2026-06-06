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
import AlertBanner from '../components/AlertBanner.jsx';
import ChartCard from '../components/ChartCard.jsx';
import KPICard from '../components/KPICard.jsx';
import LoadingSkeleton from '../components/LoadingSkeleton.jsx';
import MapView from '../components/MapView.jsx';
import NoDataState from '../components/NoDataState.jsx';
import Table from '../components/Table.jsx';
import WeatherWidget from '../components/WeatherWidget.jsx';
import ZoneSelector from '../components/ZoneSelector.jsx';
import { fetchDashboardData } from '../services/api.js';

const zoneColumns = [
  { key: 'zone', header: 'Zone' },
  { key: 'aqi', header: 'AQI' },
  { key: 'water_quality', header: 'Water' },
  { key: 'risk_score', header: 'Risk Score' },
  { key: 'alerts', header: 'Alerts' },
];

const lineColors = ['#2563eb', '#f97316', '#16a34a', '#0f766e', '#dc2626', '#7c3aed'];
const riskColorMap = { High: '#dc2626', Medium: '#f97316', Low: '#16a34a' };

function Dashboard({ selectedState }) {
  const [selectedZone, setSelectedZone] = useState(`All ${selectedState}`);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    setSelectedZone(`All ${selectedState}`);
  }, [selectedState]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      const response = await fetchDashboardData({ state: selectedState, zone: selectedZone });
      if (response.error) {
        setError(response.error);
      }
      setDashboard(response.data);
      setLoading(false);
    };

    loadDashboard();
  }, [selectedState, selectedZone]);

  const zoneOptions = dashboard?.zoneOptions || [`All ${selectedState}`];
  const lastUpdated = dashboard?.lastUpdated ? new Date(dashboard.lastUpdated).toLocaleString() : 'No datasets uploaded';
  const alerts = dashboard?.alerts || [];

  const accidentChartData = dashboard?.accidentByZone || [];
  const waterChartData = dashboard?.waterQualityByZone || [];
  const resourceChartData = dashboard?.resourceByZone || [];
  const fuelChartData = dashboard?.fuelByZone || [];
  const fuelByZoneMap = useMemo(
    () => Object.fromEntries(fuelChartData.map((row) => [row.zone, row])),
    [fuelChartData]
  );
  const fuelSnapshotData = useMemo(
    () =>
      resourceChartData.map((row) => {
        const fuelRow = fuelByZoneMap[row.zone];
        const fuelValue = fuelRow
          ? Math.round(
              (fuelRow.petrol_availability + fuelRow.diesel_availability + fuelRow.lpg_availability + fuelRow.ev_utilization) / 4
            )
          : null;
        return {
          zone: row.zone,
          utilization: row.utilization,
          fuel: fuelValue,
        };
      }),
    [resourceChartData, fuelByZoneMap]
  );
  const zoneNames = useMemo(
    () => (dashboard?.mapZones || []).map((zone) => zone.zone),
    [dashboard]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton lines={4} />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingSkeleton key={index} lines={3} />
          ))}
        </div>
        <LoadingSkeleton lines={8} className="min-h-[360px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Smart City Operations Center</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
            {selectedState} Urban Intelligence Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: {lastUpdated}</p>
        </div>

        <ZoneSelector selectedZone={selectedZone} zoneOptions={zoneOptions} onZoneChange={setSelectedZone} />
      </div>

      <AlertBanner alert={dashboard?.alertBanner} />

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {(dashboard?.kpis || []).map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {dashboard?.mapZones?.length ? (
          <MapView
            mapCenter={dashboard.mapCenter}
            mapZoom={dashboard.mapZoom}
            selectedState={selectedState}
            selectedZone={selectedZone}
            zones={dashboard.mapZones}
          />
        ) : (
          <NoDataState title="No map data available" description="Upload AQI, water, and accident datasets to populate the Telangana map." />
        )}

        <WeatherWidget weather={dashboard?.weather} title="Weather Overview" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="AQI Trend by Zone" subtitle="Zone-wise air quality movement over time">
          {dashboard?.aqiTrend?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.aqiTrend} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip />
                {zoneNames.map((zoneName, index) => (
                  <Line
                    key={zoneName}
                    type="monotone"
                    dataKey={zoneName}
                    stroke={lineColors[index % lineColors.length]}
                    strokeWidth={3}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No AQI trend available" description="Upload AQI history to unlock the dashboard trend charts." />
          )}
        </ChartCard>

        <ChartCard title="Accident Risk per Zone" subtitle="Latest accident pressure across monitored zones">
          {accidentChartData.length ? (
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
          ) : (
            <NoDataState title="No accident data available" />
          )}
        </ChartCard>

        <ChartCard title="Water Quality per Zone" subtitle="Latest water quality scores from the database">
          {waterChartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="water_score" radius={[8, 8, 0, 0]} fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No water data available" />
          )}
        </ChartCard>

        <ChartCard title="Resource and Fuel Snapshot" subtitle="Live urban operations coverage by zone">
          {resourceChartData.length || fuelChartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelSnapshotData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="utilization" radius={[8, 8, 0, 0]} fill="#2563eb" />
                <Bar dataKey="fuel" radius={[8, 8, 0, 0]} fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoDataState title="No resource or fuel data available" />
          )}
        </ChartCard>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Zone Summary</h2>
          <p className="mt-1 text-sm text-gray-500">Latest database-driven metrics for each monitored zone.</p>
        </div>
        <Table columns={zoneColumns} data={(dashboard?.tableRows || []).map((row, index) => ({ id: index + 1, ...row }))} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Active Alerts</h2>
          <p className="mt-1 text-sm text-gray-500">Critical conditions surfaced from the latest uploaded data.</p>
        </div>
        {alerts.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{alert.type}</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">{alert.zone}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{alert.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <NoDataState title="No active alerts" description="The latest upload does not contain any critical city-wide conditions." />
        )}
      </section>
    </div>
  );
}

export default Dashboard;
