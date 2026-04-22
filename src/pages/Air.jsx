import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AlertBox from '../components/AlertBox.jsx';
import ChartCard from '../components/ChartCard.jsx';
import KPICard from '../components/KPICard.jsx';
import { fetchAirQualityData } from '../services/api.js';

const defaultAir = {
  aqi: '-',
  category: 'Unavailable',
  pollutants: [],
};

function Air() {
  const [air, setAir] = useState(defaultAir);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAir = async () => {
      setLoading(true);
      const response = await fetchAirQualityData();
      setAir(response.data || defaultAir);
      setError(response.error || '');
      setLoading(false);
    };

    loadAir();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm font-medium text-gray-500 shadow-sm">
        Loading air quality...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Air Quality</h1>
        <p className="mt-1 text-sm text-gray-500">AQI status and pollutant concentration overview.</p>
      </div>

      {error && <AlertBox>{error}</AlertBox>}

      <div className="grid gap-4 md:grid-cols-2">
        <KPICard label="AQI Value" value={air.aqi} helper="Current city average" tone="amber" />
        <KPICard label="AQI Category" value={air.category} helper="Based on pollutant levels" tone="cyan" />
      </div>

      <ChartCard title="Pollutant Levels" subtitle="PM2.5, NO2, SO2, CO, O3 and related indicators">
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
      </ChartCard>
    </div>
  );
}

export default Air;
