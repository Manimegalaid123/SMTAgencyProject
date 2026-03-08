import React, { useEffect, useState } from 'react';
import api from '../api';
import './DataPages.css';

export default function Exports() {
  const [exports, setExports] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ product: '', quantity: '', agencyName: '', notes: '' });

  const fetchData = () => {
    Promise.all([api.get('/exports'), api.get('/products')])
      .then(([exp, prod]) => {
        setExports(exp.data);
        setProducts(Array.isArray(prod.data) ? prod.data : (prod.data.products || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/exports', {
        product: form.product,
        quantity: Number(form.quantity),
        agencyName: form.agencyName || undefined,
        notes: form.notes || undefined,
      });
      setModal(false);
      setForm({ product: '', quantity: '', agencyName: '', notes: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="data-page">
      <div className="page-header">
        <h1 className="page-title">Exports / Sales</h1>
        <button type="button" className="btn-primary" onClick={() => setModal(true)}>Record Export</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Agency</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {exports.map((exp) => (
              <tr key={exp._id}>
                <td>{new Date(exp.date).toLocaleDateString()}</td>
                <td>{exp.product?.name}</td>
                <td>{exp.quantity}</td>
                <td>{exp.agencyName || '—'}</td>
                <td>{exp.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {exports.length === 0 && <p className="empty-state">No exports yet.</p>}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Record Export</h2>
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
                  <option key={p._id} value={p._id}>{p.name} (Stock: {p.stock ?? 0})</option>
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
              <label>Agency Name</label>
              <input
                value={form.agencyName}
                onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                className="input"
                placeholder="Optional"
              />
              <label>Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input"
              />
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
