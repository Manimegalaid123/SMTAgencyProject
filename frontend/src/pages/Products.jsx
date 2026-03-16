import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { uploadProductImage } from '../api';
import { useAuth } from '../context/AuthContext';
import './Products.css';

const initialForm = {
  name: '',
  category: 'FMCG',
  price: '',
  gstRate: '18',
  unit: 'units',
  packSize: '',
  imageUrl: '',
  images: [],
  description: '',
  importSource: 'Nestlé',
  status: 'Available',
  expiryDate: '',
};

export default function Products() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchProducts = () => {
    api.get('/products')
      .then(({ data }) => {
        setProducts(Array.isArray(data) ? data : (data.products || []));
        setTotalStockValue(data.totalStockValue ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addFromUrl = searchParams.get('add') === '1';
  useEffect(() => {
    if (addFromUrl && !loading) {
      setModal({});
      setForm(initialForm);
      setSearchParams({}, { replace: true });
    }
  }, [addFromUrl, loading]);

  const handleImageFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      setUploadingImage(true);
      const uploaded = [];
      for (const file of files) {
        const { data } = await uploadProductImage(file);
        const url = data.url || data.path;
        if (url) uploaded.push(url);
      }
      if (uploaded.length) {
        setForm((prev) => {
          const existingImages = Array.isArray(prev.images) ? prev.images : [];
          const images = [...existingImages, ...uploaded];
          return {
            ...prev,
            images,
            imageUrl: prev.imageUrl || images[0] || '',
          };
        });
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        gstRate: form.gstRate === '' ? undefined : Number(form.gstRate),
      };
      if (modal?.id) {
        await api.put(`/products/${modal.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setModal(null);
      setForm(initialForm);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const openEdit = (p) => {
    setModal({ id: p._id });
    const images = Array.isArray(p.images) && p.images.length ? p.images : (p.imageUrl ? [p.imageUrl] : []);
    setForm({
      name: p.name,
      category: p.category || 'FMCG',
      price: String(p.price),
      gstRate: p.gstRate != null ? String(p.gstRate) : '18',
      unit: p.unit || 'units',
      packSize: p.packSize || '',
      imageUrl: p.imageUrl || images[0] || '',
      images,
      description: p.description || '',
      importSource: p.importSource || 'Nestlé',
      status: p.status || 'Available',
      expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().slice(0, 10) : '',
    });
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="products-page">
      <div className="page-header products-page-header">
        <div className="page-header-text">
          <h1 className="page-title">Product Management (Admin Only)</h1>
          <p className="page-desc">Add and manage product master details like name, pack size, price and GST. Stock quantities are handled separately in Imports/Stock.</p>
        </div>
        <div className="page-header-actions">
          <div className="view-toggle">
            <button type="button" className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>Table</button>
            <button type="button" className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')}>Cards</button>
          </div>
          <button type="button" className="btn-primary btn-add-product" onClick={() => { setModal({}); setForm(initialForm); }}>
            Add Product
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="table-wrap products-table-wrap">
          <table className="data-table products-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Pack Size</th>
                <th>Category</th>
                <th>Price (₹)</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Import Source</th>
                <th>Last Updated</th>
                {user?.role === 'admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td className="product-name-cell">{p.name}</td>
                  <td>{p.packSize || '—'}</td>
                  <td>{p.category || 'FMCG'}</td>
                  <td>₹{Number(p.price).toLocaleString('en-IN')}</td>
                  <td>{formatDate(p.expiryDate)}</td>
                  <td><span className={`badge badge-${(p.availabilityStatus || p.status) === 'Available' ? 'success' : 'danger'}`}>{p.availabilityStatus || p.status || 'Available'}</span></td>
                  <td>{p.importSource || 'Nestlé'}</td>
                  <td>{formatDate(p.lastUpdated)}</td>
                  <td>
                    <button type="button" className="btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button type="button" className="btn-sm danger" onClick={() => handleDelete(p._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((p) => (
            <div key={p._id} className="product-card">
              <div className="product-name">{p.name}{p.packSize ? ` (${p.packSize})` : ''}</div>
              <div className="product-category">{p.category || 'FMCG'}</div>
              <div className="product-meta">
                <span>₹{Number(p.price).toLocaleString('en-IN')} / unit</span>
              </div>
              <div className="product-status">
                <span className={`badge badge-${(p.availabilityStatus || p.status) === 'Available' ? 'success' : 'danger'}`}>{p.availabilityStatus || p.status || 'Available'}</span>
              </div>
              <div className="product-meta-secondary">
                <span>Source: {p.importSource || 'Nestlé'}</span>
                <span>{formatDate(p.expiryDate) !== '—' ? `Expiry: ${formatDate(p.expiryDate)}` : formatDate(p.lastUpdated)}</span>
              </div>
              <div className="product-actions">
                <button type="button" className="btn-sm" onClick={() => openEdit(p)}>Edit</button>
                <button type="button" className="btn-sm danger" onClick={() => handleDelete(p._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {products.length > 0 && (
        <div className="total-stock-value-card">
          <span className="total-stock-label">Total Stock Value</span>
          <span className="total-stock-value">₹{Number(totalStockValue).toLocaleString('en-IN')}</span>
        </div>
      )}
      {products.length === 0 && <p className="empty-state">No products yet.</p>}

      {modal !== null && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.id ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit} className="form">
              <label className="form-label">Product Name</label>
              <input placeholder="e.g. Maggi, Coffee" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input" />
              <label className="form-label">Category</label>
              <input placeholder="e.g. FMCG, Noodles" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" />
              <label className="form-label">Price per unit (₹)</label>
              <input type="number" min="0" step="0.01" placeholder="Price in INR" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="input" />
              <label className="form-label">GST Rate (%)</label>
              <div className="gst-rate-row">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 5, 12, 18"
                  value={form.gstRate}
                  onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                  className="input gst-rate-input"
                />
                <div className="gst-presets">
                  {[5, 12, 18, 28].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      className={Number(form.gstRate) === rate ? 'gst-preset active' : 'gst-preset'}
                      onClick={() => setForm({ ...form, gstRate: String(rate) })}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>
              <label className="form-label">Pack Size (e.g. 300g Pack)</label>
              <input
                placeholder="e.g. 300g Pack, 1L Bottle"
                value={form.packSize}
                onChange={(e) => setForm({ ...form, packSize: e.target.value })}
                className="input"
              />
              <label className="form-label">Product Image (optional)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageFileChange}
                className="input"
              />
              {uploadingImage && <p className="form-hint">Uploading image...</p>}
              {Array.isArray(form.images) && form.images.length > 0 && !uploadingImage && (
                <div className="product-form-image-previews">
                  {form.images.map((url, idx) => (
                    <div key={idx} className="product-form-image-preview">
                      <img src={url} alt={`Preview ${idx + 1}`} />
                    </div>
                  ))}
                  <p className="form-hint">Images will be saved with this product. First image is used as main image.</p>
                </div>
              )}
              <label className="form-label">Expiry Date (optional)</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="input"
              />
              <label className="form-label">Unit</label>
              <input placeholder="units, kg, etc." value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input" />
              <label className="form-label">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
                <option value="Available">Available</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
              <label className="form-label">Import Source</label>
              <input placeholder="Nestlé" value={form.importSource} onChange={(e) => setForm({ ...form, importSource: e.target.value })} className="input" />
              <label className="form-label">Product Description (optional)</label>
              <textarea placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={2} />
              {form.price && (
                <p className="form-total-value">Note: Stock value is calculated from Imports and will show on the Products list once you add imports.</p>
              )}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
