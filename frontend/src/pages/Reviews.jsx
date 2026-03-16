import React, { useEffect, useState } from 'react';
import api from '../api';
import './DataPages.css';

export default function Reviews() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    api.get('/reviews/admin/pending')
      .then(({ data }) => setPending(data || []))
      .catch(() => setPending([]))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const { data } = await api.patch(`/reviews/${id}/status`, { status });
      setPending(prev => prev.filter(r => r._id !== data._id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update review');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div className="page-loading">Loading reviews...</div>;

  return (
    <div className="data-page">
      <h1 className="page-title">Product Reviews</h1>
      <p className="page-desc">Approve or reject reviews submitted by agencies.</p>

      {pending.length === 0 ? (
        <p className="empty-state">No pending reviews.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Agency</th>
                <th>Rating</th>
                <th>Title</th>
                <th>Comment</th>
                <th>Submitted At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(r => (
                <tr key={r._id}>
                  <td>{r.product?.name}{r.product?.packSize ? ` (${r.product.packSize})` : ''}</td>
                  <td>{r.user?.agencyName || r.user?.name}</td>
                  <td>★ {r.rating}</td>
                  <td>{r.title || '—'}</td>
                  <td>{r.comment || '—'}</td>
                  <td>{new Date(r.createdAt).toLocaleString('en-IN')}</td>
                  <td>
                    <button
                      className="btn-sm primary"
                      disabled={updatingId === r._id}
                      onClick={() => updateStatus(r._id, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      className="btn-sm"
                      disabled={updatingId === r._id}
                      onClick={() => updateStatus(r._id, 'rejected')}
                      style={{ marginLeft: 8 }}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
