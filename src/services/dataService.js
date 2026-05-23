import Papa from 'papaparse';
import { DEFAULT_STATE } from './api.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const toIsoDate = (date) => date.toISOString().split('T')[0];

export const getDefaultDateRange = (daysBack = 13) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - daysBack);

  return {
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
  };
};

const getDateSeries = (length = 14) => {
  const endDate = new Date();
  const dates = [];

  for (let index = length - 1; index >= 0; index -= 1) {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - index);
    dates.push(toIsoDate(date));
  }

  return dates;
};

export const fetchAQIAnalytics = async (filters) => {
  const state = filters.state || DEFAULT_STATE;
  try {
    const resp = await api.get('/analytics/aqi', {
      params: { state, zone: filters.zone, start_date: filters.startDate, end_date: filters.endDate },
    });
    return { error: null, data: resp.data };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Unable to fetch AQI analytics from the backend.';
    return { error: message.toString(), data: null };
  }
};

export const fetchAccidentAnalytics = async (filters) => {
  const state = filters.state || DEFAULT_STATE;
  try {
    const resp = await api.get('/analytics/accidents', {
      params: { state, zone: filters.zone, start_date: filters.startDate, end_date: filters.endDate },
    });
    return { error: null, data: resp.data };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Unable to fetch accident analytics from the backend.';
    return { error: message.toString(), data: null };
  }
};

export const fetchResourceAnalytics = async (filters) => {
  const state = filters.state || DEFAULT_STATE;
  try {
    const resp = await api.get('/analytics/resources', {
      params: { state, zone: filters.zone, start_date: filters.startDate, end_date: filters.endDate },
    });
    return { error: null, data: resp.data };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Unable to fetch resource analytics from the backend.';
    return { error: message.toString(), data: null };
  }
};

const normalizeKeys = (row) =>
  Object.entries(row).reduce((accumulator, [key, value]) => {
    accumulator[key.trim().toLowerCase()] = typeof value === 'string' ? value.trim() : value;
    return accumulator;
  }, {});

export const parseCsvFile = (file) =>
  new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data.map(normalizeKeys)),
      error: (error) => reject(error),
    });
  });

export const normalizeDatasetRows = (datasetType, rows, state = DEFAULT_STATE) => {
  if (datasetType === 'aqi_data') {
    return rows
      .filter((row) => row.zone && row.date && row.aqi)
      .map((row) => ({
        state: row.state || state,
        zone: row.zone,
        date: row.date,
        aqi: Number(row.aqi),
      }));
  }

  if (datasetType === 'accident_data') {
    return rows
      .filter((row) => row.zone && row.date && row.accident_count)
      .map((row) => ({
        state: row.state || state,
        zone: row.zone,
        date: row.date,
        accident_count: Number(row.accident_count),
        severity: row.severity || getSeverityLabel(Number(row.accident_count)),
      }));
  }

  if (datasetType === 'water_data') {
    return rows
      .filter((row) => row.zone && row.ph && row.turbidity && row.solids && row.potability)
      .map((row) => ({
        zone: row.zone,
        ph: Number(row.ph),
        turbidity: Number(row.turbidity),
        solids: Number(row.solids),
        potability: row.potability,
      }));
  }

  if (datasetType === 'resource_data') {
    return rows
      .filter((row) => row.zone && (row.power_usage || row.water_usage || row.gas_usage))
      .map((row) => ({
        state: row.state || state,
        zone: row.zone,
        timestamp: row.timestamp || row.date,
        power_usage: Number(row.power_usage || 0),
        water_usage: Number(row.water_usage || 0),
        gas_usage: Number(row.gas_usage || 0),
        temperature: row.temperature ? Number(row.temperature) : undefined,
        humidity: row.humidity ? Number(row.humidity) : undefined,
        usage_score: row.usage_score ? Number(row.usage_score) : undefined,
        anomaly: row.anomaly ? (Number(row.anomaly) ? 1 : 0) : 0,
      }));
  }

  return [];
};

export const uploadDatasetRows = async (tableName, rows) => {
  if (!rows.length) return { data: null, error: 'No valid rows found in the uploaded CSV.' };

  // Prefer backend admin upload endpoint. Backend will validate Supabase token.
  try {
    const resp = await api.post('/admin/upload', { dataset_type: tableName, rows });
    if (resp?.data) return { data: resp.data, error: null };
  } catch (err) {
    // fall through to client-side supabase fallback
  }

  // Fallback: insert directly into Supabase if configured
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'No backend and Supabase not configured. Cannot upload.' };
  }

  const chunkSize = 250;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from(tableName).insert(chunk);
    if (error) return { data: null, error: error.message };
  }

  return { data: { insertedCount: rows.length }, error: null };
};
