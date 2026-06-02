import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoadingSkeleton from './components/LoadingSkeleton.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Sidebar from './components/Sidebar.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Accident from './pages/Accident.jsx';
import AdminData from './pages/AdminData.jsx';
import Air from './pages/Air.jsx';
import Dashboard from './pages/Dashboard.jsx';
import FuelMonitoring from './pages/FuelMonitoring.jsx';
import Login from './pages/Login.jsx';
import Water from './pages/Water.jsx';
import { DEFAULT_STATE, FALLBACK_STATE_OPTIONS, fetchMeta } from './services/api.js';

function AppShell({ selectedState, stateOptions, onStateChange }) {
  const { user, role, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} role={role} />

      <div className="lg:pl-64">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          selectedState={selectedState}
          stateOptions={stateOptions}
          onStateChange={onStateChange}
          user={user}
          role={role}
          onLogout={logout}
        />

        <main className="mx-auto max-w-7xl p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard selectedState={selectedState} />} />
            <Route path="/water" element={<Water selectedState={selectedState} />} />
            <Route path="/air" element={<Air selectedState={selectedState} />} />
            <Route path="/accidents" element={<Accident selectedState={selectedState} />} />
            <Route path="/fuel" element={<FuelMonitoring selectedState={selectedState} />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminData selectedState={selectedState} />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  const { authLoading, isAuthenticated } = useAuth();
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE);
  const [stateOptions, setStateOptions] = useState(FALLBACK_STATE_OPTIONS);

  useEffect(() => {
    const loadMeta = async () => {
      const response = await fetchMeta();
      if (response.data?.stateOptions?.length) {
        setStateOptions(response.data.stateOptions);
        setSelectedState(response.data.defaultState || response.data.stateOptions[0].state || DEFAULT_STATE);
      }
    };

    loadMeta();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[16rem_1fr]">
          <LoadingSkeleton lines={8} className="min-h-[80vh]" />
          <div className="space-y-6">
            <LoadingSkeleton lines={4} />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <LoadingSkeleton key={index} lines={3} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <AppShell
              selectedState={selectedState}
              stateOptions={stateOptions}
              onStateChange={setSelectedState}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
