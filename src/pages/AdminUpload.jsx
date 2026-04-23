import React, { useState } from 'react';
import { uploadDatasetRows, normalizeDatasetRows, parseCsvFile } from '../services/dataService.js';

const datasets = [
  {
    key: 'aqi_data',
    title: 'AQI Dataset',
    description: 'Columns: state, zone, date, aqi',
  },
  {
    key: 'accident_data',
    title: 'Accident Dataset',
    description: 'Columns: state, zone, date, accident_count, severity',
  },
  {
    key: 'water_data',
    title: 'Water Dataset',
    description: 'Columns: zone, ph, turbidity, solids, potability',
  },
];

function AdminUpload({ selectedState }) {
  const [uploads, setUploads] = useState({});

  const updateDatasetState = (key, patch) => {
    setUploads((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
      },
    }));
  };

  const handleFileChange = async (datasetKey, file) => {
    if (!file) return;

    updateDatasetState(datasetKey, {
      file,
      status: 'parsing',
      message: '',
      fileName: file.name,
      rowCount: 0,
    });

    try {
      const parsedRows = await parseCsvFile(file);
      const normalizedRows = normalizeDatasetRows(datasetKey, parsedRows, selectedState);

      updateDatasetState(datasetKey, {
        parsedRows: normalizedRows,
        status: 'ready',
        rowCount: normalizedRows.length,
        message: normalizedRows.length ? 'File parsed successfully.' : 'No valid rows found in CSV.',
      });
    } catch (error) {
      updateDatasetState(datasetKey, {
        status: 'error',
        message: error.message || 'Unable to parse CSV file.',
      });
    }
  };

  const handleUpload = async (datasetKey) => {
    const current = uploads[datasetKey];
    if (!current?.parsedRows?.length) {
      updateDatasetState(datasetKey, {
        status: 'error',
        message: 'Choose a valid CSV before uploading.',
      });
      return;
    }

    updateDatasetState(datasetKey, {
      status: 'uploading',
      message: '',
    });

    const response = await uploadDatasetRows(datasetKey, current.parsedRows);

    if (response.error) {
      updateDatasetState(datasetKey, {
        status: 'error',
        message: response.error,
      });
      return;
    }

    updateDatasetState(datasetKey, {
      status: 'success',
      message: `Uploaded ${response.data.insertedCount} rows successfully.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Admin Panel</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Dataset Upload</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Upload CSV files for AQI, accidents, and water samples. Uploaded datasets feed the analytics pages automatically.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {datasets.map((dataset) => {
          const current = uploads[dataset.key] || {};

          return (
            <section
              key={dataset.key}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-gray-900">{dataset.title}</h2>
              <p className="mt-1 text-sm text-gray-500">{dataset.description}</p>

              <div className="mt-5 space-y-4">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center transition hover:border-blue-200 hover:bg-blue-50/40">
                  <span className="text-sm font-semibold text-gray-700">Choose CSV file</span>
                  <span className="mt-1 text-xs text-gray-500">Selected state: {selectedState}</span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(event) => handleFileChange(dataset.key, event.target.files?.[0])}
                  />
                </label>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="font-semibold text-gray-800">{current.fileName || 'No file selected'}</p>
                  <p className="mt-1">Rows: {current.rowCount || 0}</p>
                </div>

                {current.message && (
                  <div
                    className={`rounded-xl border p-4 text-sm font-medium ${
                      current.status === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : current.status === 'error'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}
                  >
                    {current.message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleUpload(dataset.key)}
                  disabled={current.status === 'uploading'}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {current.status === 'uploading' ? 'Uploading...' : 'Upload CSV'}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default AdminUpload;
