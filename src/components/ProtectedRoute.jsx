import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSkeleton from './LoadingSkeleton.jsx';

function AccessDenied() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">Restricted</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Admin access required</h1>
      <p className="mt-2 text-sm text-gray-500">Your account can view analytics, but upload and edit tools are admin only.</p>
    </div>
  );
}

function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation();
  const { authLoading, isAuthenticated, role } = useAuth();

  if (authLoading) {
    return <LoadingSkeleton lines={4} className="h-56 rounded-2xl" />;
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <AccessDenied />;
  }

  return children;
}

export default ProtectedRoute;
