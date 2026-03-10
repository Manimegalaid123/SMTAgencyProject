import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import './Requests.css';

// Icons
const IconMessage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconReply = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function Requests() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [viewModal, setViewModal] = useState(null);

  const fetchData = () => {
    api.get('/requests')
      .then(({ data }) => setEnquiries(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/requests', { subject: form.subject, message: form.message });
      setModal(false);
      setForm({ subject: '', message: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit enquiry');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return alert('Please enter a reply');
    try {
      await api.patch(`/requests/${replyModal._id}`, { adminReply: replyText });
      setReplyModal(null);
      setReplyText('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send reply');
    }
  };

  const handleClose = async (id) => {
    try {
      await api.patch(`/requests/${id}/close`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to close enquiry');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'warning',
      replied: 'success',
      closed: 'muted',
      approved: 'success',
      rejected: 'danger'
    };
    return <span className={`badge badge-${colors[status] || 'default'}`}>{status}</span>;
  };

  // Filter out old format enquiries (ones without subject/message) - they're from old system
  const validEnquiries = enquiries.filter(e => e.subject && e.message);

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="requests-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{user?.role === 'admin' ? 'Product Enquiries' : 'My Enquiries'}</h1>
          <p className="page-desc">
            {user?.role === 'admin' 
              ? 'View and respond to agency enquiries' 
              : 'Ask questions about products, availability, pricing, etc.'}
          </p>
        </div>
        {user?.role === 'agency' && (
          <button type="button" className="btn-primary" onClick={() => setModal(true)}>
            <IconMessage /> New Enquiry
          </button>
        )}
      </div>

      {/* Enquiries List */}
      <div className="enquiries-list">
        {validEnquiries.map((enq) => (
          <div key={enq._id} className={`enquiry-card ${enq.status}`}>
            <div className="enquiry-header">
              <div className="enquiry-meta">
                {user?.role === 'admin' && <span className="agency-name">{enq.agencyName}</span>}
                <span className="enquiry-date">{new Date(enq.createdAt).toLocaleDateString()}</span>
                {getStatusBadge(enq.status)}
              </div>
              <h3 className="enquiry-subject">{enq.subject}</h3>
            </div>
            <p className="enquiry-message">{enq.message}</p>
            
            {enq.adminReply && (
              <div className="enquiry-reply">
                <div className="reply-header">
                  <IconReply /> <strong>Admin Reply</strong>
                  <span className="reply-date">{new Date(enq.repliedAt).toLocaleDateString()}</span>
                </div>
                <p>{enq.adminReply}</p>
              </div>
            )}
            
            <div className="enquiry-actions">
              {user?.role === 'admin' && enq.status !== 'closed' && (
                <button className="btn-sm primary" onClick={() => { setReplyModal(enq); setReplyText(enq.adminReply || ''); }}>
                  <IconReply /> {enq.adminReply ? 'Edit Reply' : 'Reply'}
                </button>
              )}
              {enq.status !== 'closed' && (
                <button className="btn-sm" onClick={() => handleClose(enq._id)}>
                  <IconCheck /> Mark Closed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {validEnquiries.length === 0 && (
        <div className="empty-state">
          <IconMessage />
          <p>No enquiries yet.</p>
          {user?.role === 'agency' && (
            <button className="btn-primary" onClick={() => setModal(true)}>Ask Your First Question</button>
          )}
        </div>
      )}

      {/* New Enquiry Modal */}
      {modal && user?.role === 'agency' && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal enquiry-modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Enquiry</h2>
            <p className="modal-desc">Ask about products, availability, pricing, or any other questions.</p>
            <form onSubmit={handleSubmit} className="form">
              <label className="form-label">Subject *</label>
              <input
                type="text"
                placeholder="e.g., Horlicks 1kg availability"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
                className="input"
              />
              <label className="form-label">Your Question *</label>
              <textarea
                placeholder="Write your question in detail..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                className="input"
                rows={5}
              />
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit Enquiry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reply Modal (Admin) */}
      {replyModal && (
        <div className="modal-overlay" onClick={() => setReplyModal(null)}>
          <div className="modal reply-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reply to Enquiry</h2>
            <div className="original-enquiry">
              <p className="enquiry-from"><strong>From:</strong> {replyModal.agencyName}</p>
              <p className="enquiry-subject-preview"><strong>Subject:</strong> {replyModal.subject}</p>
              <p className="enquiry-message-preview">{replyModal.message}</p>
            </div>
            <label className="form-label">Your Reply</label>
            <textarea
              placeholder="Type your response..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="input"
              rows={4}
            />
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setReplyModal(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleReply}>Send Reply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
