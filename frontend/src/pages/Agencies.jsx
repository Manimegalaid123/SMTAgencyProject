import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import './DataPages.css';
import './Dashboard.css';

export default function Agencies() {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | warm | inactive | new
  const [areaFilter, setAreaFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedAgency, setSelectedAgency] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/analytics/agencies-overview').catch(() => ({ data: { agencies: [] } })),
      api.get('/analytics/summary').catch(() => ({ data: null })),
    ])
      .then(([overviewRes, summaryRes]) => {
        setAgencies(Array.isArray(overviewRes.data?.agencies) ? overviewRes.data.agencies : []);
        setSummary(summaryRes.data);
      })
      .catch(() => {
        setAgencies([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const areas = useMemo(() => {
    const set = new Set();
    agencies.forEach((a) => {
      if (a.area) set.add(a.area);
    });
    return ['all', ...Array.from(set).sort()];
  }, [agencies]);

  const filtered = useMemo(() => {
    return agencies.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (areaFilter !== 'all' && a.area !== areaFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${a.agencyName || ''} ${a.name || ''} ${a.email || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [agencies, statusFilter, areaFilter, search]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <span>Loading agencies...</span>
      </div>
    );
  }

  return (
    <div className="data-page">
      <h1 className="page-title">Agencies / Customers</h1>
      <p className="page-desc">See all registered agencies, their order history, and status.</p>

      <section className="dashboard-section-block" style={{ marginTop: '1.25rem' }}>
        <div className="section-header">
          <h2 className="dashboard-section-title">Agencies List</h2>
        </div>
        <p className="dashboard-section-desc">Browse all agencies and open profiles for more details.</p>

        <div className="products-toolbar" style={{ marginBottom: '1rem' }}>
          <div className="products-search">
            <input
              type="text"
              className="input"
              placeholder="Search by agency, owner, or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="products-sort-tabs">
            {['all', 'active', 'warm', 'inactive', 'new'].map((s) => (
              <button
                key={s}
                type="button"
                className={statusFilter === s ? 'sort-tab active' : 'sort-tab'}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label">Filter by Area</label>
            <select
              className="input"
              style={{ minWidth: 180 }}
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
            >
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a === 'all' ? 'All Areas' : a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Agency</th>
              <th>Owner</th>
              <th>Area</th>
              <th>Status</th>
              <th>Total Orders</th>
              <th>Total Spend</th>
              <th>Last Order</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
            <tbody>
              {filtered.map((a, idx) => (
                <tr key={a.id}>
                  <td>{idx + 1}</td>
                  <td>{a.agencyName || '—'}</td>
                  <td>{a.name}</td>
                  <td>{a.area || '—'}</td>
                  <td>
                    <span className={`badge badge-${a.status === 'active' ? 'success' : a.status === 'inactive' ? 'danger' : 'secondary'}`}>
                      {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                    </span>
                  </td>
                  <td>{a.totalOrders}</td>
                  <td>{formatINR(a.totalAmount)}</td>
                  <td>{formatDate(a.lastOrderAt)}</td>
                  <td>{formatDate(a.joinedAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => setSelectedAgency(a)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '1rem' }}>
                    No agencies found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {summary?.topAgencies && summary.topAgencies.length > 0 && (
        <section className="dashboard-section-block" style={{ marginTop: '2rem' }}>
          <div className="section-header">
            <h2 className="dashboard-section-title">Top Customers (Agencies)</h2>
          </div>
          <p className="dashboard-section-desc">Agencies ranked by total purchase value.</p>
          <div className="dashboard-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Agency</th>
                  <th>Orders</th>
                  <th>Total Quantity</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {summary.topAgencies.map((a, idx) => (
                  <tr key={a._id || idx}>
                    <td>{idx + 1}</td>
                    <td>{a.agencyName || 'Unknown'}</td>
                    <td>{a.orderCount}</td>
                    <td>{a.totalQuantity}</td>
                    <td>{formatINR(a.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedAgency && (
        <div className="modal-overlay" onClick={() => setSelectedAgency(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Agency Profile</h2>
            <p><strong>Agency Name:</strong> {selectedAgency.agencyName || '—'}</p>
            <p><strong>Owner:</strong> {selectedAgency.name}</p>
            <p><strong>Email:</strong> {selectedAgency.email}</p>
            <p><strong>Area:</strong> {selectedAgency.area || '—'}</p>
            <p><strong>Status:</strong> {selectedAgency.status}</p>
            <p><strong>Total Orders:</strong> {selectedAgency.totalOrders}</p>
            <p><strong>Total Spend:</strong> {formatINR(selectedAgency.totalAmount)}</p>
            <p><strong>Last Order:</strong> {formatDate(selectedAgency.lastOrderAt)}</p>
            <p><strong>Joined:</strong> {formatDate(selectedAgency.joinedAt)}</p>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setSelectedAgency(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
