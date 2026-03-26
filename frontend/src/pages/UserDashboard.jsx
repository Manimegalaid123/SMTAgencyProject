import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { IconBox, IconInbox, IconTarget, IconPackage, IconShoppingCart } from '../components/Icons';
import { useToast } from '../context/ToastContext';
import './Dashboard.css';

export default function UserDashboard() {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    label: '',
    addressLine: '',
    city: '',
    district: '',
    pincode: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/requests'),
      api.get('/products'),
      api.get('/orders'),
      api.get('/auth/addresses'),
    ])
      .then(([r, p, o, a]) => {
        // Use all requests so dashboard counts match the Requests page
        setRequests(Array.isArray(r.data) ? r.data : []);
        setProducts(Array.isArray(p.data) ? p.data : (p.data.products || []));
        setOrders(Array.isArray(o.data) ? o.data : []);
        setAddresses(Array.isArray(a.data) ? a.data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;

  const pending = requests.filter((r) => r.status === 'pending').length;
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'delivered' || o.status === 'collected').length;
  const activeOrders = orders.filter(
    (o) => !['delivered', 'collected', 'rejected'].includes(o.status)
  ).length;
  const paymentPendingOrders = orders.filter(
    (o) => o.paymentStatus !== 'paid' && ['approved', 'ready_for_pickup', 'out_for_delivery', 'awaiting_payment'].includes(o.status)
  ).length;

  const cards = [
    { title: 'Available Products', value: products.length, color: 'green', icon: IconBox },
    { title: 'Total Orders', value: totalOrders, color: 'blue', icon: IconShoppingCart },
    { title: 'Active Orders', value: activeOrders, color: 'amber', icon: IconInbox },
    { title: 'Payment Pending', value: paymentPendingOrders, color: 'amber', icon: IconTarget },
    { title: 'Completed Orders', value: completedOrders, color: 'emerald', icon: IconShoppingCart },
    { title: 'Pending Requests', value: pending, color: 'amber', icon: IconInbox },
    { title: 'Total Requests', value: requests.length, color: 'blue', icon: IconTarget },
  ];

  const startEditAddress = (addr) => {
    setEditingId(addr._id);
    setEditForm({
      label: addr.label || '',
      addressLine: addr.addressLine || '',
      city: addr.city || '',
      district: addr.district || '',
      pincode: addr.pincode || '',
    });
  };

  const handleSaveAddress = async () => {
    if (!editingId) return;
    const { label, addressLine, city, district, pincode } = editForm;
    if (!addressLine || !city || !district || !pincode || pincode.length !== 6) {
      showError('Please enter a complete address with 6-digit pincode.');
      return;
    }
    try {
      const { data } = await api.put(`/auth/addresses/${editingId}`, {
        label,
        addressLine,
        city,
        district,
        pincode,
      });
      setAddresses(Array.isArray(data) ? data : []);
      setEditingId(null);
      showSuccess('Address updated successfully.');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to update address');
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      const { data } = await api.delete(`/auth/addresses/${id}`);
      setAddresses(Array.isArray(data) ? data : []);
      if (editingId === id) {
        setEditingId(null);
      }
      showSuccess('Address deleted.');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to delete address');
    }
  };

  const handleDeliverToAddress = (id) => {
    // Navigate to agency products and preselect address in checkout.
    navigate(`/agency-products?checkout=1&addressId=${id}`);
    showInfo('Address selected. Add items to cart and proceed to checkout.');
  };

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
      <section className="dashboard-section">
        <h2 className="dashboard-section-title">Saved delivery addresses</h2>
        {addresses.length === 0 ? (
          <p className="dashboard-section-empty">No saved addresses yet. You can save an address from the checkout page after placing an order.</p>
        ) : (
          <div className="saved-addresses-list" style={{ marginTop: '0.5rem' }}>
            {addresses.map((addr) => (
              <div
                key={addr._id}
                className={editingId === addr._id ? 'saved-address-card selected' : 'saved-address-card'}
              >
                {editingId === addr._id ? (
                  <div className="saved-address-main" style={{ width: '100%' }}>
                    <div className="saved-address-label-row">
                      <input
                        type="text"
                        placeholder="Label (e.g. Shop, Godown)"
                        className="input"
                        style={{ fontSize: 13, padding: '0.45rem 0.7rem' }}
                        value={editForm.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      />
                    </div>
                    <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <input
                        type="text"
                        placeholder="Door no, street, area"
                        className="input"
                        style={{ fontSize: 13, padding: '0.45rem 0.7rem' }}
                        value={editForm.addressLine}
                        onChange={(e) => setEditForm({ ...editForm, addressLine: e.target.value })}
                      />
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <input
                          type="text"
                          placeholder="City / Town"
                          className="input"
                          style={{ fontSize: 13, padding: '0.45rem 0.7rem', flex: 1 }}
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="District"
                          className="input"
                          style={{ fontSize: 13, padding: '0.45rem 0.7rem', flex: 1 }}
                          value={editForm.district}
                          onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="Pincode"
                          maxLength={6}
                          className="input"
                          style={{ fontSize: 13, padding: '0.45rem 0.7rem', width: 120 }}
                          value={editForm.pincode}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setEditForm({ ...editForm, pincode: value });
                          }}
                        />
                      </div>
                    </div>
                    <div className="dashboard-address-actions" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleSaveAddress}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="saved-address-main">
                      <div className="saved-address-label-row">
                        <span className="saved-address-label-text">{addr.label || 'Saved address'}</span>
                      </div>
                      <div className="saved-address-line">{addr.fullAddress || addr.addressLine}</div>
                    </div>
                    <div className="dashboard-address-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginLeft: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-sm primary"
                        onClick={() => handleDeliverToAddress(addr._id)}
                      >
                        Deliver here
                      </button>
                      <button
                        type="button"
                        className="btn-sm"
                        onClick={() => startEditAddress(addr)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-sm danger"
                        onClick={() => handleDeleteAddress(addr._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      {/* Recent Requests section removed as per user request */}
    </div>
  );
}
