import React from 'react';

function WeatherWidget({ weather, title = 'Weather Overview' }) {
  if (!weather) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
        <div className="text-sm font-semibold text-gray-500">Weather data is unavailable right now.</div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{title}</p>
          <h3 className="mt-2 text-xl font-semibold text-gray-900">{weather.city}</h3>
          <p className="mt-1 text-sm text-gray-500">{weather.condition}</p>
        </div>

        <div className="text-right">
          {weather.icon && (
            <img
              className="mx-auto mb-2 h-14 w-14"
              src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
              alt={weather.condition}
            />
          )}
          <p className="text-3xl font-bold text-gray-900">{weather.temperature}°C</p>
          <p className="mt-1 text-sm text-gray-500">
            {weather.source === 'openweathermap' ? 'Live weather' : 'Fallback weather'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Humidity</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{weather.humidity}%</p>
        </div>
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Wind Speed</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{weather.wind_speed} m/s</p>
        </div>
      </div>

      {weather.last_updated && (
        <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Updated {new Date(weather.last_updated).toLocaleString()}
        </div>
      )}

      {Array.isArray(weather.insights) && weather.insights.length > 0 && (
        <div className="mt-5 space-y-2">
          {weather.insights.map((insight) => (
            <div key={insight} className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
              {insight}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default WeatherWidget;
