import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('new');
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [locationError, setLocationError] = useState('');
  const [checkoutForm, setCheckoutForm] = useState({
    deliveryType: 'home_delivery',
    address: '', // full address string sent to backend
    addressLine: '',
    city: '',
    district: '',
    pincode: '',
    notes: '',
    paymentMethod: 'cod', // 'cod' or 'stripe'
    deliveryLat: null,
    deliveryLon: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [deliveryCalc, setDeliveryCalc] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [zoomProduct, setZoomProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('popular');
  const [hoverZoom, setHoverZoom] = useState({ productId: null, x: 50, y: 50, active: false });
  const { showError, showSuccess } = useToast();

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

  // Load saved delivery addresses when checkout opens
  useEffect(() => {
    if (!checkoutOpen || !user) return;
    api.get('/auth/addresses')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setSavedAddresses(list);
        if (list.length > 0) {
          setSelectedAddressId(list[0]._id);
        } else {
          setSelectedAddressId('new');
        }
      })
      .catch(() => {
        setSavedAddresses([]);
        setSelectedAddressId('new');
      });
  }, [checkoutOpen, user]);

  // If coming from a Buy Now action, open checkout directly
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    const addressIdFromQuery = searchParams.get('addressId');
    if (addressIdFromQuery) {
      setSelectedAddressId(addressIdFromQuery);
    }
    if (checkout === '1' && cartItems.length > 0) {
      setCartOpen(false);
      setCheckoutOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, cartItems.length]);

  // Base cart total without GST (sum of product price × quantity)
  const baseCartTotal = getCartTotal();

  // When we have a delivery calculation from backend, its `subtotal` already
  // includes item price + GST. Use the difference to show estimated GST
  // clearly in the order summary so users understand the final amount.
  const estimatedGst = deliveryCalc
    ? Math.max(0, (deliveryCalc.subtotal || 0) - baseCartTotal)
    : 0;

  // Calculate delivery charges when checkout opens or delivery type changes
  useEffect(() => {
    if (checkoutOpen && cartItems.length > 0) {
      setCalcLoading(true);
      api.post('/orders/calculate-delivery', {
        items: cartItems.map(item => ({ productId: item.productId, quantity: item.quantity })),
        deliveryType: checkoutForm.deliveryType,
        deliveryLocation:
          checkoutForm.deliveryType === 'home_delivery' &&
          checkoutForm.deliveryLat != null &&
          checkoutForm.deliveryLon != null
            ? { lat: checkoutForm.deliveryLat, lon: checkoutForm.deliveryLon }
            : undefined
      })
        .then(({ data }) => setDeliveryCalc(data))
        .catch(() => setDeliveryCalc(null))
        .finally(() => setCalcLoading(false));
    }
  }, [checkoutOpen, checkoutForm.deliveryType, checkoutForm.deliveryLat, checkoutForm.deliveryLon, cartItems]);

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
  
  const handleAddToCart = (product) => {
    // Simple, clean card UI: always add 1 unit from the list view.
    // Users can adjust quantities inside the cart or product detail page.
    addToCart(product, 1);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    setCheckoutError('');

    // Build a clean Tamil Nadu delivery address when using home delivery
    let finalAddress = checkoutForm.address?.trim();
    let deliveryLat = checkoutForm.deliveryLat;
    let deliveryLon = checkoutForm.deliveryLon;

    if (checkoutForm.deliveryType === 'home_delivery') {
      const usingSaved = savedAddresses.length > 0 && selectedAddressId !== 'new';

      if (usingSaved) {
        const chosen = savedAddresses.find(a => a._id === selectedAddressId);
        if (!chosen) {
          showError('Selected saved address not found. Please choose again.');
          return;
        }
        finalAddress = (chosen.fullAddress || chosen.addressLine || '').trim();
        deliveryLat = chosen.deliveryLat ?? deliveryLat;
        deliveryLon = chosen.deliveryLon ?? deliveryLon;

        if (!finalAddress) {
          showError('Saved address is incomplete. Please edit or choose another address.');
          return;
        }
        if (!chosen.district) {
          showError('Saved address is missing district information. Please choose another address.');
          return;
        }
        if (!chosen.pincode || String(chosen.pincode).length !== 6) {
          showError('Saved address has an invalid pincode. Please choose another address.');
          return;
        }
      } else {
        const parts = [];
        if (checkoutForm.addressLine) parts.push(checkoutForm.addressLine.trim());
        if (checkoutForm.city) parts.push(checkoutForm.city.trim());
        if (checkoutForm.district) parts.push(checkoutForm.district.trim());
        if (checkoutForm.pincode) parts.push(checkoutForm.pincode.trim());
        if (parts.length > 0) {
          finalAddress = parts.join(', ') + ', Tamil Nadu, India';
        }

        // Frontend validation for Tamil Nadu delivery
        if (!finalAddress) {
          showError('Please enter your full delivery address inside Tamil Nadu.');
          return;
        }
        if (!checkoutForm.district) {
          showError('Please select your district in Tamil Nadu.');
          return;
        }
        if (!checkoutForm.pincode || checkoutForm.pincode.length !== 6) {
          showError('Please enter a valid 6-digit pincode.');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
    // Optionally save new address for future use
    if (
      checkoutForm.deliveryType === 'home_delivery' &&
      selectedAddressId === 'new' &&
      saveNewAddress
    ) {
      try {
        await api.post('/auth/addresses', {
          label: newAddressLabel || 'Shop',
          addressLine: checkoutForm.addressLine,
          city: checkoutForm.city,
          district: checkoutForm.district,
          pincode: checkoutForm.pincode,
          fullAddress: finalAddress,
          deliveryLat: checkoutForm.deliveryLat,
          deliveryLon: checkoutForm.deliveryLon,
        }).then(({ data }) => {
          if (Array.isArray(data)) {
            setSavedAddresses(data);
          }
        });
      } catch (err) {
        // Do not block order placement if address save fails
      }
    }

    const orderData = {
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        notes: checkoutForm.notes || undefined,
        deliveryType: checkoutForm.deliveryType,
        deliveryAddress: checkoutForm.deliveryType === 'home_delivery' ? finalAddress : undefined,
        paymentMethod: checkoutForm.paymentMethod || 'cod', // 'cod' or 'stripe'
        deliveryLocation:
          checkoutForm.deliveryType === 'home_delivery' &&
          deliveryLat != null &&
          deliveryLon != null
            ? { lat: deliveryLat, lon: deliveryLon }
            : undefined,
      };
      const { data: order } = await api.post('/orders', orderData);
      clearCart();
      setCheckoutOpen(false);
      setCartOpen(false);
      setCheckoutForm({
        deliveryType: 'home_delivery',
        address: '',
        addressLine: '',
        city: '',
        district: '',
        pincode: '',
        notes: '',
        paymentMethod: 'cod',
        deliveryLat: null,
        deliveryLon: null
      });
      setSelectedAddressId('new');
      setSaveNewAddress(false);
      setNewAddressLabel('');
      setDeliveryCalc(null);
      const method = checkoutForm.paymentMethod || 'cod';
      if (method === 'stripe') {
        showSuccess('Order created successfully. Please complete payment now.');
        navigate(`/payment/${order._id}`);
      } else {
        showSuccess('Order placed successfully!');
        navigate('/my-orders');
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to place order. Please try again.';
      setCheckoutError(message);
    } finally {
      setSubmitting(false);
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
          const inCartQty = getCartItemQty(p._id);
          return (
          <div
            key={p._id}
            className="product-card"
            onClick={() => navigate(`/agency-products/${p._id}`)}
          >
            {mainImage && (
              <div className="product-image-wrap">
                <img
                  src={mainImage}
                  alt={p.name}
                  className="product-image"
                  loading="lazy"
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
            <div className="product-card-footer">
              {inCartQty > 0 ? (
                <button
                  type="button"
                  className="product-card-cart-bar in-cart"
                  onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }}
                  disabled={!canOrder(p)}
                >
                  <span className="product-card-cart-left">
                    <IconCart />
                    <span>{inCartQty} in cart</span>
                  </span>
                  <span className="product-card-cart-plus">+</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="product-card-cart-bar"
                  onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }}
                  disabled={!canOrder(p)}
                >
                  Add to cart
                </button>
              )}
            </div>
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
        <div className="modal-overlay" onClick={() => {
          // If Pay Online is selected, show alert before closing
          if (checkoutForm.paymentMethod === 'stripe') {
            if (window.confirm('Your order will be confirmed and stock reserved only after payment. If you leave now, your order will not be placed and stock is not reserved. Are you sure you want to exit checkout?')) {
              setCheckoutOpen(false);
            }
          } else {
            setCheckoutOpen(false);
          }
        }}>
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
                    <div className="charge-row items-total">
                      <span>Items total (before GST):</span>
                      <span>₹{baseCartTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="charge-row gst">
                      <span>GST on items (approx.):</span>
                      <span>₹{estimatedGst.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="charge-row subtotal">
                      <span>Subtotal (items + GST):</span>
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
                  <div className="tn-delivery-info" style={{marginBottom: '0.5rem', fontSize: 13, color: '#0f5132', background: '#d1e7dd', padding: '0.5rem 0.75rem', borderRadius: 8}}>
                    Home delivery is available <strong>only within Tamil Nadu</strong>. Other states, please choose <strong>Store Pickup</strong>.
                  </div>
                  {savedAddresses.length > 0 && (
                    <div className="saved-addresses-section">
                      <div className="saved-addresses-header">
                        <span>Saved delivery addresses</span>
                      </div>
                      <div className="saved-addresses-list">
                        {savedAddresses.map((addr) => (
                          <label
                            key={addr._id}
                            className={
                              selectedAddressId === addr._id
                                ? 'saved-address-card selected'
                                : 'saved-address-card'
                            }
                          >
                            <input
                              type="radio"
                              name="savedAddress"
                              value={addr._id}
                              checked={selectedAddressId === addr._id}
                              onChange={() => setSelectedAddressId(addr._id)}
                            />
                            <div className="saved-address-main">
                              <div className="saved-address-label-row">
                                <span className="saved-address-label-text">{addr.label || 'Saved address'}</span>
                              </div>
                              <div className="saved-address-line">{addr.fullAddress || addr.addressLine}</div>
                            </div>
                          </label>
                        ))}
                        <label
                          className={
                            selectedAddressId === 'new'
                              ? 'saved-address-card new selected'
                              : 'saved-address-card new'
                          }
                        >
                          <input
                            type="radio"
                            name="savedAddress"
                            value="new"
                            checked={selectedAddressId === 'new'}
                            onChange={() => setSelectedAddressId('new')}
                          />
                          <div className="saved-address-main">
                            <div className="saved-address-label-row">
                              <span className="saved-address-label-text">Deliver to a new address</span>
                            </div>
                            <div className="saved-address-line">Enter a different delivery address below</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                  {(savedAddresses.length === 0 || selectedAddressId === 'new') && (
                    <>
                      <label className="form-label">Address line *</label>
                      <input
                        type="text"
                        placeholder="Door no, street, area"
                        value={checkoutForm.addressLine}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, addressLine: e.target.value })}
                        required
                        className="input"
                      />
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">City / Town *</label>
                      <input
                        type="text"
                        placeholder="e.g. Erode"
                        value={checkoutForm.city}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, city: e.target.value })}
                        required
                        className="input"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">District (Tamil Nadu) *</label>
                      <select
                        value={checkoutForm.district}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, district: e.target.value })}
                        required
                        className="input"
                      >
                        <option value="">Select district</option>
                        <option value="Ariyalur">Ariyalur</option>
                        <option value="Chengalpattu">Chengalpattu</option>
                        <option value="Chennai">Chennai</option>
                        <option value="Coimbatore">Coimbatore</option>
                        <option value="Cuddalore">Cuddalore</option>
                        <option value="Dharmapuri">Dharmapuri</option>
                        <option value="Dindigul">Dindigul</option>
                        <option value="Erode">Erode</option>
                        <option value="Kallakurichi">Kallakurichi</option>
                        <option value="Kanchipuram">Kanchipuram</option>
                        <option value="Kanyakumari">Kanyakumari</option>
                        <option value="Karur">Karur</option>
                        <option value="Krishnagiri">Krishnagiri</option>
                        <option value="Madurai">Madurai</option>
                        <option value="Nagapattinam">Nagapattinam</option>
                        <option value="Namakkal">Namakkal</option>
                        <option value="Nilgiris">Nilgiris</option>
                        <option value="Perambalur">Perambalur</option>
                        <option value="Pudukkottai">Pudukkottai</option>
                        <option value="Ramanathapuram">Ramanathapuram</option>
                        <option value="Ranipet">Ranipet</option>
                        <option value="Salem">Salem</option>
                        <option value="Sivaganga">Sivaganga</option>
                        <option value="Tenkasi">Tenkasi</option>
                        <option value="Thanjavur">Thanjavur</option>
                        <option value="Theni">Theni</option>
                        <option value="Thiruvallur">Thiruvallur</option>
                        <option value="Thiruvarur">Thiruvarur</option>
                        <option value="Thoothukudi">Thoothukudi</option>
                        <option value="Tiruchirappalli">Tiruchirappalli</option>
                        <option value="Tirunelveli">Tirunelveli</option>
                        <option value="Tirupattur">Tirupattur</option>
                        <option value="Tiruppur">Tiruppur</option>
                        <option value="Tiruvannamalai">Tiruvannamalai</option>
                        <option value="Vellore">Vellore</option>
                        <option value="Viluppuram">Viluppuram</option>
                        <option value="Virudhunagar">Virudhunagar</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Pincode *</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="6-digit pincode"
                        value={checkoutForm.pincode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setCheckoutForm({ ...checkoutForm, pincode: value });
                        }}
                        required
                        className="input"
                      />
                    </div>
                    <div style={{ fontSize: 13, color: '#555' }}>Tamil Nadu, India</div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary btn-use-location"
                    onClick={async () => {
                      setLocationError('');
                      if (!navigator.geolocation) {
                        setLocationError('Location is not supported in this browser.');
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
                          // Always store coordinates for delivery distance, even if reverse lookup fails
                          setCheckoutForm((prev) => ({
                            ...prev,
                            deliveryLat: latitude,
                            deliveryLon: longitude
                          }));

                          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`;
                          const res = await fetch(url, {
                            headers: {
                              'Accept': 'application/json',
                            },
                          });
                          const data = await res.json();
                          const formatted = data.display_name;
                          const addr = data.address || {};
                          const state = (addr.state || '').toLowerCase();

                          // Restrict to Tamil Nadu only
                          const isTN = state.includes('tamil nadu') || (formatted || '').toLowerCase().includes('tamil nadu');
                          if (!isTN) {
                            setLocationError('We currently deliver only within Tamil Nadu. Please choose a location inside Tamil Nadu.');
                            return;
                          }

                          if (formatted) {
                            setCheckoutForm((prev) => ({
                              ...prev,
                              address: formatted,
                              addressLine: formatted,
                              city: addr.city || addr.town || addr.village || prev.city,
                              district: addr.state_district || prev.district,
                              pincode: addr.postcode || prev.pincode,
                            }));
                          } else {
                            setLocationError('Could not detect full address from your location. Please fill it manually.');
                          }
                        });
                      } catch (err) {
                        console.error('Geolocation error', err);
                        if (err && err.code === 1) {
                          setLocationError('Location permission was denied. Please allow location for this site or enter address manually.');
                        } else {
                          setLocationError('Unable to fetch your location. Please enter address manually.');
                        }
                      }
                    }}
                    style={{ marginTop: '0.5rem' }}
                  >
                    Use my location
                  </button>
                  {locationError && (
                    <div style={{ marginTop: '0.25rem', fontSize: 13, color: '#b91c1c' }}>
                      {locationError}
                    </div>
                  )}
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: 13, color: '#555' }}>
                          <input
                            type="checkbox"
                            checked={saveNewAddress}
                            onChange={(e) => setSaveNewAddress(e.target.checked)}
                            style={{ marginRight: 6 }}
                          />
                          Save this address for future orders
                        </label>
                        {saveNewAddress && (
                          <input
                            type="text"
                            placeholder="Address label (e.g. Shop, Godown)"
                            value={newAddressLabel}
                            onChange={(e) => setNewAddressLabel(e.target.value)}
                            className="input"
                            style={{ fontSize: 13, padding: '0.5rem 0.75rem' }}
                          />
                        )}
                      </div>
                    </>
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

              {checkoutError && (
                <div className="checkout-error-banner">
                  {checkoutError}
                </div>
              )}

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
