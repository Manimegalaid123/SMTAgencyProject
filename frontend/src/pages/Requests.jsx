import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import './Requests.css';

export default function Requests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ product: '', quantity: '' });
  const [actionModal, setActionModal] = useState(null);

  const fetchData = () => {
    if (user?.role === 'agency') {
      Promise.all([api.get('/requests'), api.get('/products')])
        .then(([r, p]) => { setRequests(r.data); setProducts(Array.isArray(p.data) ? p.data : (p.data.products || [])); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      api.get('/requests').then(({ data }) => setRequests(data)).catch(() => {}).finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/requests', { product: form.product, quantity: Number(form.quantity) });
      setModal(false);
      setForm({ product: '', quantity: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleStatus = async (id, status, adminNotes) => {
    try {
      await api.patch(`/requests/${id}`, { status, adminNotes });
      setActionModal(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="requests-page">
      <div className="page-header">
        <h1 className="page-title">{user?.role === 'admin' ? 'Product Requests' : 'My Requests'}</h1>
        {user?.role === 'agency' && (
          <button type="button" className="btn-primary" onClick={() => setModal(true)}>New Request</button>
        )}
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              {user?.role === 'admin' && <th>Agency</th>}
              <th>Status</th>
              <th>Date</th>
              {user?.role === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req._id}>
                <td>{req.product?.name}</td>
                <td>{req.quantity}</td>
                {user?.role === 'admin' && <td>{req.agencyName || '—'}</td>}
                <td><span className={`badge badge-${req.status}`}>{req.status}</span></td>
                <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                {user?.role === 'admin' && req.status === 'pending' && (
                  <td>
                    <button type="button" className="btn-sm approve" onClick={() => setActionModal({ id: req._id, action: 'approve', req })}>Approve</button>
                    <button type="button" className="btn-sm reject" onClick={() => setActionModal({ id: req._id, action: 'reject', req })}>Reject</button>
                  </td>
                )}
                {user?.role === 'admin' && req.status !== 'pending' && <td>—</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {requests.length === 0 && <p className="empty-state">No requests yet.</p>}

      {modal && user?.role === 'agency' && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Request Products</h2>
            <form onSubmit={handleSubmit} className="form">
              <label>Product</label>
              <select
                value={form.product}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
                required
                className="input"
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>{p.name} (Available: {p.stock ?? 0})</option>
                ))}
              </select>
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
                className="input"
              />
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{actionModal.action === 'approve' ? 'Approve' : 'Reject'} Request</h2>
            <p>{actionModal.req.product?.name} — Qty: {actionModal.req.quantity}</p>
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              <button
                type="button"
                className={actionModal.action === 'approve' ? 'btn-primary' : 'btn-danger'}
                onClick={() => handleStatus(actionModal.id, actionModal.action === 'approve' ? 'approved' : 'rejected')}
              >
                {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
