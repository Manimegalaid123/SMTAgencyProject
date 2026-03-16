import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Products.css';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Cart Icon
const IconCart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconMinus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconPackage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const IconTruck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

const IconStore = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

const IconCreditCard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const IconCash = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <circle cx="12" cy="12" r="3"/>
    <path d="M6 12h.01M18 12h.01"/>
  </svg>
);

export default function AgencyProducts() {
  const { user } = useAuth();
  const { cartItems, addToCart, updateQuantity, removeFromCart, clearCart, getCartTotal, getCartCount } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    deliveryType: 'home_delivery',
    address: '',
    notes: '',
    paymentMethod: 'cod' // 'cod' or 'stripe'
  });
  const [submitting, setSubmitting] = useState(false);
  const [deliveryCalc, setDeliveryCalc] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [qtyInputs, setQtyInputs] = useState({});
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [zoomProduct, setZoomProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('popular');
  const [hoverZoom, setHoverZoom] = useState({ productId: null, x: 50, y: 50, active: false });
  const [overlayZoom, setOverlayZoom] = useState({ x: 50, y: 50, active: false });

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  const fetchProducts = () => {
    api.get('/products')
      .then(({ data }) => {
        setProducts(Array.isArray(data) ? data : (data.products || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Calculate delivery charges when checkout opens or delivery type changes
  useEffect(() => {
    if (checkoutOpen && cartItems.length > 0) {
      setCalcLoading(true);
      api.post('/orders/calculate-delivery', {
        items: cartItems.map(item => ({ productId: item.productId, quantity: item.quantity })),
        deliveryType: checkoutForm.deliveryType
      })
        .then(({ data }) => setDeliveryCalc(data))
        .catch(() => setDeliveryCalc(null))
        .finally(() => setCalcLoading(false));
    }
  }, [checkoutOpen, checkoutForm.deliveryType, cartItems]);

  const qty = (p) => p.stock ?? p.availableQuantity ?? 0;
  const availabilityStatus = (p) => p.availabilityStatus ?? p.status ?? (qty(p) > 0 ? 'Available' : 'Out of Stock');
  const canOrder = (p) => availabilityStatus(p) === 'Available' && qty(p) > 0;

  const renderRating = (p) => {
    const count = p.reviewCount || 0;
    const avg = p.avgRating || 0;
    if (!count) return null;
    return (
      <span className="product-rating">
        <span className="stars">★ {avg.toFixed(1)}</span>
        <span className="count">({count})</span>
      </span>
    );
  };
  
  const getCartItemQty = (productId) => {
    const item = cartItems.find(i => i.productId === productId);
    return item ? item.quantity : 0;
  };

  const getQtyInput = (productId) => qtyInputs[productId] ?? '';
  
  const setQtyInput = (productId, value) => {
    setQtyInputs(prev => ({ ...prev, [productId]: value }));
  };

  const handleAddToCart = (product) => {
    const quantity = parseInt(qtyInputs[product._id]) || 1;
    if (quantity < 1) return;
    addToCart(product, quantity);
    setQtyInputs(prev => ({ ...prev, [product._id]: '' })); // Reset input after adding
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    setSubmitting(true);
    try {
      const orderData = {
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        notes: checkoutForm.notes || undefined,
        deliveryType: checkoutForm.deliveryType,
        deliveryAddress: checkoutForm.deliveryType === 'home_delivery' ? checkoutForm.address : undefined,
           paymentMethod: checkoutForm.paymentMethod || 'cod', // 'cod' or 'stripe'
      };
      const { data: order } = await api.post('/orders', orderData);
      clearCart();
      setCheckoutOpen(false);
      setCartOpen(false);
      setCheckoutForm({ deliveryType: 'home_delivery', address: '', notes: '' });
      setDeliveryCalc(null);
      alert('Order placed successfully! The admin will review your order.');
      navigate('/my-orders');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchLocation = async () => {
    const query = locationQuery.trim();
    if (!query) return;
    try {
      setLocationSearching(true);
      setLocationResults([]);
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });
      const data = await res.json();
      setLocationResults(Array.isArray(data) ? data : []);
    } catch (err) {
      alert('Unable to search location. Please try again.');
    } finally {
      setLocationSearching(false);
    }
  };

  const handleImageMouseMove = (e, productId) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setHoverZoom({ productId, x, y, active: true });
  };

  const handleImageMouseLeave = () => {
    setHoverZoom(prev => ({ ...prev, active: false }));
  };

  const handleOverlayMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOverlayZoom({ x, y, active: true });
  };

  const handleOverlayMouseLeave = () => {
    setOverlayZoom(prev => ({ ...prev, active: false }));
  };

  const filteredProducts = React.useMemo(() => {
    let result = products;

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((p) => {
        const name = (p.name || '').toLowerCase();
        return name.includes(term);
      });
    }

    const sorted = [...result];
    if (sortOption === 'price_low') {
      sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortOption === 'price_high') {
      sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else {
      // popular: higher review count and rating first
      sorted.sort((a, b) => {
        const scoreA = (a.reviewCount || 0) * 10 + (a.avgRating || 0);
        const scoreB = (b.reviewCount || 0) * 10 + (b.avgRating || 0);
        return scoreB - scoreA;
      });
    }

    return sorted;
  }, [products, searchTerm, sortOption]);

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="products-page agency-products-page">
      <div className="page-header">
        <h1 className="page-title">SMT Agency Products</h1>
        <p className="page-desc">Browse products and add to cart. Place your order when ready.</p>
        <div className="page-header-actions">
          <button className="btn-cart" onClick={() => setCartOpen(true)}>
            <IconCart />
            Cart ({getCartCount()})
            {getCartCount() > 0 && <span className="cart-badge">{getCartCount()}</span>}
          </button>
        </div>
      </div>
      <div className="products-toolbar">
        <div className="products-search">
          <input
            type="text"
            className="input"
            placeholder="Search products by name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="products-sort-tabs">
            <button
              type="button"
              className={sortOption === 'popular' ? 'sort-tab active' : 'sort-tab'}
              onClick={() => setSortOption('popular')}
            >
              Popular
            </button>
            <button
              type="button"
              className={sortOption === 'price_low' ? 'sort-tab active' : 'sort-tab'}
              onClick={() => setSortOption('price_low')}
            >
              Low Price
            </button>
            <button
              type="button"
              className={sortOption === 'price_high' ? 'sort-tab active' : 'sort-tab'}
              onClick={() => setSortOption('price_high')}
            >
              High Price
            </button>
          </div>
      </div>

      <div className="products-grid">
        {filteredProducts.map((p) => {
          const mainImage = p.imageUrl || (Array.isArray(p.images) && p.images.length ? p.images[0] : null);
          return (
          <div key={p._id} className="product-card">
            {mainImage && (
              <div
                className="product-image-wrap zoomable"
                onClick={() => setZoomProduct(p)}
                onMouseMove={(e) => handleImageMouseMove(e, p._id)}
                onMouseLeave={handleImageMouseLeave}
              >
                <img
                  src={mainImage}
                  alt={p.name}
                  className="product-image"
                  loading="lazy"
                  style={
                    hoverZoom.active && hoverZoom.productId === p._id
                      ? {
                          transformOrigin: `${hoverZoom.x}% ${hoverZoom.y}%`,
                          transform: 'scale(1.5)'
                        }
                      : undefined
                  }
                />
              </div>
            )}
            <div className="product-name">{p.name}{p.packSize ? ` (${p.packSize})` : ''}</div>
            {renderRating(p)}
            <div className="product-category">{p.category || 'FMCG'}</div>
            <div className="product-meta">
              <span>₹{Number(p.price).toLocaleString('en-IN')} / unit</span>
              {p.expiryDate && (
                <span className="expiry-badge">Expiry: {formatDate(p.expiryDate)}</span>
              )}
            </div>
            <div className="product-status">
              <span className={`badge badge-${availabilityStatus(p) === 'Available' ? 'success' : 'danger'}`}>
                {availabilityStatus(p)}
              </span>
            </div>
            <div className="product-actions add-cart-row">
              <input
                type="number"
                min="1"
                value={getQtyInput(p._id)}
                onChange={(e) => setQtyInput(p._id, e.target.value)}
                className="qty-input-small"
                disabled={!canOrder(p)}
              />
              <button
                type="button"
                className="btn-sm primary add-cart-btn"
                onClick={() => handleAddToCart(p)}
                disabled={!canOrder(p)}
              >
                <IconCart /> Add
              </button>
              <button
                type="button"
                className="btn-sm"
                onClick={() => navigate(`/agency-products/${p._id}`)}
              >
                View details
              </button>
            </div>
            {getCartItemQty(p._id) > 0 && (
              <div className="in-cart-info">
                {getCartItemQty(p._id)} in cart
              </div>
            )}
          </div>
        );
        })}
      </div>

      {filteredProducts.length === 0 && products.length > 0 && (
        <div className="empty-state">
          <p>No products match your search.</p>
        </div>
      )}

      {products.length === 0 && (
        <div className="empty-state">
          <p>No products available from SMT Agency at the moment.</p>
        </div>
      )}

      {/* Cart Sidebar */}
      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h2>Your Cart</h2>
              <button className="close-btn" onClick={() => setCartOpen(false)}>×</button>
            </div>
            
            {cartItems.length === 0 ? (
              <div className="cart-empty">
                <p>Your cart is empty</p>
                <button className="btn-secondary" onClick={() => setCartOpen(false)}>Continue Shopping</button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cartItems.map(item => (
                    <div key={item.productId} className="cart-item">
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.productName}</div>
                        <div className="cart-item-price">₹{Number(item.price).toLocaleString('en-IN')} / unit</div>
                      </div>
                      <div className="cart-item-controls">
                        <div className="cart-qty-control">
                          <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                            <IconMinus />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                            className="qty-input"
                          />
                          <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                            <IconPlus />
                          </button>
                        </div>
                        <button className="remove-btn" onClick={() => removeFromCart(item.productId)}>
                          <IconTrash />
                        </button>
                      </div>
                      <div className="cart-item-subtotal">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="cart-footer">
                  <div className="cart-total">
                    <span>Total:</span>
                    <span>₹{getCartTotal().toLocaleString('en-IN')}</span>
                  </div>
                  <button className="btn-primary" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>
                    Proceed to Checkout
                  </button>
                  <button className="btn-secondary" onClick={clearCart}>Clear Cart</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="modal-overlay" onClick={() => setCheckoutOpen(false)}>
          <div className="modal checkout-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Place Order</h2>
            
            {/* Delivery Type Selection */}
            <div className="delivery-type-section">
              <h3><IconPackage /> Delivery Option</h3>
              <div className="delivery-options">
                <label className={`delivery-option ${checkoutForm.deliveryType === 'home_delivery' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="deliveryType"
                    value="home_delivery"
                    checked={checkoutForm.deliveryType === 'home_delivery'}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryType: e.target.value })}
                  />
                  <div className="option-content">
                    <span className="option-icon"><IconTruck /></span>
                    <div className="option-info">
                      <strong>Home Delivery</strong>
                      <small>We'll deliver to your address</small>
                    </div>
                  </div>
                </label>
                <label className={`delivery-option ${checkoutForm.deliveryType === 'store_pickup' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="deliveryType"
                    value="store_pickup"
                    checked={checkoutForm.deliveryType === 'store_pickup'}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryType: e.target.value })}
                  />
                  <div className="option-content">
                    <span className="option-icon"><IconStore /></span>
                    <div className="option-info">
                      <strong>Store Pickup</strong>
                      <small>Collect from SMT Agency - No delivery charge!</small>
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="order-summary">
              <h3>Order Summary</h3>
              <div className="order-items">
                {cartItems.map(item => (
                  <div key={item.productId} className="order-item">
                    <span>{item.productName} × {item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              
              {/* Delivery Charges Breakdown */}
              <div className="delivery-charges-section">
                {calcLoading ? (
                  <div className="calc-loading">Calculating delivery charges...</div>
                ) : deliveryCalc && (
                  <>
                    <div className="charge-row subtotal">
                      <span>Subtotal:</span>
                      <span>₹{deliveryCalc.subtotal?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="charge-row weight">
                      <span>Total Weight:</span>
                      <span>{deliveryCalc.totalWeight} kg</span>
                    </div>
                    <div className={`charge-row delivery ${deliveryCalc.deliveryCharge === 0 ? 'free' : ''}`}>
                      <span>
                        Delivery Charge:
                        {deliveryCalc.breakdown?.message && (
                          <small className="charge-breakdown">{deliveryCalc.breakdown.message}</small>
                        )}
                      </span>
                      <span>
                        {deliveryCalc.deliveryCharge === 0 ? (
                          <span className="free-badge">FREE</span>
                        ) : (
                          `₹${deliveryCalc.deliveryCharge?.toLocaleString('en-IN')}`
                        )}
                      </span>
                    </div>
                    {deliveryCalc.deliveryCharge > 0 && checkoutForm.deliveryType === 'home_delivery' && deliveryCalc.subtotal < deliveryCalc.freeDeliveryThreshold && (
                      <div className="free-delivery-hint">
                        <IconInfo /> Add ₹{(deliveryCalc.freeDeliveryThreshold - deliveryCalc.subtotal).toLocaleString('en-IN')} more for FREE delivery!
                      </div>
                    )}
                    <div className="charge-row total">
                      <strong>Total Amount:</strong>
                      <strong>₹{deliveryCalc.totalAmount?.toLocaleString('en-IN')}</strong>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <form onSubmit={handlePlaceOrder} className="form">
              {checkoutForm.deliveryType === 'home_delivery' && (
                <>
                  <label className="form-label">Delivery Address *</label>
                  <textarea
                    placeholder="Enter your complete delivery address"
                    value={checkoutForm.address}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                    required
                    className="input"
                    rows={3}
                  />
                  <button
                    type="button"
                    className="btn-secondary btn-use-location"
                    onClick={async () => {
                      if (!navigator.geolocation) {
                        alert('Location is not supported in this browser.');
                        return;
                      }
                      try {
                        await new Promise((resolve, reject) => {
                          navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 15000,
                            maximumAge: 0,
                          });
                        }).then(async (pos) => {
                          const { latitude, longitude } = pos.coords;
                          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`;
                          const res = await fetch(url, {
                            headers: {
                              'Accept': 'application/json',
                            },
                          });
                          const data = await res.json();
                          const formatted = data.display_name;
                          if (formatted) {
                            setCheckoutForm((prev) => ({ ...prev, address: formatted }));
                          } else {
                            alert('Could not detect address from your location.');
                          }
                        });
                      } catch (err) {
                        alert('Unable to fetch your location. Please enter address manually.');
                      }
                    }}
                    style={{ marginTop: '0.5rem' }}
                  >
                    Use my location
                  </button>
                  <label className="form-label" style={{ marginTop: '0.75rem' }}>Search location (optional)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Type area or city name, e.g. Erode"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      className="input"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleSearchLocation}
                      disabled={locationSearching}
                    >
                      {locationSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {locationResults.length > 0 && (
                    <div className="location-search-results" style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '0.5rem' }}>
                      {locationResults.map((r) => (
                        <button
                          key={r.place_id}
                          type="button"
                          className="btn-secondary"
                          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: '0.25rem', whiteSpace: 'normal' }}
                          onClick={() => {
                            const addr = r.display_name;
                            if (addr) {
                              setCheckoutForm((prev) => ({ ...prev, address: addr }));
                            }
                            setLocationResults([]);
                          }}
                        >
                          {r.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {checkoutForm.deliveryType === 'store_pickup' && (
                <div className="pickup-info-box">
                  <h4><IconStore /> Store Pickup Information</h4>
                  <p><strong>Location:</strong> SMT Agency Main Store</p>
                  <p><strong>Hours:</strong> Mon-Sat, 9:00 AM - 6:00 PM</p>
                  <p className="pickup-note">You'll receive a 6-digit pickup code after placing the order. Show this code when collecting your order.</p>
                </div>
              )}
              
              <label className="form-label">Notes (Optional)</label>
              <textarea
                placeholder="Any special instructions or notes"
                value={checkoutForm.notes}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                className="input"
                rows={2}
              />


              {/* Payment Method Selection - Card Style */}
              <div className="payment-method-section">
                <h3><span style={{marginRight: 8}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></span>Payment Method</h3>
                <div className="payment-options card-style">
                  <label className={`payment-option-card ${checkoutForm.paymentMethod === 'cod' ? 'selected' : ''}`} style={{display: 'flex',alignItems: 'center',border: checkoutForm.paymentMethod === 'cod' ? '2px solid #198754' : '1px solid #ccc',borderRadius: 12,padding: 16,marginBottom: 12,background: checkoutForm.paymentMethod === 'cod' ? '#f6fbf7' : '#fff',cursor: 'pointer'}}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={checkoutForm.paymentMethod === 'cod'}
                      onChange={e => setCheckoutForm({ ...checkoutForm, paymentMethod: e.target.value })}
                      style={{marginRight: 16}}
                    />
                    <span style={{display: 'flex',alignItems: 'center'}}>
                      <span style={{background: '#198754', color: '#fff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16}}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>
                      </span>
                      <span>
                        <strong>Cash on Delivery</strong><br/>
                        <span style={{fontSize: 13, color: '#555'}}>Pay when you receive your order</span>
                      </span>
                    </span>
                  </label>
                  <label className={`payment-option-card ${checkoutForm.paymentMethod === 'stripe' ? 'selected' : ''}`} style={{display: 'flex',alignItems: 'center',border: checkoutForm.paymentMethod === 'stripe' ? '2px solid #198754' : '1px solid #ccc',borderRadius: 12,padding: 16,background: checkoutForm.paymentMethod === 'stripe' ? '#f6fbf7' : '#fff',cursor: 'pointer'}}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="stripe"
                      checked={checkoutForm.paymentMethod === 'stripe'}
                      onChange={e => setCheckoutForm({ ...checkoutForm, paymentMethod: e.target.value })}
                      style={{marginRight: 16}}
                    />
                    <span style={{display: 'flex',alignItems: 'center'}}>
                      <span style={{background: '#198754', color: '#fff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16}}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      </span>
                      <span>
                        <strong>Pay Online</strong><br/>
                        <span style={{fontSize: 13, color: '#555'}}>Secure payment via Stripe (Cards, UPI, etc.)</span>
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setCheckoutOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting || calcLoading}>
                  {submitting ? 'Placing Order...' : `Place Order${deliveryCalc ? ` - ₹${deliveryCalc.totalAmount?.toLocaleString('en-IN')}` : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {zoomProduct && (zoomProduct.imageUrl || (Array.isArray(zoomProduct.images) && zoomProduct.images[0])) && (
        <div className="image-zoom-overlay" onClick={() => setZoomProduct(null)}>
          <div className="image-zoom-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="image-zoom-close"
              onClick={() => setZoomProduct(null)}
            >
              ×
            </button>
            <div className="image-zoom-img-wrap">
              <img
                src={zoomProduct.imageUrl || (Array.isArray(zoomProduct.images) && zoomProduct.images[0])}
                alt={zoomProduct.name}
                className="image-zoom-img"
                onMouseMove={handleOverlayMouseMove}
                onMouseLeave={handleOverlayMouseLeave}
                style={
                  overlayZoom.active
                    ? {
                        transformOrigin: `${overlayZoom.x}% ${overlayZoom.y}%`,
                        transform: 'scale(2.4)'
                      }
                    : undefined
                }
              />
            </div>
            <div className="image-zoom-info">
              <h3>
                {zoomProduct.name}
                {zoomProduct.packSize ? ` (${zoomProduct.packSize})` : ''}
              </h3>
              {zoomProduct.category && (
                <p className="image-zoom-meta">{zoomProduct.category}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
