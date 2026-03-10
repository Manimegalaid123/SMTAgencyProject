import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { IconBox, IconInbox, IconTarget, IconPackage, IconShoppingCart } from '../components/Icons';
import './Dashboard.css';

export default function UserDashboard() {
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/requests'), api.get('/products')])
      .then(([r, p]) => {
        setRequests(r.data.slice(0, 5));
        setProducts(Array.isArray(p.data) ? p.data : (p.data.products || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;

  const pending = requests.filter((r) => r.status === 'pending').length;

  const cards = [
    { title: 'Available Products', value: products.length, color: 'green', icon: IconBox },
    { title: 'Pending Requests', value: pending, color: 'amber', icon: IconInbox },
    { title: 'Total Requests', value: requests.length, color: 'blue', icon: IconTarget },
  ];

  return (
    <div className="dashboard dashboard-agency">
      <header className="dashboard-header">
        <h1 className="page-title">Agency Dashboard</h1>
        <p className="page-desc">View SMT Agency products (read-only) and raise requests. You cannot upload files, run analysis, or modify product or stock data.</p>
      </header>
      <section className="dashboard-cards">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className={`card card-${c.color} card-with-icon card-static`}>
              <span className="card-icon">
                <Icon />
              </span>
              <span className="card-title">{c.title}</span>
              <span className="card-value">{c.value}</span>
            </div>
          );
        })}
      </section>
      <section className="dashboard-actions-wrap">
        <h2 className="dashboard-actions-title">Quick actions</h2>
        <div className="dashboard-actions">
          <Link to="/agency-products" className="action-btn">
            <span className="action-btn-icon"><IconPackage /></span>
            View Products
          </Link>
          <Link to="/requests" className="action-btn primary">
            <span className="action-btn-icon"><IconShoppingCart /></span>
            My Enquiries
          </Link>
        </div>
      </section>
      {/* Recent Requests section removed as per user request */}
    </div>
  );
}
