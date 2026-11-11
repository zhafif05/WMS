import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute, RoleRoute } from './ProtectedRoute';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import WorkerLayout from '../layouts/WorkerLayout';
import QCLayout from '../layouts/QCLayout';

// Auth Pages
import Login from '../pages/auth/Login';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import AdminUsers from '../pages/admin/Users';
import AdminItems from '../pages/admin/Items';
import AdminTreatments from '../pages/admin/Treatments';
import AdminVendors from '../pages/admin/Vendors';
import AdminJobs from '../pages/admin/Jobs';
import AdminCreateJob from '../pages/admin/CreateJob';
import AdminJobDetail from '../pages/admin/JobDetail';
import AdminMonitoring from '../pages/admin/Monitoring';
import AdminHistory from '../pages/admin/History';

// Worker Pages
import WorkerDashboard from '../pages/worker/Dashboard';
import WorkerMyJobs from '../pages/worker/MyJobs';
import WorkerScanQR from '../pages/worker/ScanQR';
import WorkerTreatmentDetail from '../pages/worker/TreatmentDetail';
import WorkerHistory from '../pages/worker/History';

// QC Pages
import QCDashboard from '../pages/qc/Dashboard';
import QCInspections from '../pages/qc/Inspections';
import QCScanQR from '../pages/qc/ScanQR';
import QCInspectionDetail from '../pages/qc/InspectionDetail';
import QCHistory from '../pages/qc/History';

export const AppRoutes = () => {
  const { user, isAuthenticated } = useAuth();

  // Root redirector based on authenticated user's role
  const getRootRedirect = () => {
    if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'worker') return <Navigate to="/worker/dashboard" replace />;
    if (user.role === 'qc') return <Navigate to="/qc/dashboard" replace />;
    return <Navigate to="/login" replace />;
  };

  return (
    <Routes>
      {/* Root Path */}
      <Route path="/" element={getRootRedirect()} />

      {/* Public Login Route */}
      <Route
        path="/login"
        element={isAuthenticated ? getRootRedirect() : <Login />}
      />

      {/* Protected Routes Wrapper */}
      <Route element={<ProtectedRoute />}>
        {/* ================= ADMIN ROUTES ================= */}
        <Route element={<RoleRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="items" element={<AdminItems />} />
            <Route path="treatments" element={<AdminTreatments />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="jobs/create" element={<AdminCreateJob />} />
            <Route path="jobs/:id" element={<AdminJobDetail />} />
            <Route path="monitoring" element={<AdminMonitoring />} />
            <Route path="history" element={<AdminHistory />} />
          </Route>
        </Route>

        {/* ================= WORKER ROUTES ================= */}
        <Route element={<RoleRoute allowedRoles={['worker', 'admin']} />}>
          <Route path="/worker" element={<WorkerLayout />}>
            <Route index element={<Navigate to="/worker/dashboard" replace />} />
            <Route path="dashboard" element={<WorkerDashboard />} />
            <Route path="jobs" element={<WorkerMyJobs />} />
            <Route path="jobs/:jobId" element={<AdminJobDetail />} />
            <Route path="treatment/:jobId/:treatmentId" element={<WorkerTreatmentDetail />} />
            <Route path="scan" element={<WorkerScanQR />} />
            <Route path="history" element={<WorkerHistory />} />
          </Route>
        </Route>

        {/* ================= QC ROUTES ================= */}
        <Route element={<RoleRoute allowedRoles={['qc', 'admin']} />}>
          <Route path="/qc" element={<QCLayout />}>
            <Route index element={<Navigate to="/qc/dashboard" replace />} />
            <Route path="dashboard" element={<QCDashboard />} />
            <Route path="inspections" element={<QCInspections />} />
            <Route path="inspect/:id" element={<QCInspectionDetail />} />
            <Route path="scan" element={<QCScanQR />} />
            <Route path="history" element={<QCHistory />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="*" element={getRootRedirect()} />
    </Routes>
  );
};

export default AppRoutes;
