import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import './Layout.css';

// SVG Icon Components
const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconPackage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const IconDownload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconUpload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const IconTag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const IconClipboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
);

const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
);

const IconCpu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
  </svg>
);

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="15" y2="18"/>
  </svg>
);

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const IconWarning = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconShield = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const adminNav = [
  { to: '/dashboard', label: 'Dashboard', icon: <IconHome /> },
  { to: '/products', label: 'Products', icon: <IconPackage /> },
  { to: '/imports', label: 'Imports', icon: <IconDownload /> },
  { to: '/exports', label: 'Exports', icon: <IconUpload /> },
  { to: '/stock', label: 'Stock', icon: <IconTag /> },
  { to: '/requests', label: 'Requests', icon: <IconClipboard /> },
  { to: '/analytics', label: 'Analytics', icon: <IconChart /> },
  { to: '/upload', label: 'Upload Data', icon: <IconUpload /> },
  { to: '/predict', label: 'ML Prediction', icon: <IconCpu /> },
];

const agencyNav = [
  { to: '/agency', label: 'Dashboard', icon: <IconHome /> },
  { to: '/agency-products', label: 'Products', icon: <IconPackage /> },
  { to: '/requests', label: 'My Requests', icon: <IconClipboard /> },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const nav = user?.role === 'admin' ? adminNav : agencyNav;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setChangePasswordError('');
    if (changePasswordForm.new !== changePasswordForm.confirm) {
      setChangePasswordError('New password and confirm do not match');
      return;
    }
    if (changePasswordForm.new.length < 6) {
      setChangePasswordError('New password must be at least 6 characters');
      return;
    }
    setChangePasswordLoading(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: changePasswordForm.current,
        newPassword: changePasswordForm.new,
      });
      setChangePasswordOpen(false);
      setChangePasswordForm({ current: '', new: '', confirm: '' });
      logout();
      navigate(user?.role === 'admin' ? '/login?type=admin' : '/login?type=agency');
    } catch (err) {
      setChangePasswordError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-wrap">
            <svg className="logo-icon" width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="url(#sidebarLogoGrad)" />
              <path d="M30 65 L40 45 L50 55 L60 35 L70 50 L75 40" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M25 70 Q50 75 75 70" stroke="#c9a227" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <defs>
                <linearGradient id="sidebarLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#006633"/>
                  <stop offset="100%" stopColor="#004d26"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="logo">SMT Agencies</span>
          </div>
          <div className="sidebar-header-btns">
            <button type="button" className="theme-toggle-sidebar" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <button type="button" className="toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>
        </div>
        <nav className="sidebar-nav">
          {nav.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.charAt(0).toUpperCase() || 'U'}</div>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role === 'admin' ? <><IconUser /> Admin</> : <><IconBuilding /> Agency</>}</span>
            </div>
          </div>
          <div className="footer-buttons">
            <button type="button" className="btn-change-password" onClick={() => setChangePasswordOpen(true)}>
              <IconLock /> Change Password
            </button>
            <button type="button" className="btn-logout" onClick={handleLogout}>
              <IconLogout /> Logout
            </button>
          </div>
        </div>
      </aside>
      {changePasswordOpen && (
        <div className="modal-overlay" onClick={() => setChangePasswordOpen(false)}>
          <div className="modal change-password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon"><IconShield /></span>
              <h2>Change Password</h2>
            </div>
            <p className="modal-hint">Use a strong password to secure your account.</p>
            <form onSubmit={handleChangePasswordSubmit} className="form">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="input"
                value={changePasswordForm.current}
                onChange={(e) => setChangePasswordForm((f) => ({ ...f, current: e.target.value }))}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <label className="form-label">New Password (min 6 characters)</label>
              <input
                type="password"
                className="input"
                value={changePasswordForm.new}
                onChange={(e) => setChangePasswordForm((f) => ({ ...f, new: e.target.value }))}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
              />
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="input"
                value={changePasswordForm.confirm}
                onChange={(e) => setChangePasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                required
                autoComplete="new-password"
                placeholder="••••••••"
              />
              {changePasswordError && <p className="form-error"><IconWarning /> {changePasswordError}</p>}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setChangePasswordOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={changePasswordLoading}>
                  {changePasswordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
