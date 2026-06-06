
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Water from './pages/Water.jsx';
import Air from './pages/Air.jsx';
import Accident from './pages/Accident.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import AdminData from './pages/AdminData.jsx';
import LoadingSkeleton from './components/LoadingSkeleton.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { DEFAULT_STATE, DEFAULT_WATER_INPUTS, regionConfig, stateOptions } from './services/api.js';

const STORAGE_KEY = 'urbaniq-zone-data';

const withDefaultWaterInputs = (zone) => ({
  ...zone,
  waterInputs: {
    ...DEFAULT_WATER_INPUTS,
    ...(zone.waterInputs || {}),
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
  const [zoneDataByState, setZoneDataByState] = useState(getInitialZoneData);
  const { authLoading, isAuthenticated, user, role, logout } = useAuth();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(zoneDataByState));
  }, [zoneDataByState]);

  const selectedZones = useMemo(() => zoneDataByState[selectedState] || [], [zoneDataByState, selectedState]);
  const appUser = useMemo(
    () => ({
      ...user,
      name: user?.user_metadata?.name || user?.email || 'User',
      email: user?.email,
      role,
    }),
    [role, user]
  );

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <LoadingSkeleton lines={5} className="mx-auto mt-16 h-72 max-w-xl rounded-2xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} role={appUser.role} />

      <div className="lg:pl-64">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          selectedState={selectedState}
          stateOptions={stateOptions}
          onStateChange={setSelectedState}
          user={appUser}
          onLogout={logout}
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
                  user={appUser}
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
                  user={appUser}
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
                  user={appUser}
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
                  user={appUser}
                  onSaveZone={handleSaveZone}
                />
              }
            />
            <Route
              path="/admin"
              element={
                appUser.role === 'admin' ? (
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
