import React, { useEffect, useState } from 'react';
import api from '../api';
import './DataPages.css';

export default function Imports() {
  const [imports, setImports] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ product: '', quantity: '', source: 'Nestlé', notes: '' });

  const fetchData = () => {
    Promise.all([api.get('/imports'), api.get('/products')])
      .then(([imp, prod]) => {
        setImports(imp.data);
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
      await api.post('/imports', {
        product: form.product,
        quantity: Number(form.quantity),
        source: form.source || 'Nestlé',
        notes: form.notes || undefined,
      });
      setModal(false);
      setForm({ product: '', quantity: '', source: 'Nestlé', notes: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="data-page">
      <div className="page-header">
        <h1 className="page-title">Imports</h1>
        <button type="button" className="btn-primary" onClick={() => setModal(true)}>Add Import</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Source</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {imports.map((imp) => (
              <tr key={imp._id}>
                <td>{new Date(imp.date).toLocaleDateString()}</td>
                <td>{imp.product?.name}</td>
                <td>{imp.quantity}</td>
                <td>{imp.source}</td>
                <td>{imp.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {imports.length === 0 && <p className="empty-state">No imports yet.</p>}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Import</h2>
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
                  <option key={p._id} value={p._id}>{p.name}</option>
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
              <label>Source</label>
              <input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="input"
              />
              <label>Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input"
              />
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
