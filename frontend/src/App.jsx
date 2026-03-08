import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import Products from './pages/Products';
import AgencyProducts from './pages/AgencyProducts';
import Imports from './pages/Imports';
import Exports from './pages/Exports';
import Stock from './pages/Stock';
import Requests from './pages/Requests';
import Analytics from './pages/Analytics';
import Upload from './pages/Upload';
import MLPredict from './pages/MLPredict';

function NavigateToRole() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/agency'} replace />;
}

function PrivateRoute({ children, adminOnly, agencyOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/agency" replace />;
  if (agencyOnly && user.role !== 'agency') return <Navigate to="/dashboard" replace />;
  return children;
}

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Outlet />;
  return (
    <PrivateRoute>
      <Layout />
    </PrivateRoute>
  );
}

function LandingOrDashboard() {
  const { user } = useAuth();
  if (user) return <NavigateToRole />;
  return <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />}>
        <Route index element={<LandingOrDashboard />} />
        <Route
          path="dashboard"
          element={
            <PrivateRoute adminOnly>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route path="agency" element={<PrivateRoute agencyOnly><UserDashboard /></PrivateRoute>} />
        <Route path="agency-products" element={<PrivateRoute agencyOnly><AgencyProducts /></PrivateRoute>} />
        <Route path="products" element={<PrivateRoute adminOnly><Products /></PrivateRoute>} />
        <Route path="imports" element={<PrivateRoute adminOnly><Imports /></PrivateRoute>} />
        <Route path="exports" element={<PrivateRoute adminOnly><Exports /></PrivateRoute>} />
        <Route path="stock" element={<PrivateRoute adminOnly><Stock /></PrivateRoute>} />
        <Route path="requests" element={<PrivateRoute><Requests /></PrivateRoute>} />
        <Route path="analytics" element={<PrivateRoute adminOnly><Analytics /></PrivateRoute>} />
        <Route path="upload" element={<PrivateRoute adminOnly><Upload /></PrivateRoute>} />
        <Route path="predict" element={<PrivateRoute adminOnly><MLPredict /></PrivateRoute>} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
