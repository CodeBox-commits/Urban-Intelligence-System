import React, { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Water from './pages/Water.jsx';
import Air from './pages/Air.jsx';
import Accident from './pages/Accident.jsx';
import Resources from './pages/Resources.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import AdminUpload from './pages/AdminUpload.jsx';
import { DEFAULT_STATE, stateOptions } from './services/api.js';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          selectedState={selectedState}
          stateOptions={stateOptions}
          onStateChange={setSelectedState}
        />
        <main className="mx-auto max-w-7xl p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard selectedState={selectedState} />} />
            <Route path="/water" element={<Water selectedState={selectedState} />} />
            <Route path="/air" element={<Air selectedState={selectedState} />} />
            <Route path="/resources" element={<Resources selectedState={selectedState} />} />
            <Route path="/accidents" element={<Accident selectedState={selectedState} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/admin/upload"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUpload selectedState={selectedState} />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
