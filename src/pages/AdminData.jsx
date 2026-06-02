import React, { useEffect, useMemo, useState } from 'react';
import LoadingSkeleton from '../components/LoadingSkeleton.jsx';
import Table from '../components/Table.jsx';
import { fetchUploadHistory, uploadDataset } from '../services/api.js';

const datasets = [
  { key: 'aqi', title: 'AQI Dataset', description: 'Columns: state, zone, date, aqi' },
  {
    key: 'water',
    title: 'Water Dataset',
    description:
      'Columns: state, zone, date, ph, turbidity, solids, chloramines, sulfate, conductivity, organic_carbon, hardness, temperature, dissolved_oxygen, potability',
  },
  {
    key: 'accident',
    title: 'Accident Dataset',
    description: 'Columns: state, zone, date, accident_count, severity, risk_score',
  },
  {
    key: 'resource',
    title: 'Resource Dataset',
    description: 'Columns: state, zone, date, utilization, electricity_load, sanitation_score, drainage_score',
  },
  {
    key: 'fuel',
    title: 'Fuel Dataset',
    description: 'Columns: state, zone, date, petrol_availability, diesel_availability, lpg_availability, ev_utilization',
  },
];

const historyColumns = [
  { key: 'dataset_name', header: 'Dataset' },
  { key: 'upload_date', header: 'Upload Date' },
  { key: 'rows_uploaded', header: 'Rows' },
  { key: 'uploaded_by', header: 'Uploaded By' },
];

function AdminData({ selectedState }) {
  const [uploads, setUploads] = useState({});
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    const response = await fetchUploadHistory();
    if (response.error) {
      setHistoryError(response.error);
    }
    setHistory(response.data?.items || []);
    setHistoryLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const updateDatasetState = (key, patch) => {
    setUploads((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
      },
    }));
  };

  const handleUpload = async (datasetKey) => {
    const current = uploads[datasetKey];
    if (!current?.file) {
      updateDatasetState(datasetKey, {
        status: 'error',
        message: 'Choose a CSV file first.',
      });
      return;
    }

    updateDatasetState(datasetKey, {
      status: 'uploading',
      message: '',
    });

    const response = await uploadDataset({
      dataset: datasetKey,
      file: current.file,
      state: selectedState,
    });

    if (response.error) {
      updateDatasetState(datasetKey, {
        status: 'error',
        message: response.error,
      });
      return;
    }

    updateDatasetState(datasetKey, {
      status: 'success',
      message: `Uploaded ${response.data.rowsInserted} rows successfully.`,
      rowCount: response.data.rowsInserted,
    });
    loadHistory();
  };

  const historyRows = useMemo(
    () =>
      history.map((item) => ({
        id: item.id,
        dataset_name: item.dataset_name,
        upload_date: new Date(item.upload_date).toLocaleString(),
        rows_uploaded: item.rows_uploaded,
        uploaded_by: item.uploaded_by,
      })),
    [history]
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Admin Panel</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Dataset Management</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Upload AQI, water, accident, resource, and fuel datasets. Analytics pages refresh automatically from the database after each upload.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
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
                    onChange={(event) =>
                      updateDatasetState(dataset.key, {
                        file: event.target.files?.[0] || null,
                        fileName: event.target.files?.[0]?.name || '',
                        status: '',
                        message: '',
                      })
                    }
                  />
                </label>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="font-semibold text-gray-800">{current.fileName || 'No file selected'}</p>
                  {current.rowCount ? <p className="mt-1">Rows inserted: {current.rowCount}</p> : null}
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
                  {current.status === 'uploading' ? 'Uploading...' : 'Upload Dataset'}
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Upload History</h2>
          <p className="mt-1 text-sm text-gray-500">Recent dataset uploads, row counts, and uploader details.</p>
        </div>

        {historyLoading ? (
          <LoadingSkeleton lines={6} />
        ) : (
          <>
            {historyError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-700">
                {historyError}
              </div>
            )}
            <Table columns={historyColumns} data={historyRows} />
          </>
        )}
      </section>
    </div>
  );
}

export default AdminData;
