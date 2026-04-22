import React, { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Water from './pages/Water.jsx';
import Air from './pages/Air.jsx';
import Accident from './pages/Accident.jsx';
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
            <Route path="/water" element={<Water />} />
            <Route path="/air" element={<Air />} />
            <Route path="/accidents" element={<Accident />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
