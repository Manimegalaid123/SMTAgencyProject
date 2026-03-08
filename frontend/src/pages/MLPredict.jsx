import React, { useEffect, useState } from 'react';
import api from '../api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import './MLPredict.css';

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 };
const axisStroke = 'var(--text-muted)';
const gridStroke = 'var(--border)';
const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function MLPredict() {
  const [prediction, setPrediction] = useState(null);
  const [trainingData, setTrainingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPrediction = () => {
    setLoading(true);
    setError('');
    Promise.all([api.get('/ml/predict-full'), api.get('/ml/training-data')])
      .then(([pred, data]) => {
        setPrediction(pred.data);
        setTrainingData(data.data || []);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load prediction'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPrediction();
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;

  const chartData = trainingData.map((d) => ({ name: d.month, quantity: d.quantity }));
  const nextMonth = (() => {
    if (chartData.length === 0) return 'N/A';
    const last = chartData[chartData.length - 1].name;
    const [y, m] = last.split('-').map(Number);
    const next = m === 12 ? [y + 1, 1] : [y, m + 1];
    return `${next[0]}-${String(next[1]).padStart(2, '0')}`;
  })();

  const productPredictions = prediction?.productPredictions || [];

  return (
    <div className="ml-page">
      <header className="dashboard-header">
        <h1 className="page-title">Sales & Revenue Prediction (ML)</h1>
        <p className="page-desc">Next month forecast using Linear Regression. Quantity and estimated revenue in ₹ INR.</p>
      </header>

      {error && <div className="ml-error">{error}</div>}

      <section className="prediction-cards-section">
        <div className="prediction-card">
          <h2>Next Month: {nextMonth}</h2>
          <div className="prediction-row">
            <div className="prediction-item">
              <span className="prediction-label">Sales (Quantity)</span>
              <span className="prediction-value quantity">{prediction?.prediction ?? 0} units</span>
            </div>
            <div className="prediction-item">
              <span className="prediction-label">Estimated Revenue</span>
              <span className="prediction-value revenue">{formatINR(prediction?.predictionRevenue)}</span>
            </div>
          </div>
          {prediction?.message && <p className="prediction-message">{prediction.message}</p>}
          <button type="button" className="btn-primary" onClick={fetchPrediction}>Refresh Prediction</button>
        </div>
      </section>

      {productPredictions.length > 0 && (
        <section className="product-predictions-section">
          <h2 className="section-title">Product-wise Next Month Prediction</h2>
          <div className="product-predictions-grid">
            {productPredictions.map((pp) => (
              <div key={pp.productName} className="product-prediction-card">
                <span className="product-pred-name">{pp.productName}</span>
                <span className="product-pred-qty">{pp.prediction ?? 0} units</span>
                <span className="product-pred-revenue">{formatINR(pp.revenue)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {trainingData.length > 0 && (
        <section className="chart-section">
          <h2>Historical Monthly Sales (Training Data)</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="name" stroke={axisStroke} fontSize={12} />
                <YAxis stroke={axisStroke} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="quantity" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} name="Quantity" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {trainingData.length < 2 && !error && (
        <p className="empty-state">Add more historical sales data (via Exports or Upload) for better predictions. At least 2 months of data are required.</p>
      )}
    </div>
  );
}
