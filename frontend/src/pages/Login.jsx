import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Auth.css';

// SVG Icon Components
const IconUser = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconBuilding = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="15" y2="18"/>
  </svg>
);

const IconWarning = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default function Login() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'agency'; // admin | agency
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const isAdmin = type === 'admin';

  useEffect(() => {
    setError('');
  }, [type, email, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data?.user?.role === 'admin') navigate('/dashboard', { replace: true });
      else if (data?.user?.role === 'agency') navigate('/agency', { replace: true });
      else navigate('/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      if (err.response?.status === 401) setError('Invalid credentials. Please check email and password.');
      else if (err.response?.status === 403) setError('Unauthorized role access.');
      else setError(isAdmin && msg.toLowerCase().includes('invalid') ? 'Invalid admin credentials. Please check email and password.' : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-login">
        <div className="auth-card-header">
          <span className="auth-logo">{isAdmin ? <IconUser /> : <IconBuilding />}</span>
          <h1 className="auth-title">
            {isAdmin ? 'Admin Login' : 'Agency Login'}
          </h1>
          <p className="auth-subtitle">
            {isAdmin
              ? 'Sign in to manage products, stock, and analytics'
              : 'Sign in to view products and submit requests'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error" role="alert">
              <IconWarning /> {error}
            </div>
          )}
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              type="email"
              placeholder={isAdmin ? 'admin@smt.com' : 'agency@example.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? (
              <span className="auth-btn-loading">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                </svg>
                Signing in...
              </span>
            ) : (isAdmin ? 'Admin Sign In' : 'Sign In')}
          </button>
        </form>
        <div className="auth-switch">
          <span className="auth-switch-label">
            {isAdmin ? 'Not an admin?' : 'Are you an admin?'}
          </span>
          <Link to={isAdmin ? '/login?type=agency' : '/login?type=admin'} className="auth-switch-link">
            {isAdmin ? 'Agency Login' : 'Admin Login'}
          </Link>
        </div>
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register as Agency</Link>
        </p>
        <p className="auth-footer auth-footer-back">
          <Link to="/">← Back to home</Link>
        </p>
      </div>
      <button
        type="button"
        className="theme-toggle-fixed"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
      </button>
    </div>
  );
}
