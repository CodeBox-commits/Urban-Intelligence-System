
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Water from './pages/Water.jsx';
import Air from './pages/Air.jsx';
import Accident from './pages/Accident.jsx';
import Login from './pages/Login.jsx';
import AdminData from './pages/AdminData.jsx';
import { DEFAULT_STATE, regionConfig, stateOptions } from './services/api.js';

const STORAGE_KEY = 'urbaniq-zone-data';

const withDefaultWaterInputs = (zone) => ({
  ...zone,
  waterInputs: zone.waterInputs || {
    ph: 7.2,
    turbidity: 3.1,
    chloramines: 3.2,
    solids: 18000,
  },
});

const getInitialZoneData = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Object.fromEntries(
        Object.entries(parsed).map(([state, zones]) => [state, zones.map(withDefaultWaterInputs)])
      );
    }
  } catch {
    // Ignore localStorage parsing errors and fallback to config data.
  }

  return Object.fromEntries(
    Object.entries(regionConfig).map(([state, config]) => [state, config.zones.map(withDefaultWaterInputs)])
  );
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE);
  const [user, setUser] = useState(null);
  const [zoneDataByState, setZoneDataByState] = useState(getInitialZoneData);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(zoneDataByState));
  }, [zoneDataByState]);

  const selectedZones = useMemo(() => zoneDataByState[selectedState] || [], [zoneDataByState, selectedState]);

  const handleSaveZone = (state, zoneName, updates) => {
    setZoneDataByState((current) => ({
      ...current,
      [state]: (current[state] || []).map((zone) =>
        zone.zone === zoneName
          ? {
              ...zone,
              ...updates,
              waterInputs: {
                ...zone.waterInputs,
                ...(updates.waterInputs || {}),
              },
            }
          : zone
      ),
    }));
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} role={user.role} />

      <div className="lg:pl-64">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          selectedState={selectedState}
          stateOptions={stateOptions}
          onStateChange={setSelectedState}
          user={user}
          onLogout={() => setUser(null)}
        />
        <main className="mx-auto max-w-7xl p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  selectedState={selectedState}
                  zones={selectedZones}
                  user={user}
                  onSaveZone={handleSaveZone}
                />
              }
            />
            <Route
              path="/water"
              element={
                <Water
                  selectedState={selectedState}
                  zones={selectedZones}
                  user={user}
                  onSaveZone={handleSaveZone}
                />
              }
            />
            <Route
              path="/air"
              element={
                <Air
                  selectedState={selectedState}
                  zones={selectedZones}
                  user={user}
                  onSaveZone={handleSaveZone}
                />
              }
            />
            <Route
              path="/accidents"
              element={
                <Accident
                  selectedState={selectedState}
                  zones={selectedZones}
                  user={user}
                  onSaveZone={handleSaveZone}
                />
              }
            />
            <Route
              path="/admin"
              element={
                user.role === 'admin' ? (
                  <AdminData
                    selectedState={selectedState}
                    zones={selectedZones}
                    onSaveZone={handleSaveZone}
                  />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
