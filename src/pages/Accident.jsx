import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AlertBox from '../components/AlertBox.jsx';
import ChartCard from '../components/ChartCard.jsx';
import KPICard from '../components/KPICard.jsx';
import { fetchAccidentData } from '../services/api.js';

const defaultAccident = {
  riskScore: 0,
  level: 'Unavailable',
  zones: [],
};

function Accident() {
  const [accident, setAccident] = useState(defaultAccident);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAccidents = async () => {
      setLoading(true);
      const response = await fetchAccidentData();
      setAccident(response.data || defaultAccident);
      setError(response.error || '');
      setLoading(false);
    };

    loadAccidents();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm font-medium text-gray-500 shadow-sm">
        Loading accident risk...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Accident Risk</h1>
        <p className="mt-1 text-sm text-gray-500">Risk score and recent incident spread by city zone.</p>
      </div>

      {error && <AlertBox>{error}</AlertBox>}

      <div className="grid gap-4 md:grid-cols-2">
        <KPICard label="Risk Score" value={`${accident.riskScore}%`} helper="Current road safety risk" tone="rose" />
        <KPICard label="Risk Level" value={accident.level} helper="Predicted from recent incidents" tone="amber" />
      </div>

      <ChartCard title="Zone Incidents" subtitle="Recent incidents grouped by operational zone">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={accident.zones} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
      </ChartCard>
    </div>
  );
}

export default Accident;
