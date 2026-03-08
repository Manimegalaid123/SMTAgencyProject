import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './Upload.css';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [type, setType] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }
    const ext = (file.name || '').toLowerCase().split('.').pop();
    if (type === 'csv' && ext !== 'csv') {
      setError('Please select a .csv file for CSV upload.');
      return;
    }
    if (type === 'excel' && !['xlsx', 'xls'].includes(ext)) {
      setError('Please select a .xlsx or .xls file for Excel upload.');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const endpoint = type === 'csv' ? '/upload/csv' : '/upload/excel';
      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <h1 className="page-title">Stock Management & Analysis – Upload</h1>
      <p className="page-desc">Upload CSV or Excel files (import data, sales/export data, stock movement). File type and required columns are validated before processing.</p>
      <div className="upload-card">
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label>File type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input">
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
            </select>
          </div>
          <div className="form-group">
            <label>File</label>
            <input
              type="file"
              accept={type === 'csv' ? '.csv' : '.xlsx,.xls'}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="input-file"
            />
          </div>
          {error && <div className="upload-error">{error}</div>}
          <button type="submit" disabled={loading || !file} className="btn-primary">
            {loading ? 'Uploading...' : 'Upload & Process'}
          </button>
        </form>
        {result && (
          <div className="upload-result">
            <h3>Upload successful</h3>
            <p>{result.message}</p>
            <p>Rows processed: {result.rows}</p>
            <p>Created: {result.created}, Updated: {result.updated}</p>
            <p className="upload-result-link">
              <Link to="/analytics">View Stock & Sales Analysis (charts and revenue ₹)</Link>
            </p>
          </div>
        )}
      </div>
      <div className="upload-help">
        <h3>Required columns (case-insensitive)</h3>
        <p className="upload-help-note">File must contain: <strong>Date</strong>, <strong>Product Name</strong> (or Product), and <strong>Price (₹)</strong>.</p>
        <ul>
          <li>Date</li>
          <li>Product Name / Product</li>
          <li>Category (optional)</li>
          <li>Imported Qty / Imported Quantity</li>
          <li>Sold Qty / Sold Quantity</li>
          <li>Remaining Stock (optional)</li>
          <li>Price / Price (₹)</li>
        </ul>
        <p className="upload-sample-link">
          <a href="/sample_smt_dataset.csv" download="sample_smt_dataset.csv" className="upload-sample-btn">
            Download sample CSV dataset
          </a>
        </p>
        <p className="upload-help-footer">After upload, data is parsed and analytics (pie, bar, line charts) and revenue are updated automatically. Existing data is not overwritten.</p>
      </div>
    </div>
  );
}
