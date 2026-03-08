import React, { useEffect, useState } from 'react';
import api from '../api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Orders.css';

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconTruck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

const IconStore = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [collectModal, setCollectModal] = useState(null);
  const [pickupCodeInput, setPickupCodeInput] = useState('');

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders');
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleApprove = async (orderId) => {
    if (!window.confirm('Approve this order? This will create export records and deduct from stock.')) return;
    try {
      await api.patch(`/orders/${orderId}/approve`);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve order');
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await api.patch(`/orders/${rejectModal._id}/reject`, { reason: rejectReason });
      setRejectModal(null);
      setRejectReason('');
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject order');
    }
  };

  const handleDeliver = async (orderId) => {
    if (!window.confirm('Mark this order as delivered?')) return;
    try {
      await api.patch(`/orders/${orderId}/deliver`);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark as delivered');
    }
  };

  const handleOutForDelivery = async (orderId) => {
    if (!window.confirm('Mark this order as out for delivery?')) return;
    try {
      await api.patch(`/orders/${orderId}/out-for-delivery`);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleCollect = async () => {
    if (!collectModal) return;
    try {
      await api.patch(`/orders/${collectModal._id}/collect`, { pickupCode: pickupCodeInput });
      setCollectModal(null);
      setPickupCodeInput('');
      fetchOrders();
      alert('Order collected successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Invalid pickup code');
    }
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
    
    // Left side - Invoice details
    doc.text(`Invoice No: ${order.invoiceNumber || 'N/A'}`, 14, 70);
    doc.text(`Order No: ${order.orderNumber}`, 14, 77);
    doc.text(`Date: ${new Date(order.approvedAt || order.createdAt).toLocaleDateString('en-IN')}`, 14, 84);
    
    // Right side - Customer details
    doc.text('Bill To:', pageWidth - 80, 70);
    doc.setFont('helvetica', 'bold');
    doc.text(order.agencyName, pageWidth - 80, 77);
    doc.setFont('helvetica', 'normal');
    
    // Wrap address text
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
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' }
      }
    });
    
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Totals
    const subtotal = order.totalAmount;
    const gst = subtotal * 0.18;
    const grandTotal = subtotal + gst;
    
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', pageWidth - 80, finalY);
    doc.text(`Rs. ${subtotal.toLocaleString('en-IN')}`, pageWidth - 14, finalY, { align: 'right' });
    
    doc.text('GST (18%):', pageWidth - 80, finalY + 7);
    doc.text(`Rs. ${gst.toLocaleString('en-IN')}`, pageWidth - 14, finalY + 7, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Grand Total:', pageWidth - 80, finalY + 17);
    doc.text(`Rs. ${grandTotal.toLocaleString('en-IN')}`, pageWidth - 14, finalY + 17, { align: 'right' });
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', pageWidth / 2, finalY + 40, { align: 'center' });
    doc.text('SMT Agency | Phone: +91 98765 43210 | Email: info@smtagency.com', pageWidth / 2, finalY + 47, { align: 'center' });
    
    doc.save(`Invoice_${order.invoiceNumber || order.orderNumber}.pdf`);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { 
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  }) : '—';

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { class: 'warning', label: 'Pending' },
      approved: { class: 'info', label: 'Approved' },
      rejected: { class: 'danger', label: 'Rejected' },
      ready_for_pickup: { class: 'info', label: 'Ready for Pickup' },
      out_for_delivery: { class: 'info', label: 'Out for Delivery' },
      delivered: { class: 'success', label: 'Delivered' },
      collected: { class: 'success', label: 'Collected' }
    };
    const s = statusMap[status] || { class: 'default', label: status };
    return <span className={`badge badge-${s.class}`}>{s.label}</span>;
  };

  const getDeliveryTypeBadge = (type) => {
    if (type === 'store_pickup') {
      return <span className="delivery-badge store"><IconStore /> Store Pickup</span>;
    }
    return <span className="delivery-badge home"><IconTruck /> Home Delivery</span>;
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="orders-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders Management</h1>
          <p className="page-desc">View and manage customer orders. Approve to create exports automatically.</p>
        </div>
        <div className="filter-tabs">
          {['all', 'pending', 'approved', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'collected', 'rejected'].map(f => (
            <button 
              key={f} 
              className={filter === f ? 'active' : ''} 
              onClick={() => setFilter(f)}
            >
              {f === 'ready_for_pickup' ? 'Pickup Ready' : f === 'out_for_delivery' ? 'Dispatched' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && ` (${orders.filter(o => o.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <p>No {filter !== 'all' ? filter : ''} orders found.</p>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map(order => (
            <div key={order._id} className={`order-card order-${order.status}`}>
              <div className="order-header">
                <div className="order-id">
                  <strong>{order.orderNumber}</strong>
                  {getStatusBadge(order.status)}
                  {getDeliveryTypeBadge(order.deliveryType)}
                </div>
                <div className="order-date">{formatDate(order.createdAt)}</div>
              </div>
              
              <div className="order-body">
                <div className="order-customer">
                  <strong>{order.agencyName}</strong>
                  <span className="order-address">{order.deliveryAddress}</span>
                </div>
                
                <div className="order-items-preview">
                  {order.items.slice(0, 2).map(item => (
                    <span key={item.product?._id || item.productName}>
                      {item.productName} × {item.quantity}
                    </span>
                  ))}
                  {order.items.length > 2 && <span>+{order.items.length - 2} more</span>}
                </div>
                
                <div className="order-pricing">
                  <div className="pricing-row">
                    <span>Subtotal:</span>
                    <span>₹{(order.subtotal || order.totalAmount).toLocaleString('en-IN')}</span>
                  </div>
                  {order.totalWeight > 0 && (
                    <div className="pricing-row small">
                      <span>Weight:</span>
                      <span>{order.totalWeight?.toFixed(2)} kg</span>
                    </div>
                  )}
                  <div className={`pricing-row ${order.deliveryCharge === 0 ? 'free' : ''}`}>
                    <span>Delivery:</span>
                    <span>{order.deliveryCharge === 0 ? <span className="free-tag">FREE</span> : `₹${order.deliveryCharge?.toLocaleString('en-IN')}`}</span>
                  </div>
                  <div className="pricing-row total">
                    <span>Total:</span>
                    <strong>₹{order.totalAmount.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
              
              <div className="order-actions">
                <button className="btn-sm" onClick={() => setSelectedOrder(order)}>
                  <IconEye /> View
                </button>
                
                {order.status === 'pending' && (
                  <>
                    <button className="btn-sm success" onClick={() => handleApprove(order._id)}>
                      <IconCheck /> Approve
                    </button>
                    <button className="btn-sm danger" onClick={() => setRejectModal(order)}>
                      <IconX /> Reject
                    </button>
                  </>
                )}
                
                {/* Home Delivery Actions */}
                {order.status === 'approved' && order.deliveryType === 'home_delivery' && (
                  <>
                    <button className="btn-sm primary" onClick={() => handleOutForDelivery(order._id)}>
                      <IconTruck /> Dispatch
                    </button>
                    <button className="btn-sm" onClick={() => generateInvoicePDF(order)}>
                      <IconDownload /> Invoice
                    </button>
                  </>
                )}
                
                {order.status === 'out_for_delivery' && (
                  <>
                    <button className="btn-sm success" onClick={() => handleDeliver(order._id)}>
                      <IconCheck /> Mark Delivered
                    </button>
                    <button className="btn-sm" onClick={() => generateInvoicePDF(order)}>
                      <IconDownload /> Invoice
                    </button>
                  </>
                )}
                
                {/* Store Pickup Actions */}
                {order.status === 'ready_for_pickup' && (
                  <>
                    <button className="btn-sm success" onClick={() => setCollectModal(order)}>
                      <IconStore /> Verify & Collect
                    </button>
                    <button className="btn-sm" onClick={() => generateInvoicePDF(order)}>
                      <IconDownload /> Invoice
                    </button>
                  </>
                )}
                
                {['delivered', 'collected'].includes(order.status) && order.invoiceNumber && (
                  <button className="btn-sm" onClick={() => generateInvoicePDF(order)}>
                    <IconDownload /> Invoice
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal order-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details</h2>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            
            <div className="order-detail-content">
              <div className="detail-row">
                <span>Order Number:</span>
                <strong>{selectedOrder.orderNumber}</strong>
              </div>
              <div className="detail-row">
                <span>Status:</span>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <div className="detail-row">
                <span>Delivery Type:</span>
                {getDeliveryTypeBadge(selectedOrder.deliveryType)}
              </div>
              <div className="detail-row">
                <span>Customer:</span>
                <strong>{selectedOrder.agencyName}</strong>
              </div>
              <div className="detail-row">
                <span>{selectedOrder.deliveryType === 'store_pickup' ? 'Pickup Location:' : 'Delivery Address:'}</span>
                <span>{selectedOrder.deliveryAddress}</span>
              </div>
              {selectedOrder.deliveryType === 'store_pickup' && selectedOrder.pickupCode && (
                <div className="detail-row pickup-highlight">
                  <span>Pickup Code:</span>
                  <strong className="pickup-code">{selectedOrder.pickupCode}</strong>
                </div>
              )}
              <div className="detail-row">
                <span>Order Date:</span>
                <span>{formatDate(selectedOrder.createdAt)}</span>
              </div>
              {selectedOrder.invoiceNumber && (
                <div className="detail-row">
                  <span>Invoice Number:</span>
                  <strong>{selectedOrder.invoiceNumber}</strong>
                </div>
              )}
              {selectedOrder.notes && (
                <div className="detail-row">
                  <span>Notes:</span>
                  <span>{selectedOrder.notes}</span>
                </div>
              )}
              {selectedOrder.rejectionReason && (
                <div className="detail-row danger">
                  <span>Rejection Reason:</span>
                  <span>{selectedOrder.rejectionReason}</span>
                </div>
              )}
              
              <h3>Order Items</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map(item => (
                    <tr key={item.product?._id || item.productName}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.price.toLocaleString('en-IN')}</td>
                      <td>₹{item.subtotal.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3">Subtotal</td>
                    <td>₹{(selectedOrder.subtotal || selectedOrder.totalAmount).toLocaleString('en-IN')}</td>
                  </tr>
                  {selectedOrder.totalWeight > 0 && (
                    <tr className="weight-row">
                      <td colSpan="3">Weight</td>
                      <td>{selectedOrder.totalWeight?.toFixed(2)} kg</td>
                    </tr>
                  )}
                  <tr className={selectedOrder.deliveryCharge === 0 ? 'free-delivery' : ''}>
                    <td colSpan="3">Delivery Charge</td>
                    <td>{selectedOrder.deliveryCharge === 0 ? <span className="free-tag">FREE</span> : `₹${selectedOrder.deliveryCharge?.toLocaleString('en-IN')}`}</td>
                  </tr>
                  <tr className="total-row">
                    <td colSpan="3"><strong>Total</strong></td>
                    <td><strong>₹{selectedOrder.totalAmount.toLocaleString('en-IN')}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Reject Order</h2>
            <p>Rejecting order <strong>{rejectModal.orderNumber}</strong> from {rejectModal.agencyName}</p>
            <div className="form">
              <label className="form-label">Reason for Rejection</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
                <button className="btn-danger" onClick={handleReject}>Reject Order</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collect/Pickup Verification Modal */}
      {collectModal && (
        <div className="modal-overlay" onClick={() => setCollectModal(null)}>
          <div className="modal collect-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><IconStore /> Verify Pickup</h2>
              <button className="close-btn" onClick={() => setCollectModal(null)}>×</button>
            </div>
            <p>Order <strong>{collectModal.orderNumber}</strong> - {collectModal.agencyName}</p>
            <div className="collect-info">
              <div className="collect-amount">
                <span>Amount to Collect:</span>
                <strong>₹{collectModal.totalAmount.toLocaleString('en-IN')}</strong>
              </div>
            </div>
            <div className="form">
              <label className="form-label">Enter Customer's Pickup Code</label>
              <input
                type="text"
                className="input pickup-code-input"
                placeholder="Enter 6-digit code"
                value={pickupCodeInput}
                onChange={e => setPickupCodeInput(e.target.value)}
                maxLength={6}
                autoFocus
              />
              <p className="hint">Ask the customer for their 6-digit pickup code to verify.</p>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setCollectModal(null)}>Cancel</button>
                <button 
                  className="btn-success" 
                  onClick={handleCollect}
                  disabled={pickupCodeInput.length !== 6}
                >
                  <IconCheck /> Verify & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
