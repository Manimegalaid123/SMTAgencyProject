import React, { useEffect, useState } from 'react';
import api from '../api';
import './DataPages.css';

export default function Stock() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stock').then(({ data }) => setStocks(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="data-page">
      <h1 className="page-title">Real-time Stock</h1>
      <p className="page-desc">Current stock levels by product</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => (
              <tr key={s._id}>
                <td>{s.product?.name}</td>
                <td>
                  <span className={s.quantity === 0 ? 'stock-zero' : 'stock-ok'}>{s.quantity}</span>
                </td>
                <td>{new Date(s.lastUpdated).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {stocks.length === 0 && <p className="empty-state">No stock records.</p>}
      <style>{`
        .stock-zero { color: var(--danger); font-weight: 600; }
        .stock-ok { color: var(--accent); font-weight: 500; }
      `}</style>
    </div>
  );
}
