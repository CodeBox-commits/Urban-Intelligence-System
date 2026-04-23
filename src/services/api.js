import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  timeout: 5000,
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
  const sulfate = Number(params.sulfate);
  const conductivity = Number(params.conductivity);
  const organicCarbon = Number(params.organic_carbon);
  const hardness = Number(params.hardness);
  const temperature = Number(params.temperature);
  const dissolvedOxygen = Number(params.dissolved_oxygen);

  const heuristicScore =
    (ph >= 6.4 && ph <= 8.6 ? 1 : 0) +
    (turbidity <= 5 ? 1 : 0) +
    (chloramines <= 4.5 ? 1 : 0) +
    (solids <= 24000 ? 1 : 0) +
    (sulfate >= 160 && sulfate <= 360 ? 1 : 0) +
    (conductivity >= 180 && conductivity <= 540 ? 1 : 0) +
    (organicCarbon <= 18 ? 1 : 0) +
    (hardness >= 80 && hardness <= 260 ? 1 : 0) +
    (temperature <= 30 ? 1 : 0) +
    (dissolvedOxygen >= 5.5 ? 1 : 0);
  const isPotable = heuristicScore >= 7;
  const fallback = {
    country: 'India',
    state: DEFAULT_STATE,
    zone: params.zone || 'Hyderabad',
    potability: isPotable ? 1 : 0,
    confidence: isPotable ? 0.86 : 0.81,
  };

  return withFallback(
    () => api.post('/predict/water', params),
    fallback,
    'API unavailable. Showing mock water prediction.',
    (data) => isValidApiData(data, fallback) && typeof data.potability !== 'undefined'
  );
};

export const predictAQICategory = (params) => {
  const pm25 = Number(params.pm25);
  const pm10 = Number(params.pm10);
  const no2 = Number(params.no2);
  const so2 = Number(params.so2);
  const co = Number(params.co);
  const o3 = Number(params.o3);
  const nh3 = Number(params.nh3);
  const temperature = Number(params.temperature);
  const humidity = Number(params.humidity);
  const windSpeed = Number(params.wind_speed);

  const score =
    0.5 * pm25 +
    0.18 * pm10 +
    0.12 * no2 +
    0.08 * so2 +
    18 * co +
    0.08 * o3 +
    0.05 * nh3 +
    0.12 * humidity -
    1.7 * windSpeed +
    Math.max(0, temperature - 32);

  let aqiCategory = 'Severe';
  if (score <= 60) aqiCategory = 'Good';
  else if (score <= 110) aqiCategory = 'Moderate';
  else if (score <= 170) aqiCategory = 'Poor';
  else if (score <= 240) aqiCategory = 'Very Poor';

  const fallback = {
    aqi_category: aqiCategory,
    confidence: 0.84,
  };

  return withFallback(
    () => api.post('/predict/aqi', params),
    fallback,
    'API unavailable. Showing mock AQI prediction.',
    (data) => isValidApiData(data, fallback) && Boolean(data.aqi_category)
  );
};

export const predictAccidentRisk = (params) => {
  const visibility = Number(params.visibility);
  const speedLimit = Number(params.speed_limit);

  const weatherScore = {
    Clear: 0,
    Drizzle: 1,
    Rain: 2,
    Fog: 3,
    Storm: 4,
  }[params.weather] || 0;

  const roadScore = {
    Rural: 0,
    Urban: 1,
    Highway: 2,
    Intersection: 3,
  }[params.road_type] || 0;

  const lightingScore = {
    Daylight: 0,
    'Dawn/Dusk': 1,
    'Night-lit': 2,
    'Night-unlit': 3,
  }[params.lighting] || 0;

  const trafficScore = {
    Low: 0,
    Medium: 1,
    High: 2,
    'Very High': 3,
  }[params.traffic_density] || 0;

  const timeScore = {
    Morning: 1,
    Afternoon: 0,
    Evening: 2,
    Night: 3,
  }[params.time_of_day] || 0;

  const totalRisk = weatherScore + roadScore + lightingScore + trafficScore + timeScore + Math.max(0, 5 - visibility) + speedLimit / 35;

  let accidentRisk = 'High';
  if (totalRisk <= 7) accidentRisk = 'Low';
  else if (totalRisk <= 11) accidentRisk = 'Medium';

  const fallback = {
    accident_risk: accidentRisk,
    confidence: 0.83,
  };

  return withFallback(
    () => api.post('/predict/accident', params),
    fallback,
    'API unavailable. Showing mock accident prediction.',
    (data) => isValidApiData(data, fallback) && Boolean(data.accident_risk)
  );
};
