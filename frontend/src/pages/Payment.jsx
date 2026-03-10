import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import './Payment.css';

const IconCheck = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

export default function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showDummyPage, setShowDummyPage] = useState(false);
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);

  useEffect(() => {
    api.get(`/orders/${orderId}`)
      .then(({ data }) => {
        setOrder(data);
        if (data.paymentStatus === 'paid') {
          setSuccess(true);
        }
      })
      .catch(err => {
        alert('Order not found');
        navigate('/my-orders');
      })
      .finally(() => setLoading(false));
  }, [orderId, navigate]);

  // Go to REAL Stripe checkout
  const handleRealStripe = async () => {
    setRedirectingToStripe(true);
    try {
      const { data } = await api.post('/payments/create-checkout-session', { orderId });
      window.location.href = data.url;
    } catch (err) {
      alert('Failed to create checkout session');
      setRedirectingToStripe(false);
    }
  };

  // Dummy payment - instant success
  const handleDummyPay = async () => {
    setProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      await api.post('/payments/test-pay', { orderId });
      setSuccess(true);
      setTimeout(() => navigate('/my-orders?payment=success'), 2000);
    } catch (err) {
      alert('Payment failed');
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="stripe-page"><div className="stripe-loading">Loading...</div></div>;
  }

  if (success) {
    return (
      <div className="stripe-page">
        <div className="payment-success">
          <div className="success-icon"><IconCheck /></div>
          <h2>Payment Successful!</h2>
          <p>₹{order?.totalAmount?.toLocaleString('en-IN')} paid</p>
          <p className="redirect-text">Redirecting...</p>
        </div>
      </div>
    );
  }

  // DUMMY PAYMENT PAGE - After clicking TEST MODE
  if (showDummyPage) {
    return (
      <div className="stripe-page">
        <div className="dummy-pay-card">
          <div className="dummy-header">
            <span className="dummy-badge">🧪 TEST MODE - Demo Payment</span>
          </div>
          <div className="dummy-amount">
            <span>Pay</span>
            <h2>₹{order?.totalAmount?.toLocaleString('en-IN')}</h2>
          </div>
          <div className="dummy-info">
            <p>This is a dummy payment for testing purposes.</p>
            <p>No real money will be charged.</p>
          </div>
          <button 
            className={`dummy-pay-btn ${processing ? 'processing' : ''}`}
            onClick={handleDummyPay}
            disabled={processing}
          >
            {processing ? (
              <><span className="spinner"></span> Processing...</>
            ) : (
              '✓ Complete Test Payment'
            )}
          </button>
          <button className="dummy-back-btn" onClick={() => setShowDummyPage(false)}>
            ← Back to payment options
          </button>
        </div>
      </div>
    );
  }

  // INTERMEDIATE PAGE - Choose between TEST MODE or Real Stripe
  return (
    <div className="stripe-page">
      <div className="payment-choice-card">
        <button className="back-arrow-top" onClick={() => navigate('/my-orders')}>← Back</button>
        <div className="choice-header">
          <span className="stripe-logo">stripe</span>
          <h2>Complete Your Payment</h2>
        </div>
        <div className="choice-amount">
          <span>Amount to Pay</span>
          <h1>₹{order?.totalAmount?.toLocaleString('en-IN')}</h1>
        </div>
        <div className="choice-items">
          {order?.items?.slice(0, 3).map((item, idx) => (
            <div key={idx} className="choice-item">
              <span>{item.productName}</span>
              <span>×{item.quantity}</span>
            </div>
          ))}
          {order?.items?.length > 3 && (
            <div className="choice-item more">+{order.items.length - 3} more items</div>
          )}
        </div>
        <div className="choice-buttons">
          {/* TEST MODE Button - Goes to dummy page */}
          <button 
            className="test-mode-btn pro"
            onClick={() => setShowDummyPage(true)}
          >
            <span className="test-icon-svg" aria-label="Test Mode">
              {/* flask/lab SVG icon */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3v6m6-6v6"/><path d="M4 9h16"/><path d="M10 13v-2h4v2"/><path d="M8 17h8"/><path d="M6 21h12"/><rect x="6" y="9" width="12" height="12" rx="2"/></svg>
            </span>
            <span className="test-label">TEST MODE</span>
            <span className="test-desc">Instant payment for testing</span>
          </button>
          <div className="choice-divider"><span>OR</span></div>
          {/* Real Stripe Button */}
          <button 
            className="real-stripe-btn pro"
            onClick={handleRealStripe}
            disabled={redirectingToStripe}
          >
            {redirectingToStripe ? (
              <><span className="spinner"></span> Redirecting to Stripe...</>
            ) : (
              <>
                <span className="stripe-icon-svg" aria-label="Stripe">
                  {/* credit card SVG icon */}
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                </span>
                <span className="stripe-label">Pay with Stripe</span>
                <span className="stripe-desc">Secure payment with card</span>
              </>
            )}
          </button>
        </div>
        <div className="choice-footer">
          <span className="footer-lock-icon" aria-label="Secured">
            {/* lock SVG icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <span>Secured by Stripe</span>
        </div>
      </div>
    </div>
  );
}
