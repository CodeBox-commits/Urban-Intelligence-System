import Papa from 'papaparse';
import { DEFAULT_STATE, regionConfig } from './api.js';
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

export const getZoneOptionsForState = (state = DEFAULT_STATE) => {
  const config = regionConfig[state] || regionConfig[DEFAULT_STATE];
  return [`All ${config.state}`, ...config.zones.map((zone) => zone.zone)];
};

const getSeverityLabel = (count) => {
  if (count >= 7) return 'High';
  if (count >= 4) return 'Medium';
  return 'Low';
};

const groupByDate = (rows, valueKey, reducer) =>
  Object.values(
    rows.reduce((accumulator, row) => {
      const key = row.date;
      if (!accumulator[key]) {
        accumulator[key] = { date: key, value: Number(row[valueKey]), count: 1 };
      } else {
        accumulator[key].value = reducer(accumulator[key].value, Number(row[valueKey]));
        accumulator[key].count += 1;
      }

      return accumulator;
    }, {})
  )
    .map((row) => ({
      date: row.date,
      value: reducer === sumValues ? row.value : Math.round(row.value / row.count),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));

const sumValues = (left, right) => left + right;
const averageValues = (left, right) => left + right;

const filterRows = (rows, { state, zone, startDate, endDate }) =>
  rows.filter((row) => {
    const matchesState = !state || row.state === state;
    const matchesZone = !zone || zone.startsWith('All ') || row.zone === zone;
    const matchesStart = !startDate || row.date >= startDate;
    const matchesEnd = !endDate || row.date <= endDate;
    return matchesState && matchesZone && matchesStart && matchesEnd;
  });

const getLatestRows = (rows) => {
  if (!rows.length) return [];
  const latestDate = rows.reduce((latest, row) => (row.date > latest ? row.date : latest), rows[0].date);
  return rows.filter((row) => row.date === latestDate);
};

const getAqiCategory = (aqi) => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  return 'Very Unhealthy';
};

const buildPollutants = (aqiValue) => [
  { name: 'PM2.5', value: Math.round(aqiValue * 0.5) },
  { name: 'PM10', value: Math.round(aqiValue * 0.8) },
  { name: 'NO2', value: Math.round(aqiValue * 0.36) },
  { name: 'SO2', value: Math.round(aqiValue * 0.22) },
  { name: 'CO', value: Math.round(aqiValue * 0.14) },
  { name: 'O3', value: Math.round(aqiValue * 0.32) },
];

const buildZoneTotals = (rows, valueKey) =>
  Object.values(
    rows.reduce((accumulator, row) => {
      if (!accumulator[row.zone]) {
        accumulator[row.zone] = { zone: row.zone, total: Number(row[valueKey]) };
      } else {
        accumulator[row.zone].total += Number(row[valueKey]);
      }
      return accumulator;
    }, {})
  );

const getRiskLevel = (score) => {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
};

const buildEmptyAqiAnalytics = (state = DEFAULT_STATE) => ({
  zoneOptions: getZoneOptionsForState(state),
  currentAqi: null,
  category: 'No Data',
  pollutants: [],
  trend: [],
  latestDate: null,
  dataSource: 'supabase',
});

const buildEmptyAccidentAnalytics = (state = DEFAULT_STATE) => ({
  zoneOptions: getZoneOptionsForState(state),
  totalIncidents: 0,
  riskScore: 0,
  riskLevel: 'No Data',
  trend: [],
  zoneTotals: [],
  dataSource: 'supabase',
});

const getSupabaseConfigError = () =>
  !isSupabaseConfigured || !supabase
    ? 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    : null;

export const fetchAQIAnalytics = async (filters) => {
  const state = filters.state || DEFAULT_STATE;
  const zoneOptions = getZoneOptionsForState(state);
  const configError = getSupabaseConfigError();

  if (configError) {
    return {
      error: configError,
      data: buildEmptyAqiAnalytics(state),
    };
  }

  let query = supabase.from('aqi_data').select('id,state,zone,date,aqi').eq('state', state).order('date', {
    ascending: true,
  });

  if (filters.zone && !filters.zone.startsWith('All ')) {
    query = query.eq('zone', filters.zone);
  }
  if (filters.startDate) {
    query = query.gte('date', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('date', filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    return {
      error: error.message,
      data: buildEmptyAqiAnalytics(state),
    };
  }

  const rows = Array.isArray(data) ? data.map((row) => ({ country: 'India', ...row })) : [];
  const filteredRows = filterRows(rows, filters);
  const latestRows = getLatestRows(filteredRows);
  const currentAqi = latestRows.length
    ? Math.round(latestRows.reduce((total, row) => total + Number(row.aqi), 0) / latestRows.length)
    : null;
  const trend = groupByDate(filteredRows, 'aqi', averageValues);

  return {
    error: null,
    data: {
      zoneOptions,
      currentAqi,
      category: currentAqi !== null ? getAqiCategory(currentAqi) : 'No Data',
      pollutants: currentAqi !== null ? buildPollutants(currentAqi) : [],
      trend,
      latestDate: latestRows[0]?.date || null,
      dataSource: 'supabase',
    },
  };
};

export const fetchAccidentAnalytics = async (filters) => {
  const state = filters.state || DEFAULT_STATE;
  const zoneOptions = getZoneOptionsForState(state);
  const configError = getSupabaseConfigError();

  if (configError) {
    return {
      error: configError,
      data: buildEmptyAccidentAnalytics(state),
    };
  }

  let query = supabase
    .from('accident_data')
    .select('id,state,zone,date,accident_count,severity')
    .eq('state', state)
    .order('date', { ascending: true });

  if (filters.zone && !filters.zone.startsWith('All ')) {
    query = query.eq('zone', filters.zone);
  }
  if (filters.startDate) {
    query = query.gte('date', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('date', filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    return {
      error: error.message,
      data: buildEmptyAccidentAnalytics(state),
    };
  }

  const rows = Array.isArray(data) ? data.map((row) => ({ country: 'India', ...row })) : [];
  const filteredRows = filterRows(rows, filters);
  const trend = groupByDate(filteredRows, 'accident_count', sumValues);
  const zoneTotals = buildZoneTotals(filteredRows, 'accident_count').map((row) => ({
    zone: row.zone,
    incidents: row.total,
  }));
  const totalIncidents = filteredRows.reduce((total, row) => total + Number(row.accident_count), 0);
  const averagePerDay = trend.length ? Math.round(totalIncidents / trend.length) : 0;
  const riskScore = Math.min(100, averagePerDay * 12);
  const riskLevel = filteredRows.length ? getRiskLevel(riskScore) : 'No Data';

  return {
    error: null,
    data: {
      zoneOptions,
      totalIncidents,
      riskScore,
      riskLevel,
      trend,
      zoneTotals,
      dataSource: 'supabase',
    },
  };
};

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';
const toFiniteNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeSeverity = (severity, accidentCount) => {
  const normalizedSeverity = typeof severity === 'string' ? severity.trim().toLowerCase() : '';
  if (normalizedSeverity === 'high') return 'High';
  if (normalizedSeverity === 'medium') return 'Medium';
  if (normalizedSeverity === 'low') return 'Low';
  return getSeverityLabel(accidentCount);
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
      .map((row) => ({
        state: row.state || state,
        zone: row.zone,
        date: row.date,
        aqi: toFiniteNumber(row.aqi),
      }))
      .filter((row) => hasValue(row.zone) && hasValue(row.date) && row.aqi !== null);
  }

  if (datasetType === 'accident_data') {
    return rows
      .map((row) => {
        const accidentCount = toFiniteNumber(row.accident_count);
        return {
          state: row.state || state,
          zone: row.zone,
          date: row.date,
          accident_count: accidentCount,
          severity: normalizeSeverity(row.severity, accidentCount || 0),
        };
      })
      .filter((row) => hasValue(row.zone) && hasValue(row.date) && row.accident_count !== null)
      .map((row) => ({
        state: row.state || state,
        zone: row.zone,
        date: row.date,
        accident_count: Math.trunc(row.accident_count),
        severity: row.severity,
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

  return [];
};

export const uploadDatasetRows = async (tableName, rows) => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  if (!rows.length) {
    return { data: null, error: 'No valid rows found in the uploaded CSV.' };
  }

  const chunkSize = 250;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from(tableName).insert(chunk);
    if (error) {
      return { data: null, error: error.message };
    }
  }

  return {
    data: {
      insertedCount: rows.length,
    },
    error: null,
  };
};
