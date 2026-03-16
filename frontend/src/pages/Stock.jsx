import React, { useEffect, useState } from 'react';
import api from '../api';
import './DataPages.css';

const IconAlertTriangle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export default function Stock() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expiryReport, setExpiryReport] = useState(null);
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/stock'),
      api.get('/stock/reports/expiry'),
      api.get('/stock/reports/movements'),
    ])
      .then(([stockRes, expiryRes, moveRes]) => {
        setStocks(stockRes.data || []);
        setExpiryReport(expiryRes.data || null);
        setMovements(moveRes.data?.products || moveRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d, withTime = false) => {
    if (!d) return '—';
    const date = new Date(d);
    return withTime
      ? date.toLocaleString('en-IN')
      : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  const lowStockItems = stocks.filter(s => s.quantity < 10 && s.quantity > 0);
  const outOfStock = stocks.filter(s => s.quantity === 0);

  const getStockClass = (qty) => {
    if (qty === 0) return 'stock-zero';
    if (qty < 10) return 'stock-low';
    return 'stock-ok';
  };

  return (
    <div className="data-page">
      <h1 className="page-title">Real-time Stock</h1>
      <p className="page-desc">Current stock levels by product</p>
      
      {/* Low Stock Alert Banner */}
      {(lowStockItems.length > 0 || outOfStock.length > 0) && (
        <div className="stock-alerts">
          {outOfStock.length > 0 && (
            <div className="alert-banner alert-danger">
              <IconAlertTriangle />
              <div>
                <strong>Out of Stock ({outOfStock.length})</strong>
                <span>{outOfStock.map(s => s.product?.name).join(', ')}</span>
              </div>
            </div>
          )}
          {lowStockItems.length > 0 && (
            <div className="alert-banner alert-warning">
              <IconAlertTriangle />
              <div>
                <strong>Low Stock Warning ({lowStockItems.length})</strong>
                <span>{lowStockItems.map(s => `${s.product?.name} (${s.quantity})`).join(', ')}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => (
              <tr key={s._id} className={s.quantity < 10 ? 'row-highlight' : ''}>
                <td>{s.product?.name}</td>
                <td>
                  <span className={getStockClass(s.quantity)}>{s.quantity}</span>
                </td>
                <td>
                  {s.quantity === 0 ? (
                    <span className="badge badge-danger">Out of Stock</span>
                  ) : s.quantity < 10 ? (
                    <span className="badge badge-warning">Low Stock</span>
                  ) : (
                    <span className="badge badge-success">In Stock</span>
                  )}
                </td>
                <td>{new Date(s.lastUpdated).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {stocks.length === 0 && <p className="empty-state">No stock records.</p>}

      {/* Expiry & Near-Expiry Report */}
      {expiryReport && (
        <div className="expiry-section">
          <h2 className="section-title">Expiry & Near-Expiry Batches (next {expiryReport.days} days)</h2>
          {(expiryReport.nearExpiry?.length || 0) === 0 && (expiryReport.expired?.length || 0) === 0 && (
            <p className="empty-state">No expiry risks detected.</p>
          )}
          {expiryReport.nearExpiry?.length > 0 && (
            <div className="table-wrap sub-table">
              <h3 className="sub-title">Near-Expiry</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Pack Size</th>
                    <th>Remaining Qty</th>
                    <th>Expiry Date</th>
                    <th>Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {expiryReport.nearExpiry.map(b => (
                    <tr key={b.batchId}>
                      <td>{b.name}</td>
                      <td>{b.packSize || '—'}</td>
                      <td>{b.remainingQuantity}</td>
                      <td>{formatDate(b.expiryDate)}</td>
                      <td>{b.daysLeft}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {expiryReport.expired?.length > 0 && (
            <div className="table-wrap sub-table">
              <h3 className="sub-title">Expired (blocked from sale)</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Pack Size</th>
                    <th>Remaining Qty</th>
                    <th>Expiry Date</th>
                    <th>Days Past</th>
                  </tr>
                </thead>
                <tbody>
                  {expiryReport.expired.map(b => (
                    <tr key={b.batchId}>
                      <td>{b.name}</td>
                      <td>{b.packSize || '—'}</td>
                      <td>{b.remainingQuantity}</td>
                      <td>{formatDate(b.expiryDate)}</td>
                      <td>{Math.abs(b.daysLeft)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stock Movement History */}
      {movements.length > 0 && (
        <div className="movements-section">
          <h2 className="section-title">Stock Movement Summary</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Pack Size</th>
                  <th>Total Imported</th>
                  <th>Total Exported</th>
                  <th>Current Stock</th>
                  <th>Last Movement</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.productId}>
                    <td>{m.name}</td>
                    <td>{m.packSize || '—'}</td>
                    <td>{m.totalImported}</td>
                    <td>{m.totalExported}</td>
                    <td>{m.currentStock}</td>
                    <td>{formatDate(m.lastMovement, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style>{`
        .stock-zero { color: var(--danger); font-weight: 700; }
        .stock-low { color: #f59e0b; font-weight: 600; }
        .stock-ok { color: var(--accent); font-weight: 500; }
        
        .stock-alerts {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        
        .alert-banner {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 10px;
          animation: fadeIn 0.3s ease;
        }
        
        .alert-banner svg {
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .alert-banner div {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .alert-banner strong {
          font-size: 0.95rem;
        }
        
        .alert-banner span {
          font-size: 0.85rem;
          opacity: 0.9;
        }
        
        .alert-danger {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
        
        .alert-warning {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
        }
        
        .row-highlight {
          background: rgba(245, 158, 11, 0.05);
        }
        
        .row-highlight:hover {
          background: rgba(245, 158, 11, 0.1) !important;
        }
        
        .badge {
          display: inline-block;
          padding: 0.25rem 0.6rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .badge-success {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }
        
        .badge-warning {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }
        
        .badge-danger {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .section-title {
          margin-top: 2rem;
          margin-bottom: 0.5rem;
          font-size: 1.25rem;
        }

        .sub-title {
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }

        .sub-table {
          margin-top: 0.75rem;
          margin-bottom: 1.25rem;
        }
      `}</style>
    </div>
  );
}
