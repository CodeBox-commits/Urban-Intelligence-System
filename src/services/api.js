import axios from 'axios';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  timeout: 5000,
});

// Attach Supabase access token to backend requests when available
api.interceptors.request.use(async (config) => {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (e) {
    // ignore and continue without token
  }
  return config;
});

export const DEFAULT_STATE = 'Telangana';

export const regionConfig = {
  Telangana: {
    country: 'India',
    state: 'Telangana',
    mapCenter: [17.385, 78.4867],
    mapZoom: 7,
    zones: [
      {
        country: 'India',
        state: 'Telangana',
        zone: 'Hyderabad',
        coordinates: [17.385, 78.4867],
        riskLevel: 'High',
        markerColor: 'red',
        aqi: 84,
        water_quality: 'Potable',
        water_score: 88,
        risk_score: 76,
        alerts: 6,
        aqiTrend: [78, 82, 84, 90, 86, 80, 84],
      },
      {
        country: 'India',
        state: 'Telangana',
        zone: 'Warangal',
        coordinates: [17.9689, 79.5941],
        riskLevel: 'Medium',
        markerColor: 'orange',
        aqi: 72,
        water_quality: 'Potable',
        water_score: 82,
        risk_score: 48,
        alerts: 4,
        aqiTrend: [68, 70, 72, 75, 74, 71, 72],
      },
      {
        country: 'India',
        state: 'Telangana',
        zone: 'Karimnagar',
        coordinates: [18.4386, 79.1288],
        riskLevel: 'Low',
        markerColor: 'green',
        aqi: 58,
        water_quality: 'Potable',
        water_score: 91,
        risk_score: 26,
        alerts: 2,
        aqiTrend: [55, 57, 58, 60, 59, 56, 58],
      },
      {
        country: 'India',
        state: 'Telangana',
        zone: 'Nizamabad',
        coordinates: [18.6725, 78.0941],
        riskLevel: 'Low',
        markerColor: 'green',
        aqi: 62,
        water_quality: 'Potable',
        water_score: 86,
        risk_score: 31,
        alerts: 3,
        aqiTrend: [60, 61, 62, 65, 63, 61, 62],
      },
      {
        country: 'India',
        state: 'Telangana',
        zone: 'Khammam',
        coordinates: [17.2473, 80.1514],
        riskLevel: 'Medium',
        markerColor: 'orange',
        aqi: 70,
        water_quality: 'Needs Review',
        water_score: 74,
        risk_score: 52,
        alerts: 5,
        aqiTrend: [65, 68, 70, 73, 72, 69, 70],
      },
      {
        country: 'India',
        state: 'Telangana',
        zone: 'Mahbubnagar',
        coordinates: [16.7375, 78.0081],
        riskLevel: 'High',
        markerColor: 'red',
        aqi: 79,
        water_quality: 'Needs Review',
        water_score: 68,
        risk_score: 69,
        alerts: 7,
        aqiTrend: [74, 76, 79, 82, 80, 77, 79],
      },
    ],
  },
};

export const stateOptions = Object.values(regionConfig).map(({ country, state }) => ({
  country,
  state,
}));

export const fetchDashboardData = async (selectedState = DEFAULT_STATE) => {
  try {
    const response = await api.get('/dashboard', { params: { state: selectedState } });
    return { data: response.data, error: null, isMock: false };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Unable to fetch dashboard data from the backend.';
    return { data: null, error: message.toString(), isMock: false };
  }
};

export const fetchAirQualityData = async () => {
  try {
    const response = await api.get('/analytics/aqi');
    return { data: response.data, error: null, isMock: false };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Unable to fetch air quality data from the backend.';
    return { data: null, error: message.toString(), isMock: false };
  }
};

export const fetchAccidentData = async () => {
  try {
    const response = await api.get('/analytics/accidents');
    return { data: response.data, error: null, isMock: false };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Unable to fetch accident data from the backend.';
    return { data: null, error: message.toString(), isMock: false };
  }
};

export const predictWaterQuality = async (params) => {
  try {
    const response = await api.post('/predict/water', params);
    return { data: response.data, error: null, isMock: false };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Unable to execute water quality prediction.';
    return { data: null, error: message.toString(), isMock: false };
  }
};

export const predictAQICategory = async (params) => {
  try {
    const response = await api.post('/predict/aqi', params);
    return { data: response.data, error: null, isMock: false };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Unable to execute AQI prediction.';
    return { data: null, error: message.toString(), isMock: false };
  }
};

export const predictAccidentRisk = async (params) => {
  try {
    const response = await api.post('/predict/accident', params);
    return { data: response.data, error: null, isMock: false };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Unable to execute accident risk prediction.';
    return { data: null, error: message.toString(), isMock: false };
  }
};

export const predictResourceAnomaly = async (params) => {
  try {
    const response = await api.post('/predict/resource', params);
    return { data: response.data, error: null, isMock: false };
  } catch (err) {
    const message = err?.response?.data?.detail || 'Unable to execute resource anomaly prediction.';
    return { data: null, error: message.toString(), isMock: false };
  }
};
