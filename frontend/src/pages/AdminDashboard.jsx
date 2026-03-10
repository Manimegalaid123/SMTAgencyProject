import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { IconBox, IconChart, IconTrending, IconInbox, IconSend, IconBarChart, IconUpload, IconTarget, IconLightbulb, IconAlertTriangle } from '../components/Icons';
import './Dashboard.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    Promise.all([
      api.get('/analytics/summary').catch(() => ({ data: null })),
      api.get('/stock/low-stock').catch(() => ({ data: null }))
    ]).then(([summaryRes, lowStockRes]) => {
      setSummary(summaryRes.data);
      setLowStock(lowStockRes.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) return (
    <div className="page-loading">
      <div className="loading-spinner"></div>
      <span>Loading dashboard...</span>
    </div>
  );

  const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  
  const getTrendIndicator = (value) => {
    if (value > 0) return { icon: '↑', class: 'trend-up', text: 'Trending up' };
    if (value < 0) return { icon: '↓', class: 'trend-down', text: 'Trending down' };
    return { icon: '→', class: 'trend-neutral', text: 'Stable' };
  };

  const cards = [
    { title: 'Total Products', value: summary?.totalProducts ?? 0, to: '/products', color: 'green', icon: IconBox, trend: getTrendIndicator(1) },
    { title: 'Total Transactions', value: summary?.totalTransactions ?? 0, to: '/exports', color: 'blue', icon: IconChart, trend: getTrendIndicator(1) },
    { title: 'Total Revenue', value: formatINR(summary?.totalRevenue), to: '/analytics', color: 'emerald', icon: IconTrending, trend: getTrendIndicator(1) },
    { title: 'This Month Sales', value: summary?.thisMonthSales ?? 0, to: '/analytics', color: 'amber', icon: IconBarChart, trend: getTrendIndicator(0) },
  ];

  const actions = [
    { to: '/imports', label: 'Add Import', icon: IconInbox, desc: 'Record new stock import' },
    { to: '/exports', label: 'Record Export', icon: IconSend, desc: 'Log sales export' },
    { to: '/requests', label: 'View Enquiries', icon: IconTarget, desc: 'Manage agency enquiries' },
    { to: '/stock', label: 'View Stock', icon: IconBox, desc: 'Check inventory levels' },
  ];

  return (
    <div className="dashboard dashboard-admin">
      <header className="dashboard-header">
        <div className="welcome-section">
          <span className="welcome-badge">👋 Welcome back</span>
          <h1 className="welcome-title">{getGreeting()}, {user?.name || 'Admin'}!</h1>
          <p className="welcome-date">{formatDate()}</p>
        </div>
        <div className="header-actions">
          <Link to="/predict" className="header-cta">
            <IconTrending />
            <span> Prediction</span>
          </Link>
        </div>
      </header>

      {/* Low Stock Warning Banner */}
      {lowStock?.critical > 0 && (
        <div className="stock-alert-banner critical">
          <IconAlertTriangle />
          <span><strong>{lowStock.critical} product{lowStock.critical > 1 ? 's' : ''}</strong> out of stock! Restock immediately.</span>
          <Link to="/imports" className="banner-action">Add Import</Link>
        </div>
      )}

      <section className="dashboard-stats">
        <div className="stats-header">
          <h2>Overview</h2>
          <span className="stats-label">Real-time metrics</span>
        </div>
        <div className="dashboard-cards">
          {cards.map((c, idx) => {
            const Icon = c.icon;
            return (
              <Link 
                key={c.title} 
                to={c.to} 
                className={`card card-${c.color} card-with-icon`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="card-top">
                  <span className="card-icon">
                    <Icon />
                  </span>
                  <span className={`card-trend ${c.trend.class}`} title={c.trend.text}>
                    {c.trend.icon}
                  </span>
                </div>
                <span className="card-value">{c.value}</span>
                <span className="card-title">{c.title}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-section-block">
          <div className="section-header">
            <IconBox />
            <h2 className="dashboard-section-title">Product Management</h2>
          </div>
          <p className="dashboard-section-desc">Add, edit, and manage products. Products are visible to agencies as read-only.</p>
          <div className="dashboard-actions dashboard-actions-product">
            <Link to="/products?add=1" className="action-btn primary action-btn-add-product">
              <span className="action-btn-icon"><IconBox /></span>
              <div className="action-btn-content">
                <span className="action-btn-label">Add Product</span>
                <span className="action-btn-desc">Create new inventory item</span>
              </div>
            </Link>
            <Link to="/products" className="action-btn">
              <span className="action-btn-icon"><IconBox /></span>
              <div className="action-btn-content">
                <span className="action-btn-label">Manage Products</span>
                <span className="action-btn-desc">View all products</span>
              </div>
            </Link>
          </div>
        </section>

        <section className="dashboard-section-block">
          <div className="section-header">
            <IconUpload />
            <h2 className="dashboard-section-title">Stock Upload & Analysis</h2>
          </div>
          <p className="dashboard-section-desc">Upload CSV/Excel files. View charts and revenue analytics after upload.</p>
          <div className="dashboard-actions">
            <Link to="/upload" className="action-btn">
              <span className="action-btn-icon"><IconUpload /></span>
              <div className="action-btn-content">
                <span className="action-btn-label">Upload CSV / Excel</span>
                <span className="action-btn-desc">Import data files</span>
              </div>
            </Link>
            <Link to="/analytics" className="action-btn">
              <span className="action-btn-icon"><IconChart /></span>
              <div className="action-btn-content">
                <span className="action-btn-label">View Analytics</span>
                <span className="action-btn-desc">Charts & insights</span>
              </div>
            </Link>
          </div>
        </section>
      </div>

      <section className="dashboard-actions-wrap">
        <div className="section-header">
          <IconTarget />
          <h2 className="dashboard-actions-title">Quick Actions</h2>
        </div>
        <div className="dashboard-actions dashboard-actions-grid">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.to} to={a.to} className={`action-btn action-card ${a.primary ? 'primary' : ''}`}>
                <span className="action-btn-icon"><Icon /></span>
                <div className="action-btn-content">
                  <span className="action-btn-label">{a.label}</span>
                  <span className="action-btn-desc">{a.desc}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="dashboard-tip">
        <div className="tip-icon"><IconLightbulb /></div>
        <div className="tip-content">
          <strong>Pro Tip:</strong> Use the Prediction tool to forecast next month's sales based on historical data. Upload at least 3 months of sales records for accurate predictions.
        </div>
      </section>
    </div>
  );
}
