import axios from 'axios';

export const DEFAULT_COUNTRY = 'India';
export const DEFAULT_STATE = 'Telangana';
export const FALLBACK_STATE_OPTIONS = [{ country: DEFAULT_COUNTRY, state: DEFAULT_STATE }];
export const FALLBACK_ZONE_OPTIONS = {
  [DEFAULT_STATE]: ['Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam', 'Mahbubnagar'],
};

export const DEFAULT_WATER_INPUTS = {
  ph: 7.2,
  hardness: 185,
  solids: 18000,
  chloramines: 3.2,
  sulfate: 310,
  conductivity: 420,
  organic_carbon: 11.8,
  temperature: 24.4,
  dissolved_oxygen: 7.6,
  turbidity: 3.1,
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  timeout: 8000,
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem('urbaniq_auth_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.user && parsed.user.email) {
          config.headers['X-User-Email'] = parsed.user.email;
          config.headers['X-User-Role'] = parsed.role;
        }
      }
    } catch (e) {
      // ignore
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const formatValidationDetail = (detail) => {
  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (item?.msg) {
        const loc = Array.isArray(item.loc) ? item.loc.slice(1).join('.') : item.loc;
        return loc ? `${loc}: ${item.msg}` : item.msg;
      }
      return JSON.stringify(item);
    });
    return `Input value is outside allowed range. Please enter valid numeric values. ${messages.join(' ')}`;
  }

  if (detail && typeof detail === 'object') {
    return detail.message || JSON.stringify(detail);
  }

  return null;
};

const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  const formatted = formatValidationDetail(detail);
  return formatted || error?.message || fallback;
};

const withRequest = async (request, fallbackMessage) => {
  try {
    const response = await request();
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: errorMessage(error, fallbackMessage) };
  }
};

export const getDefaultDateRange = (daysBack = 13) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - daysBack);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};

export const fetchMeta = () =>
  withRequest(() => apiClient.get('/api/meta'), 'Unable to load application metadata.');

export const fetchSession = () =>
  withRequest(() => apiClient.get('/auth/session'), 'Unable to verify session.');

export const loginRequest = (credentials) =>
  withRequest(() => apiClient.post('/auth/login', credentials), 'Unable to sign in.');

export const logoutRequest = () =>
  withRequest(() => apiClient.post('/auth/logout'), 'Unable to sign out.');

export const fetchDashboardData = ({ state = DEFAULT_STATE, zone } = {}) =>
  withRequest(
    () => apiClient.get('/api/dashboard', { params: { state, ...(zone ? { zone } : {}) } }),
    'Unable to load dashboard data.'
  );

export const fetchAqiAnalytics = ({ state = DEFAULT_STATE, zone, startDate, endDate } = {}) =>
  withRequest(
    () =>
      apiClient.get('/api/analytics/aqi', {
        params: { state, zone, start_date: startDate, end_date: endDate },
      }),
    'Unable to load AQI analytics.'
  );

export const fetchWaterAnalytics = ({ state = DEFAULT_STATE, zone, startDate, endDate } = {}) =>
  withRequest(
    () =>
      apiClient.get('/api/analytics/water', {
        params: { state, zone, start_date: startDate, end_date: endDate },
      }),
    'Unable to load water analytics.'
  );

export const fetchAccidentAnalytics = ({ state = DEFAULT_STATE, zone, startDate, endDate } = {}) =>
  withRequest(
    () =>
      apiClient.get('/api/analytics/accidents', {
        params: { state, zone, start_date: startDate, end_date: endDate },
      }),
    'Unable to load accident analytics.'
  );

export const fetchFuelAnalytics = ({ state = DEFAULT_STATE, zone, startDate, endDate } = {}) =>
  withRequest(
    () =>
      apiClient.get('/api/analytics/fuel', {
        params: { state, zone, start_date: startDate, end_date: endDate },
      }),
    'Unable to load fuel analytics.'
  );

export const fetchUploadHistory = () =>
  withRequest(() => apiClient.get('/api/admin/upload-history'), 'Unable to load upload history.');

export const uploadDataset = async ({ dataset, file, state = DEFAULT_STATE }) => {
  const formData = new FormData();
  formData.append('file', file);

  return withRequest(
    () =>
      apiClient.post(`/api/admin/upload/${dataset}`, formData, {
        params: { state },
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    `Unable to upload ${dataset} dataset.`
  );
};

export const buildExportUrl = ({ dataset, format = 'csv', state = DEFAULT_STATE, zone, startDate, endDate }) => {
  const params = new URLSearchParams({
    format,
    state,
    ...(zone ? { zone } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
  });
  return `${apiClient.defaults.baseURL}/api/export/${dataset}?${params.toString()}`;
};

export const predictWaterQuality = (params) =>
  withRequest(() => apiClient.post('/predict/water', params), 'Water prediction service is unavailable.');

export const predictAQICategory = (params) =>
  withRequest(() => apiClient.post('/predict/aqi', params), 'AQI prediction service is unavailable.');

export const predictAccidentRisk = (params) =>
  withRequest(() => apiClient.post('/predict/accident', params), 'Accident prediction service is unavailable.');
