import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import './Products.css';

export default function AgencyProducts() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [requestModal, setRequestModal] = useState(null);
  const [requestForm, setRequestForm] = useState({ quantity: '', notes: '' });

  const fetchProducts = () => {
    api.get('/products')
      .then(({ data }) => {
        setProducts(Array.isArray(data) ? data : (data.products || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/requests', {
        product: requestModal.product._id,
        quantity: Number(requestForm.quantity),
        notes: requestForm.notes || undefined,
      });
      setRequestModal(null);
      setRequestForm({ quantity: '', notes: '' });
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit request');
    }
  };

  const openRequestModal = (product) => {
    setRequestModal({ product });
    setRequestForm({ quantity: '', notes: '' });
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  if (loading) return <div className="page-loading">Loading...</div>;

  const qty = (p) => p.stock ?? p.availableQuantity ?? 0;
  const availabilityStatus = (p) => p.availabilityStatus ?? p.status ?? (qty(p) > 0 ? 'Available' : 'Out of Stock');
  const canRequest = (p) => availabilityStatus(p) === 'Available' && qty(p) > 0;

  return (
    <div className="products-page agency-products-page">
      <div className="page-header">
        <h1 className="page-title">SMT Agency Products</h1>
        <p className="page-desc">View-only list of products from SMT Agency. You can raise requests for available products only. You cannot add, edit, or delete products.</p>
        <div className="page-header-actions">
          <div className="view-toggle">
            <button type="button" className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>Table</button>
            <button type="button" className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')}>Cards</button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="table-wrap products-table-wrap">
          <table className="data-table products-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Price (₹)</th>
                <th>Availability Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td className="product-name-cell">{p.name}</td>
                  <td>{p.category || 'FMCG'}</td>
                  <td>₹{Number(p.price).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`badge badge-${availabilityStatus(p) === 'Available' ? 'success' : 'danger'}`}>
                      {availabilityStatus(p)}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-sm primary"
                      onClick={() => openRequestModal(p)}
                      disabled={!canRequest(p)}
                    >
                      Request
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((p) => (
            <div key={p._id} className="product-card">
              <div className="product-name">{p.name}</div>
              <div className="product-category">{p.category || 'FMCG'}</div>
              <div className="product-meta">
                <span>₹{Number(p.price).toLocaleString('en-IN')} / unit</span>
              </div>
              <div className="product-status">
                <span className={`badge badge-${availabilityStatus(p) === 'Available' ? 'success' : 'danger'}`}>
                  {availabilityStatus(p)}
                </span>
              </div>
              <div className="product-meta-secondary">
                <span>Source: {p.importSource || 'Nestlé'}</span>
              </div>
              <div className="product-actions">
                <button
                  type="button"
                  className="btn-sm primary"
                  onClick={() => openRequestModal(p)}
                  disabled={!canRequest(p)}
                >
                  Request Product
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {products.length === 0 && (
        <div className="empty-state">
          <p>No products available from SMT Agency at the moment.</p>
        </div>
      )}

      {requestModal && (
        <div className="modal-overlay" onClick={() => setRequestModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Request Product</h2>
            <div className="product-summary">
              <h3>{requestModal.product.name}</h3>
              <p>Price: ₹{Number(requestModal.product.price).toLocaleString('en-IN')} per unit</p>
            </div>
            <form onSubmit={handleRequestSubmit} className="form">
              <label className="form-label">Requested Quantity</label>
              <input
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={requestForm.quantity}
                onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })}
                required
                className="input"
              />
              <label className="form-label">Notes (Optional)</label>
              <textarea
                placeholder="Any special requirements or notes"
                value={requestForm.notes}
                onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                className="input"
                rows={3}
              />
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setRequestModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
