import React, { useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';

const numericFields = [
  { name: 'aqi', label: 'AQI' },
  { name: 'water_score', label: 'Water Score (%)' },
  { name: 'risk_score', label: 'Risk Score (%)' },
  { name: 'alerts', label: 'Active Alerts' },
  { name: 'ph', label: 'pH' },
  { name: 'turbidity', label: 'Turbidity' },
  { name: 'chloramines', label: 'Chloramines' },
  { name: 'solids', label: 'Solids' },
];

function AdminData({ selectedState, zones, onSaveZone }) {
  const [selectedZone, setSelectedZone] = useState(zones[0]?.zone || '');
  const [savedMessage, setSavedMessage] = useState('');

  const zone = useMemo(
    () => zones.find((item) => item.zone === selectedZone) || zones[0],
    [selectedZone, zones]
  );

  const [form, setForm] = useState({});

  React.useEffect(() => {
    if (!zone) return;
    setForm({
      aqi: zone.aqi,
      water_score: zone.water_score,
      water_quality: zone.water_quality,
      risk_score: zone.risk_score,
      riskLevel: zone.riskLevel,
      alerts: zone.alerts,
      ph: zone.waterInputs?.ph ?? 7,
      turbidity: zone.waterInputs?.turbidity ?? 3,
      chloramines: zone.waterInputs?.chloramines ?? 3,
      solids: zone.waterInputs?.solids ?? 18000,
    });
    setSavedMessage('');
  }, [zone]);

  if (!zones.length) {
    return <AlertBox>No zones configured for this state.</AlertBox>;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSaveZone(selectedState, selectedZone, {
      aqi: Number(form.aqi),
      water_score: Number(form.water_score),
      water_quality: form.water_quality,
      risk_score: Number(form.risk_score),
      riskLevel: form.riskLevel,
      alerts: Number(form.alerts),
      waterInputs: {
        ph: Number(form.ph),
        turbidity: Number(form.turbidity),
        chloramines: Number(form.chloramines),
        solids: Number(form.solids),
      },
    });
    setSavedMessage(`Saved ${selectedZone} values.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Admin Area Data</h1>
        <p className="mt-1 text-sm text-gray-500">Update metrics by area.</p>
      </div>

      {savedMessage && <AlertBox>{savedMessage}</AlertBox>}

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">Area</span>
            <select
              value={selectedZone}
              onChange={(event) => setSelectedZone(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            >
              {zones.map((item) => (
                <option key={item.zone} value={item.zone}>
                  {item.zone}
                </option>
              ))}
            </select>
          </label>

          {numericFields.map((field) => (
            <label key={field.name} className="space-y-2">
              <span className="text-sm font-medium text-gray-700">{field.label}</span>
              <input
                name={field.name}
                value={form[field.name] ?? ''}
                onChange={handleChange}
                type="number"
                step="0.1"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </label>
          ))}

          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Water Quality</span>
            <select
              name="water_quality"
              value={form.water_quality ?? 'Potable'}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            >
              <option value="Potable">Potable</option>
              <option value="Needs Review">Needs Review</option>
              <option value="Not Potable">Not Potable</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700">Risk Level</span>
            <select
              name="riskLevel"
              value={form.riskLevel ?? 'Low'}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Save Area Data
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AdminData;
