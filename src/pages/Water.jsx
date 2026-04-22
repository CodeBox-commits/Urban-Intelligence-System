import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AlertBox from '../components/AlertBox.jsx';
import ChartCard from '../components/ChartCard.jsx';
import { DEFAULT_STATE, predictWaterQuality, regionConfig } from '../services/api.js';

const initialForm = {
  zone: 'Hyderabad',
  ph: '7.2',
  hardness: '185',
  solids: '18000',
  chloramines: '3.2',
  sulfate: '310',
  conductivity: '420',
  turbidity: '3.1',
};

const fields = [
  { name: 'ph', label: 'pH' },
  { name: 'hardness', label: 'Hardness' },
  { name: 'solids', label: 'Solids' },
  { name: 'chloramines', label: 'Chloramines' },
  { name: 'sulfate', label: 'Sulfate' },
  { name: 'conductivity', label: 'Conductivity' },
  { name: 'turbidity', label: 'Turbidity' },
];

const zoneOptions = regionConfig[DEFAULT_STATE].zones.map((zone) => zone.zone);

function Water() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const chartData = useMemo(
    () =>
      fields.map((field) => ({
        name: field.label,
        value: Number(form[field.name]) || 0,
      })),
    [form]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const response = await predictWaterQuality(form);
    setResult(response.data);
    setError(response.error || '');
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Water Potability</h1>
        <p className="mt-1 text-sm text-gray-500">Enter sample parameters and predict drinking water safety.</p>
      </div>

      {error && <AlertBox>{error}</AlertBox>}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
          <h2 className="text-xl font-semibold text-gray-900">Water Parameters</h2>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-gray-600">Zone</span>
              <select
                name="zone"
                value={form.zone}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              >
                {zoneOptions.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>

            {fields.map((field) => (
              <label key={field.name} className="space-y-2">
                <span className="text-sm font-medium text-gray-600">{field.label}</span>
                <input
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  type="number"
                  step="0.1"
                  className="w-full rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </label>
            ))}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {loading ? 'Predicting...' : 'Predict'}
              </button>
            </div>
          </form>

          {result && (
            <div
              className={`mt-5 rounded-2xl border p-5 transition-all duration-200 ${
                result.result === 'Potable'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              <p className="text-sm font-medium">Prediction Result</p>
              <p className="mt-1 text-2xl font-bold">{result.result}</p>
              <p className="mt-1 text-sm">Zone: {result.zone}</p>
              <p className="mt-1 text-sm">Confidence: {result.confidence}%</p>
            </div>
          )}
        </section>

        <ChartCard title="Parameter Snapshot" subtitle="Current values entered for prediction">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="name"
                angle={-20}
                axisLine={false}
                interval={0}
                textAnchor="end"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickLine={false}
              />
              <YAxis axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                }}
              />
              <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

export default Water;
