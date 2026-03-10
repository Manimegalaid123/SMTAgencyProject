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
  const [searchParams, setSearchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [paymentMessage, setPaymentMessage] = useState(null);

  // Handle payment callback
  useEffect(() => {
    const payment = searchParams.get('payment');
    const orderId = searchParams.get('orderId');
    
    if (payment === 'success' && orderId) {
      // Clear cart after successful payment
      clearCart();
      
      // Verify payment
      api.get(`/payments/verify/${orderId}`)
        .then(({ data }) => {
          if (data.success) {
            setPaymentMessage({ type: 'success', text: 'Payment successful! Your order has been confirmed.' });
          }
        })
        .catch(() => {
          setPaymentMessage({ type: 'info', text: 'Order placed! Payment is being processed.' });
        });
      
      // Clear URL params
      setSearchParams({});
    } else if (payment === 'cancel') {
      setPaymentMessage({ type: 'warning', text: 'Payment cancelled. Your order is saved as Cash on Delivery.' });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, clearCart]);

  useEffect(() => {
    api.get('/orders')
      .then(({ data }) => setOrders(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
    const tableData = order.items.map((item, index) => [
      index + 1,
      item.productName,
      item.quantity,
      `Rs. ${item.price.toLocaleString('en-IN')}`,
      `Rs. ${item.subtotal.toLocaleString('en-IN')}`
    ]);
    
    autoTable(doc, {
      startY: 105,
      head: [['#', 'Product', 'Qty', 'Unit Price', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 102, 51],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' }
      }
    });
    
    const finalY = doc.lastAutoTable.finalY + 10;
    
    const subtotal = order.totalAmount;
    const gst = subtotal * 0.18;
    const grandTotal = subtotal + gst;
    
    doc.text('Subtotal:', pageWidth - 80, finalY);
    doc.text(`Rs. ${subtotal.toLocaleString('en-IN')}`, pageWidth - 14, finalY, { align: 'right' });
    
    doc.text('GST (18%):', pageWidth - 80, finalY + 7);
    doc.text(`Rs. ${gst.toLocaleString('en-IN')}`, pageWidth - 14, finalY + 7, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Grand Total:', pageWidth - 80, finalY + 17);
    doc.text(`Rs. ${grandTotal.toLocaleString('en-IN')}`, pageWidth - 14, finalY + 17, { align: 'right' });
    
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
                      </div>
                    ))}
                  </div>
                  
                  {/* Delivery Charges Breakdown */}
                  <div className="order-charges">
                    <div className="charge-line">
                      <span>Subtotal:</span>
                      <span>
                        ₹{order.subtotal != null
                          ? order.subtotal.toLocaleString('en-IN')
                          : order.totalAmount != null
                            ? order.totalAmount.toLocaleString('en-IN')
                            : '—'}
                      </span>
                    </div>
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
                  
                  {/* Payment Status */}
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
                  
                  {order.status === 'rejected' && order.rejectionReason && (
                    <div className="rejection-reason">
                      <strong>Rejection Reason:</strong> {order.rejectionReason}
                    </div>
                  )}
                  
                  <div className="order-actions">
                    <button className="btn-sm" onClick={() => setSelectedOrder(order)}>
                      View Details
                    </button>
                    {['approved', 'delivered', 'ready_for_pickup', 'collected', 'out_for_delivery'].includes(order.status) && order.invoiceNumber && (
                      <button className="btn-sm primary" onClick={() => generateInvoicePDF(order)}>
                        <IconDownload /> Download Invoice
                      </button>
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
                  <span>Subtotal</span>
                  <span>₹{(selectedOrder.subtotal || selectedOrder.totalAmount).toLocaleString('en-IN')}</span>
                </div>
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
    </div>
  );
}
