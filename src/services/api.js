import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 2500,
});

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

const getStateConfig = (state = DEFAULT_STATE) => regionConfig[state] || regionConfig[DEFAULT_STATE];

const average = (items, key) => Math.round(items.reduce((total, item) => total + Number(item[key]), 0) / items.length);

const buildAqiTrend = (zones) =>
  days.map((day, dayIndex) =>
    zones.reduce(
      (row, zone) => ({
        ...row,
        [zone.zone]: zone.aqiTrend[dayIndex],
      }),
      { day }
    )
  );

const buildAlerts = (zones) =>
  zones.map((zone, index) => ({
    id: index + 1,
    country: zone.country,
    state: zone.state,
    zone: zone.zone,
    type: zone.riskLevel === 'High' ? 'High Risk Zone' : zone.water_quality === 'Needs Review' ? 'Water Review' : 'Routine Check',
    status: zone.riskLevel === 'High' ? 'Action Needed' : 'Monitoring',
    time: `${10 + index}:30 AM`,
  }));

const getDashboardMockData = (state = DEFAULT_STATE) => {
  const config = getStateConfig(state);
  const zones = config.zones;
  const potableZones = zones.filter((zone) => zone.water_quality === 'Potable').length;

  return {
    country: config.country,
    state: config.state,
    mapCenter: config.mapCenter,
    mapZoom: config.mapZoom,
    zones,
    zoneOptions: [`All ${config.state}`, ...zones.map((zone) => zone.zone)],
    kpis: [
      {
        label: 'AQI Level',
        value: String(average(zones, 'aqi')),
        helper: `Average across ${zones.length} ${config.state} zones`,
        tone: 'amber',
      },
      {
        label: 'Water Quality',
        value: `${Math.round((potableZones / zones.length) * 100)}%`,
        helper: `${potableZones}/${zones.length} zones potable`,
        tone: 'emerald',
      },
      {
        label: 'Accident Risk',
        value: `${average(zones, 'risk_score')}%`,
        helper: 'Average zone risk score',
        tone: 'orange',
      },
      {
        label: 'Alerts',
        value: String(zones.reduce((total, zone) => total + zone.alerts, 0)),
        helper: `Active alerts across ${config.state}`,
        tone: 'rose',
      },
    ],
    aqiTrend: buildAqiTrend(zones),
    accidentByZone: zones.map((zone) => ({
      zone: zone.zone,
      risk_score: zone.risk_score,
      riskLevel: zone.riskLevel,
    })),
    waterQualityByZone: zones.map((zone) => ({
      zone: zone.zone,
      water_score: zone.water_score,
      water_quality: zone.water_quality,
    })),
    alerts: buildAlerts(zones),
  };
};

const mockAirData = {
  aqi: 84,
  category: 'Moderate',
  pollutants: [
    { name: 'PM2.5', value: 42 },
    { name: 'PM10', value: 68 },
    { name: 'NO2', value: 31 },
    { name: 'SO2', value: 18 },
    { name: 'CO', value: 12 },
    { name: 'O3', value: 27 },
  ],
};

const mockAccidentData = {
  riskScore: 42,
  level: 'Medium',
  zones: [
    { zone: 'Hyderabad', incidents: 27 },
    { zone: 'Warangal', incidents: 18 },
    { zone: 'Karimnagar', incidents: 9 },
    { zone: 'Nizamabad', incidents: 11 },
    { zone: 'Khammam', incidents: 19 },
    { zone: 'Mahbubnagar', incidents: 24 },
  ],
};

const isValidApiData = (data, fallback) => {
  if (Array.isArray(fallback)) {
    return Array.isArray(data);
  }

  if (fallback && typeof fallback === 'object') {
    return data && typeof data === 'object' && !Array.isArray(data);
  }

  return typeof data === typeof fallback;
};

const withFallback = async (request, fallback, message, validate = isValidApiData) => {
  try {
    const response = await request();
    if (!validate(response.data, fallback)) {
      throw new Error('Invalid API response');
    }

    return { data: response.data, error: null, isMock: false };
  } catch {
    return { data: fallback, error: message, isMock: true };
  }
};

export const fetchDashboardData = (selectedState = DEFAULT_STATE) => {
  const fallback = getDashboardMockData(selectedState);

  return withFallback(
    () => api.get('/dashboard', { params: { state: selectedState } }),
    fallback,
    `API unavailable. Showing ${fallback.state} mock dashboard data.`,
    (data) =>
      isValidApiData(data, fallback) &&
      Array.isArray(data.kpis) &&
      Array.isArray(data.zones) &&
      Array.isArray(data.zoneOptions) &&
      Array.isArray(data.aqiTrend) &&
      Array.isArray(data.accidentByZone) &&
      Array.isArray(data.waterQualityByZone) &&
      Array.isArray(data.alerts)
  );
};

export const fetchAirQualityData = () =>
  withFallback(
    () => api.get('/air'),
    mockAirData,
    'API unavailable. Showing mock air quality data.',
    (data) => isValidApiData(data, mockAirData) && Array.isArray(data.pollutants)
  );

export const fetchAccidentData = () =>
  withFallback(
    () => api.get('/accidents'),
    mockAccidentData,
    'API unavailable. Showing mock accident data.',
    (data) => isValidApiData(data, mockAccidentData) && Array.isArray(data.zones)
  );

export const predictWaterQuality = (params) => {
  const ph = Number(params.ph);
  const turbidity = Number(params.turbidity);
  const chloramines = Number(params.chloramines);
  const solids = Number(params.solids);

  const isPotable = ph >= 6.5 && ph <= 8.5 && turbidity <= 5 && chloramines <= 4 && solids <= 25000;
  const fallback = {
    country: 'India',
    state: DEFAULT_STATE,
    zone: params.zone || 'Hyderabad',
    result: isPotable ? 'Potable' : 'Not Potable',
    confidence: isPotable ? 88 : 82,
  };

  return withFallback(
    () => api.post('/water/predict', params),
    fallback,
    'API unavailable. Showing mock water prediction.',
    (data) => isValidApiData(data, fallback) && Boolean(data.result)
  );
};
