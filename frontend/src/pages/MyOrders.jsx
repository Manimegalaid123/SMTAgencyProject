import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './MyOrders.css';
import OrderTimeline from '../components/OrderTimeline';

const IconPackage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconTruck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

const IconStore = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconTicket = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
    <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
  </svg>
);

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviewModal, setReviewModal] = useState(null); // { orderId, productId, productName }
  const [myReviews, setMyReviews] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [paymentMessage, setPaymentMessage] = useState(null);
  const [notification, setNotification] = useState(null);

  // Handle payment callback
  useEffect(() => {
    const payment = searchParams.get('payment');
    const orderId = searchParams.get('orderId');
    
    if (payment === 'success' && orderId) {
      clearCart();
      // Verify payment and refresh orders
      api.get(`/payments/verify/${orderId}`)
        .then(({ data }) => {
          if (data.success) {
            setPaymentMessage({ type: 'success', text: 'Payment successful! Your order has been confirmed.' });
          }
        })
        .catch(() => {
          setPaymentMessage({ type: 'info', text: 'Order placed! Payment is being processed.' });
        })
        .finally(() => {
          // Always refresh orders after payment attempt
          api.get('/orders').then(({ data }) => setOrders(data));
        });
      setSearchParams({});
    } else if (payment === 'cancel') {
      setPaymentMessage({ type: 'warning', text: 'Payment cancelled. Your order is saved as Cash on Delivery.' });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, clearCart]);

  useEffect(() => {
    Promise.all([
      api.get('/orders').catch(() => ({ data: [] })),
      api.get('/reviews/my').catch(() => ({ data: [] })),
    ])
      .then(([ordersRes, reviewsRes]) => {
        const data = ordersRes.data || [];
        setOrders(data);
        setMyReviews(reviewsRes.data || []);
        // Show notification for newly approved or rejected orders
        const latest = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (latest && latest.userNotified === false) {
          if (latest.status === 'approved') {
            setNotification({ type: 'success', text: 'Your order has been approved! Please provide delivery details to proceed.' });
          } else if (latest.status === 'rejected') {
            setNotification({ type: 'danger', text: 'Your order was rejected.' });
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hasReviewed = (orderId, productId) => {
    return myReviews.some(r => r.order === orderId && r.product === productId);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { 
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  }) : '—';

  const getStatusInfo = (status, deliveryType) => {
    const statusMap = {
      pending: { class: 'warning', label: 'Pending Approval', desc: 'Your order is being reviewed by admin' },
      approved: { class: 'info', label: 'Approved', desc: 'Order approved! Preparing for delivery' },
      rejected: { class: 'danger', label: 'Rejected', desc: 'Order was rejected' },
      ready_for_pickup: { class: 'info', label: 'Ready for Pickup', desc: 'Your order is ready! Visit SMT Agency to collect' },
      out_for_delivery: { class: 'info', label: 'Out for Delivery', desc: 'Your order is on the way!' },
      delivered: { class: 'success', label: 'Delivered', desc: 'Order has been delivered' },
      collected: { class: 'success', label: 'Collected', desc: 'Order has been collected' }
    };
    return statusMap[status] || { class: 'default', label: status, desc: '' };
  };

  const generateInvoicePDF = (order) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(0, 102, 51);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('SMT AGENCY', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('FMCG Distribution', pageWidth / 2, 28, { align: 'center' });
    doc.text('GST: 33AABCS1234B1ZA', pageWidth / 2, 35, { align: 'center' });
    
    // Invoice Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pageWidth / 2, 55, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Invoice No: ${order.invoiceNumber || 'N/A'}`, 14, 70);
    doc.text(`Order No: ${order.orderNumber}`, 14, 77);
    doc.text(`Date: ${new Date(order.approvedAt || order.createdAt).toLocaleDateString('en-IN')}`, 14, 84);
    
    doc.text('Bill To:', pageWidth - 80, 70);
    doc.setFont('helvetica', 'bold');
    doc.text(order.agencyName, pageWidth - 80, 77);
    doc.setFont('helvetica', 'normal');
    
    const addressLines = doc.splitTextToSize(order.deliveryAddress, 65);
    doc.text(addressLines, pageWidth - 80, 84);
    
    // Items Table
    const hasGstPerItem = Array.isArray(order.items) && order.items.some(
      (item) => typeof item.gstRate === 'number' && !isNaN(item.gstRate)
    );

    let tableHead;
    let tableData;
    let columnStyles;

    if (hasGstPerItem) {
      tableHead = [['#', 'Product', 'Qty', 'Unit Price', 'Taxable', 'GST %', 'GST Amt', 'Line Total']];
      tableData = order.items.map((item, index) => {
        const taxable = item.taxableValue ?? item.subtotal ?? 0;
        const gstRate = item.gstRate ?? 0;
        const gstAmount = item.gstAmount ?? 0;
        const lineTotal = item.lineTotal ?? (taxable + gstAmount);
        return [
          index + 1,
          item.productName,
          item.quantity,
          `Rs. ${item.price.toLocaleString('en-IN')}`,
          `Rs. ${taxable.toLocaleString('en-IN')}`,
          `${gstRate}%`,
          `Rs. ${gstAmount.toLocaleString('en-IN')}`,
          `Rs. ${lineTotal.toLocaleString('en-IN')}`
        ];
      });

      columnStyles = {
        0: { cellWidth: 10 },
        1: { cellWidth: 55 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 25, halign: 'right' },
        7: { cellWidth: 25, halign: 'right' }
      };
    } else {
      // Fallback for older orders without per-item GST
      tableHead = [['#', 'Product', 'Qty', 'Unit Price', 'Amount']];
      tableData = order.items.map((item, index) => [
        index + 1,
        item.productName,
        item.quantity,
        `Rs. ${item.price.toLocaleString('en-IN')}`,
        `Rs. ${item.subtotal.toLocaleString('en-IN')}`
      ]);

      columnStyles = {
        0: { cellWidth: 15 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' }
      };
    }

    autoTable(doc, {
      startY: 105,
      head: tableHead,
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 102, 51],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles
    });
    
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Use stored tax fields when available, fall back gracefully for older orders
    const itemsSubtotal = order.subtotal ?? order.totalAmount ?? 0;
    const totalTax = order.totalTax ?? 0;
    const deliveryCharge = order.deliveryCharge ?? 0;
    const grandTotal = (order.totalAmount != null)
      ? order.totalAmount
      : itemsSubtotal + totalTax + deliveryCharge;

    doc.text('Items Subtotal:', pageWidth - 80, finalY);
    doc.text(`Rs. ${itemsSubtotal.toLocaleString('en-IN')}`, pageWidth - 14, finalY, { align: 'right' });
    
    doc.text('Total GST:', pageWidth - 80, finalY + 7);
    doc.text(`Rs. ${totalTax.toLocaleString('en-IN')}`, pageWidth - 14, finalY + 7, { align: 'right' });

    doc.text('Delivery:', pageWidth - 80, finalY + 14);
    doc.text(`Rs. ${deliveryCharge.toLocaleString('en-IN')}`, pageWidth - 14, finalY + 14, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Grand Total:', pageWidth - 80, finalY + 24);
    doc.text(`Rs. ${grandTotal.toLocaleString('en-IN')}`, pageWidth - 14, finalY + 24, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', pageWidth / 2, finalY + 40, { align: 'center' });
    doc.text('SMT Agency | Phone: +91 98765 43210 | Email: info@smtagency.com', pageWidth / 2, finalY + 47, { align: 'center' });
    
    doc.save(`Invoice_${order.invoiceNumber || order.orderNumber}.pdf`);
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="my-orders-page">
      <div className="page-header">
        <h1 className="page-title">My Orders</h1>
        <p className="page-desc">Track your order history and download invoices</p>
      </div>

      {/* Payment Status Message */}
      {paymentMessage && (
        <div className={`payment-message ${paymentMessage.type}`}>
          {paymentMessage.text}
          <button className="close-message" onClick={() => setPaymentMessage(null)}>×</button>
        </div>
      )}

      {notification && (
        <div className={`notification-banner ${notification.type}`}>{notification.text}</div>
      )}
      {orders.length === 0 ? (
        <div className="empty-state">
          <IconPackage />
          <h3>No orders yet</h3>
          <p>Start shopping from the Products page to place your first order!</p>
        </div>
      ) : (
        <div className="orders-timeline">
          {orders.map(order => {
            const status = getStatusInfo(order.status, order.deliveryType);
            // Show delivery info form for approved orders missing delivery info
            const needsDelivery = order.status === 'approved' && (
              !order.deliveryType ||
              (order.deliveryType === 'home_delivery' && !order.deliveryAddress)
            );
            return (
              <div key={order._id} className={`order-card status-${order.status}`}>
                <div className="order-status-indicator">
                  <span className={`status-dot ${status.class}`}></span>
                  <span className={`status-label ${status.class}`}>{status.label}</span>
                </div>
                
                <div className="order-main">
                  <div className="order-header-row">
                    <div className="order-number">{order.orderNumber}</div>
                    <span className={`delivery-type-badge ${order.deliveryType || 'home_delivery'}`}>
                      {order.deliveryType === 'store_pickup' ? <><IconStore /> Store Pickup</> : <><IconTruck /> Home Delivery</>}
                    </span>
                  </div>
                  <div className="order-date">{formatDate(order.createdAt)}</div>
                  
                  {/* Pickup Code for Store Pickup */}
                  {order.deliveryType === 'store_pickup' && order.pickupCode && order.status === 'ready_for_pickup' && (
                    <div className="pickup-code-box">
                      <span className="pickup-code-label"><IconTicket /> Your Pickup Code:</span>
                      <span className="pickup-code-value">{order.pickupCode}</span>
                      <small>Show this code when collecting your order</small>
                    </div>
                  )}
                  
                  <div className="order-items">
                    {order.items.map(item => (
                      <div key={item.productName} className="order-item-row">
                        <span>{item.productName}</span>
                        <span>× {item.quantity}</span>
                        <span>₹{item.subtotal.toLocaleString('en-IN')}</span>
                        {['delivered', 'collected'].includes(order.status) && !hasReviewed(order._id, item.product?._id || item.product) && (
                          <button
                            type="button"
                            className="btn-xs rate-btn"
                            onClick={() => setReviewModal({ orderId: order._id, productId: item.product?._id || item.product, productName: item.productName })}
                          >
                            Rate Product
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Delivery Charges Breakdown */}
                  <div className="order-charges">
                    <div className="charge-line">
                      <span>Items Subtotal:</span>
                      <span>
                        ₹{order.subtotal != null
                          ? order.subtotal.toLocaleString('en-IN')
                          : order.totalAmount != null
                            ? order.totalAmount.toLocaleString('en-IN')
                            : '—'}
                      </span>
                    </div>
                    {order.totalTax != null && order.totalTax > 0 && (
                      <div className="charge-line">
                        <span>GST:</span>
                        <span>₹{order.totalTax.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {/* Weight line removed as per user request */}
                    <div className={`charge-line delivery ${order.deliveryCharge === 0 ? 'free' : ''}`}>
                      <span>Delivery:</span>
                      <span>
                        {order.deliveryCharge === 0
                          ? <span className="free-tag">FREE</span>
                          : order.deliveryCharge != null
                            ? `₹${order.deliveryCharge.toLocaleString('en-IN')}`
                            : '—'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="order-total-row">
                    <span>Total</span>
                    <span className="order-total">
                      {order.totalAmount != null ? `₹${order.totalAmount.toLocaleString('en-IN')}` : '—'}
                    </span>
                  </div>
                  
                  {/* Payment Status: Only show after order is approved and delivery info is provided (i.e., status is 'awaiting_payment' or later) */}
                  {['awaiting_payment', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'collected'].includes(order.status) && (
                    <div className="payment-status-row">
                      <span className={`payment-method-badge ${order.paymentMethod || 'cod'}`}>
                        {order.paymentMethod === 'stripe' ? '💳 Online Payment' : '💵 Cash on Delivery'}
                      </span>
                      <span className={`payment-status-badge ${order.paymentStatus || 'unpaid'}`}>
                        {order.paymentStatus === 'paid' ? '✓ Paid' : 
                         order.paymentStatus === 'refunded' ? '↩ Refunded' : 
                         order.paymentStatus === 'failed' ? '✗ Failed' : 'Unpaid'}
                      </span>
                    </div>
                  )}
                  
                  {order.status === 'rejected' && order.rejectionReason && (
                    <div className="rejection-reason">
                      <strong>Rejection Reason:</strong> {order.rejectionReason}
                    </div>
                  )}
                  
                  <div className="order-actions">
                    <button className="btn-sm" onClick={() => setSelectedOrder(order)}>
                      View Details
                    </button>
                    {(
                      // Invoice for COD after approval/delivery
                      ['approved', 'delivered', 'ready_for_pickup', 'collected', 'out_for_delivery'].includes(order.status) ||
                      // Invoice for online payment once paid, even if status is still awaiting_payment
                      (order.status === 'awaiting_payment' && order.paymentStatus === 'paid')
                    ) && order.invoiceNumber && (
                      <button className="btn-sm primary" onClick={() => generateInvoicePDF(order)}>
                        <IconDownload /> Download Invoice
                      </button>
                    )}
                    {/* Delivery info form removed: users never see this after admin approval. */}
                    {/* Show Pay Now button ONLY for online payment, awaiting_payment, and not paid */}
                    {(order.paymentMethod === 'stripe' && order.status === 'awaiting_payment' && order.paymentStatus !== 'paid') && (
                      (() => {
                        const amountToPay = order.totalAmount ?? 0;
                        return (
                          <div className="payment-action-row">
                            <div className="payment-amount-info">
                              <strong>Amount to Pay:</strong> ₹{amountToPay.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              <span className="payment-breakdown">(Includes item total, GST and delivery)</span>
                            </div>
                            <button className="btn-sm primary" onClick={async () => {
                              window.location.href = `/payment/${order._id}`;
                            }}>
                              Pay Now
                            </button>
                          </div>
                        );
                      })()
                    )}
                  </div>
                  {/* Order Tracking Timeline */}
                  {order.statusHistory && order.statusHistory.length > 0 && (
                    <OrderTimeline statusHistory={order.statusHistory} deliveryType={order.deliveryType} />
                  )
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details</h2>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            
            <div className="order-detail">
              <div className="detail-row">
                <span>Order Number</span>
                <strong>{selectedOrder.orderNumber}</strong>
              </div>
              <div className="detail-row">
                <span>Status</span>
                <span className={`badge badge-${getStatusInfo(selectedOrder.status).class}`}>
                  {getStatusInfo(selectedOrder.status).label}
                </span>
              </div>
              <div className="detail-row">
                <span>Delivery Type</span>
                <span className={`delivery-badge ${selectedOrder.deliveryType}`}>
                  {selectedOrder.deliveryType === 'store_pickup' ? <><IconStore /> Store Pickup</> : <><IconTruck /> Home Delivery</>}
                </span>
              </div>
              <div className="detail-row">
                <span>Order Date</span>
                <span>{formatDate(selectedOrder.createdAt)}</span>
              </div>
              {selectedOrder.invoiceNumber && (
                <div className="detail-row">
                  <span>Invoice Number</span>
                  <strong>{selectedOrder.invoiceNumber}</strong>
                </div>
              )}
              {selectedOrder.deliveryType === 'store_pickup' && selectedOrder.pickupCode && (
                <div className="detail-row pickup-code">
                  <span>Pickup Code</span>
                  <strong className="code-highlight">{selectedOrder.pickupCode}</strong>
                </div>
              )}
              <div className="detail-row">
                <span>{selectedOrder.deliveryType === 'store_pickup' ? 'Pickup Location' : 'Delivery Address'}</span>
                <span>{selectedOrder.deliveryAddress}</span>
              </div>
              {selectedOrder.notes && (
                <div className="detail-row">
                  <span>Notes</span>
                  <span>{selectedOrder.notes}</span>
                </div>
              )}
              
              <h3>Items</h3>
              <div className="items-list">
                {selectedOrder.items.map(item => (
                  <div key={item.productName} className="item-row">
                    <div className="item-name">{item.productName}</div>
                    <div className="item-qty">× {item.quantity}</div>
                    <div className="item-price">₹{item.price.toLocaleString('en-IN')} each</div>
                    <div className="item-subtotal">₹{item.subtotal.toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
              
              <div className="detail-charges">
                <div className="charge-detail-row">
                  <span>Items Subtotal</span>
                  <span>₹{(selectedOrder.subtotal || selectedOrder.totalAmount).toLocaleString('en-IN')}</span>
                </div>
                {selectedOrder.totalTax != null && selectedOrder.totalTax > 0 && (
                  <div className="charge-detail-row">
                    <span>GST</span>
                    <span>₹{selectedOrder.totalTax.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {selectedOrder.totalWeight > 0 && (
                  <div className="charge-detail-row">
                    <span>Total Weight</span>
                    <span>{selectedOrder.totalWeight?.toFixed(2)} kg</span>
                  </div>
                )}
                <div className="charge-detail-row">
                  <span>Delivery Charge</span>
                  <span>{selectedOrder.deliveryCharge === 0 ? <span className="free-tag">FREE</span> : `₹${selectedOrder.deliveryCharge?.toLocaleString('en-IN')}`}</span>
                </div>
              </div>
              
              <div className="detail-total">
                <span>Total Amount</span>
                <strong>₹{selectedOrder.totalAmount.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rate Product</h2>
              <button className="close-btn" onClick={() => setReviewModal(null)}>×</button>
            </div>
            <ReviewForm
              orderId={reviewModal.orderId}
              productId={reviewModal.productId}
              productName={reviewModal.productName}
              onClose={() => setReviewModal(null)}
              onSubmitted={(newReview) => {
                setMyReviews(prev => [...prev, newReview]);
                setReviewModal(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewForm({ orderId, productId, productName, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/reviews', {
        orderId,
        productId,
        rating,
        title,
        comment,
      });
      onSubmitted(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="review-product-name">{productName}</div>
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={"star-btn " + ((hover || rating) >= star ? 'filled' : '')}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
          >
            ★
          </button>
        ))}
      </div>
      <label className="form-label">Title (optional)</label>
      <input
        className="input"
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={100}
        placeholder="Short summary"
      />
      <label className="form-label">Comments (optional)</label>
      <textarea
        className="input"
        rows={3}
        value={comment}
        onChange={e => setComment(e.target.value)}
        maxLength={500}
        placeholder="Share your experience (quality, freshness, delivery, etc.)"
      />
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}
