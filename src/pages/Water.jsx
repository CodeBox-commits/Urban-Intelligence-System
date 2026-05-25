import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard.jsx';
import ZoneSelector from '../components/ZoneSelector.jsx';
import { DEFAULT_WATER_INPUTS, predictWaterQuality } from '../services/api.js';

const waterFields = [
  ['ph', 'pH'],
  ['hardness', 'Hardness'],
  ['solids', 'Solids'],
  ['chloramines', 'Chloramines'],
  ['sulfate', 'Sulfate'],
  ['conductivity', 'Conductivity'],
  ['organic_carbon', 'Organic Carbon'],
  ['temperature', 'Temperature'],
  ['dissolved_oxygen', 'Dissolved Oxygen'],
  ['turbidity', 'Turbidity'],
];

const buildWaterForm = (inputs = {}) =>
  Object.fromEntries(
    waterFields.map(([field]) => [field, String(inputs[field] ?? DEFAULT_WATER_INPUTS[field])])
  );

function Water({ selectedState, zones, user, onSaveZone }) {
  const [selectedZone, setSelectedZone] = useState(zones[0]?.zone || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState(() => buildWaterForm());
  const [adminForm, setAdminForm] = useState({});

  React.useEffect(() => {
    setSelectedZone(zones[0]?.zone || '');
  }, [zones]);

  const zone = useMemo(() => zones.find((item) => item.zone === selectedZone) || zones[0], [selectedZone, zones]);

  React.useEffect(() => {
    if (!zone) return;

    const inputs = {
      ...DEFAULT_WATER_INPUTS,
      ...(zone.waterInputs || {}),
    };

    setAdminForm({
      water_quality: zone.water_quality,
      water_score: zone.water_score,
      ...inputs,
    });
    setForm(buildWaterForm(inputs));
    setResult(null);
    setError('');
  }, [zone]);

  if (!zone) {
    return <p className="text-sm text-gray-500">No area data available.</p>;
  }

  const waterInputs = {
    ...DEFAULT_WATER_INPUTS,
    ...(zone.waterInputs || {}),
  };

  const chartData = waterFields.map(([field, label]) => ({
    name: label,
    value: waterInputs[field] ?? 0,
  }));

  const onTestChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleTest = async (event) => {
    event.preventDefault();
    setTesting(true);
    setError('');
    setResult(null);
    const response = await predictWaterQuality({ ...form, zone: selectedZone });
    if (response.error) {
      setError(response.error);
    } else {
      setResult(response.data);
    }
    setTesting(false);
  };

  const handleAdminSave = (event) => {
    event.preventDefault();
    onSaveZone(selectedState, selectedZone, {
      water_quality: adminForm.water_quality,
      water_score: Number(adminForm.water_score),
      waterInputs: {
        ...Object.fromEntries(waterFields.map(([field]) => [field, Number(adminForm[field])])),
      },
    });
  };

  const predictionText =
    result && (typeof result.potability !== 'undefined' ? (result.potability === 1 ? 'Potable' : 'Not Potable') : result.result);
  const confidence =
    result && typeof result.confidence !== 'undefined'
      ? Number(result.confidence) <= 1
        ? `${(Number(result.confidence) * 100).toFixed(1)}%`
        : `${Number(result.confidence).toFixed(1)}%`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Water Quality</h1>
          <p className="mt-1 text-sm text-gray-500">Select an area to view and test water data.</p>
        </div>
        <ZoneSelector selectedZone={selectedZone} zoneOptions={zones.map((item) => item.zone)} onZoneChange={setSelectedZone} />
      </div>

      <section
        className={`rounded-2xl border p-5 ${
          zone.water_quality === 'Potable'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-rose-200 bg-rose-50 text-rose-800'
        }`}
      >
        <p className="text-sm font-medium">
          {selectedState} / {zone.zone}
        </p>
        <p className="mt-1 text-2xl font-bold">{zone.water_quality}</p>
        <p className="mt-1 text-sm">Water Score: {zone.water_score}%</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Water Parameter Snapshot" subtitle="Stored parameters for selected area">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Try Water Model</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleTest}>
            {waterFields.map(([field, label]) => (
              <label key={field} className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
                <input
                  name={field}
                  type="number"
                  step="0.1"
                  value={form[field]}
                  onChange={onTestChange}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </label>
            ))}
            <div className="sm:col-span-2">
              <button className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700" disabled={testing}>
                {testing ? 'Testing...' : 'Run Test'}
              </button>
            </div>
          </form>
          {result && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              <p className="font-semibold">Result: {predictionText}</p>
              {confidence && <p>Confidence: {confidence}</p>}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          )}
        </section>
      </div>

      {user.role === 'admin' && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Admin Update: {selectedZone}</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleAdminSave}>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Water Quality</span>
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
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Water Score</span>
              <input
                type="number"
                value={adminForm.water_score ?? 0}
                onChange={(event) => setAdminForm((current) => ({ ...current, water_score: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </label>
            {waterFields.map(([field, label]) => (
              <label key={field} className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
                <input
                  type="number"
                  step="0.1"
                  value={adminForm[field] ?? 0}
                  onChange={(event) => setAdminForm((current) => ({ ...current, [field]: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </label>
            ))}
            <div className="sm:col-span-2">
              <button className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black">Save Area Data</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

export default Water;
