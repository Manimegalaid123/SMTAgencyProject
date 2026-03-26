import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import './Products.css';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [hoverZoom, setHoverZoom] = useState({ x: 50, y: 50, active: false });
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [quantity, setQuantity] = useState('');
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        if (!isMounted) return;
        setProduct(data);

        // Load related products
        const listRes = await api.get('/products');
        if (!isMounted) return;
        const all = Array.isArray(listRes.data) ? listRes.data : (listRes.data.products || []);
        const sameCategory = all.filter(
          (p) => p._id !== data._id && p.category && p.category === data.category,
        );
        setRelated(sameCategory.slice(0, 8));
        setSelectedImageIndex(0);

        // Load approved reviews for this product
        setReviewsLoading(true);
        api.get(`/reviews/product/${id}`)
          .then((res) => {
            if (!isMounted) return;
            setReviews(Array.isArray(res.data) ? res.data : []);
          })
          .catch(() => {
            if (!isMounted) return;
            setReviews([]);
          })
          .finally(() => {
            if (!isMounted) return;
            setReviewsLoading(false);
          });
      } catch (err) {
        if (isMounted) {
          showError(err.response?.data?.error || 'Unable to load product');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [id]);

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  const handleImageMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setHoverZoom({ x, y, active: true });
  };

  const handleImageMouseLeave = () => {
    setHoverZoom((prev) => ({ ...prev, active: false }));
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!product) return <div className="page-loading">Product not found.</div>;

  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : (product.imageUrl ? [product.imageUrl] : []);
  const mainImage = images[selectedImageIndex] || images[0] || null;

  const totalReviews = reviews.length;
  const avgRating = product.avgRating || (totalReviews
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(1)
    : null);
  const ratingCounts = [5, 4, 3, 2, 1].map((star) =>
    reviews.filter((r) => Number(r.rating) === star).length
  );

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    // Allow empty input so there is no default quantity shown
    if (value === '') {
      setQuantity('');
      return;
    }
    const num = parseInt(value, 10);
    if (!Number.isNaN(num) && num > 0) {
      setQuantity(String(num));
    }
  };

  const handleAddToCart = () => {
    const num = parseInt(quantity, 10);
    if (Number.isNaN(num) || num <= 0) {
      showError('Please enter a valid quantity.');
      return;
    }
    addToCart(product, num);
    showSuccess('Added to cart');
  };

  const handleBuyNow = () => {
    const num = parseInt(quantity, 10);
    if (Number.isNaN(num) || num <= 0) {
      showError('Please enter a valid quantity.');
      return;
    }
    addToCart(product, num);
    navigate('/agency-products?checkout=1');
  };

  return (
    <div className="product-detail-page">
      <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="product-detail-layout">
        <div className="product-detail-media">
          <div className="product-detail-gallery">
            {images.length > 1 && (
              <div className="product-detail-thumbs">
                {images.map((url, idx) => (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    className={`product-detail-thumb ${idx === selectedImageIndex ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(idx)}
                  >
                    <img src={url} alt={`${product.name} ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
            <div
              className="product-detail-image-wrap zoomable"
              onClick={() => mainImage && setZoomOpen(true)}
              onMouseMove={mainImage ? handleImageMouseMove : undefined}
              onMouseLeave={mainImage ? handleImageMouseLeave : undefined}
            >
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                  className="product-detail-image"
                />
              ) : (
                <div className="product-detail-image-placeholder">No image</div>
              )}
            </div>
          </div>
          {mainImage && (
            <div className={`product-detail-zoom-pane ${hoverZoom.active ? 'active' : ''}`}>
              <div
                className="product-detail-zoom-inner"
                style={{
                  backgroundImage: `url(${mainImage})`,
                  backgroundSize: '200% 200%',
                  backgroundPosition: `${hoverZoom.x}% ${hoverZoom.y}%`,
                }}
              />
            </div>
          )}
        </div>
        <div className="product-detail-info">
          <h1 className="product-detail-title">
            {product.name}
            {product.packSize ? ` (${product.packSize})` : ''}
          </h1>
          {(avgRating || totalReviews > 0) && (
            <div className="product-detail-rating-summary-inline">
              {avgRating && (
                <span className="rating-badge">
                  <span className="rating-score">{avgRating}</span>
                  <span className="rating-star">★</span>
                </span>
              )}
              <span className="rating-count-text">
                {totalReviews} rating{totalReviews === 1 ? '' : 's'}
              </span>
            </div>
          )}
          <p className="product-detail-category">{product.category || 'FMCG'}</p>
          <div className="product-detail-price-row">
            <span className="product-detail-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
            {product.gstRate != null && (
              <span className="product-detail-gst">Incl. GST {product.gstRate}%</span>
            )}
          </div>
          <div className="product-detail-meta">
            <span>
              Status:{' '}
              <span className={`badge badge-${(product.availabilityStatus || product.status) === 'Available' ? 'success' : 'danger'}`}>
                {product.availabilityStatus || product.status || 'Available'}
              </span>
            </span>
            {product.expiryDate && (
              <span>Expiry: {formatDate(product.expiryDate)}</span>
            )}
            {product.importSource && (
              <span>Brand: {product.importSource}</span>
            )}
          </div>
          {product.description && (
            <p className="product-detail-description">{product.description}</p>
          )}

          <div className="product-detail-actions">
            <div className="product-detail-actions-card">
              <div className="product-detail-qty-row">
                <span className="qty-label">Quantity</span>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="qty-input product-detail-qty-input"
                />
              </div>
              <button type="button" className="btn-primary" onClick={handleBuyNow}>
                Buy Now
              </button>
              <button type="button" className="btn-secondary" onClick={handleAddToCart}>
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      {(totalReviews > 0 || reviewsLoading) && (
        <section className="product-detail-reviews-section">
          <h2 className="product-detail-reviews-title">Product Ratings &amp; Reviews</h2>
          <div className="product-detail-reviews-layout">
            <div className="product-detail-reviews-left">
              <div className="overall-rating">
                <div className="overall-score-row">
                  <span className="overall-score">{avgRating || '–'}</span>
                  <span className="overall-star">★</span>
                </div>
                <div className="overall-meta">
                  <span>{totalReviews} Ratings</span>
                </div>
              </div>
              <div className="rating-bars">
                {[5, 4, 3, 2, 1].map((star, idx) => {
                  const count = ratingCounts[idx];
                  const percent = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
                  return (
                    <div key={star} className="rating-bar-row">
                      <span className="rating-bar-label">{star}★</span>
                      <div className="rating-bar-track">
                        <div className="rating-bar-fill" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="rating-bar-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="product-detail-reviews-right">
              {reviewsLoading && <div className="reviews-loading">Loading reviews...</div>}
              {!reviewsLoading && totalReviews === 0 && (
                <div className="no-reviews">No reviews yet. Be the first to rate this product.</div>
              )}
              {!reviewsLoading && totalReviews > 0 && (
                <ul className="reviews-list">
                  {reviews.slice(0, 6).map((rev) => (
                    <li key={rev._id} className="review-item">
                      <div className="review-header">
                        <span className="review-rating-badge">
                          <span className="review-rating-score">{rev.rating}</span>
                          <span className="review-rating-star">★</span>
                        </span>
                        <span className="review-title">{rev.title || 'Rated this product'}</span>
                      </div>
                      {rev.comment && <p className="review-comment">{rev.comment}</p>}
                      <div className="review-footer">
                        <span className="review-author">
                          {rev.user?.agencyName || rev.user?.name || 'Customer'}
                        </span>
                        <span className="review-date">{formatDate(rev.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="related-products-section">
          <h2>Related Products</h2>
          <div className="related-products-grid">
            {related.map((p) => (
              <button
                key={p._id}
                type="button"
                className="related-product-card"
                onClick={() => navigate(`/agency-products/${p._id}`)}
              >
                {((Array.isArray(p.images) && p.images.length) || p.imageUrl) && (
                  <div className="related-product-image-wrap">
                    <img
                      src={(Array.isArray(p.images) && p.images[0]) || p.imageUrl}
                      alt={p.name}
                      className="related-product-image"
                    />
                  </div>
                )}
                <div className="related-product-name">
                  {p.name}
                  {p.packSize ? ` (${p.packSize})` : ''}
                </div>
                <div className="related-product-price">₹{Number(p.price).toLocaleString('en-IN')}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {zoomOpen && (mainImage || product?.imageUrl) && (
        <div className="image-zoom-overlay" onClick={() => setZoomOpen(false)}>
          <div className="image-zoom-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="image-zoom-close"
              onClick={() => setZoomOpen(false)}
            >
              ×
            </button>
            <div className="image-zoom-img-wrap">
              <img
                src={mainImage || product.imageUrl}
                alt={product.name}
                className="image-zoom-img"
              />
            </div>
            <div className="image-zoom-info">
              <h3>
                {product.name}
                {product.packSize ? ` (${product.packSize})` : ''}
              </h3>
              {product.category && (
                <p className="image-zoom-meta">{product.category}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
