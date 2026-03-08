import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import api from '../api';
import './Analytics.css';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
};
const tooltipLabelStyle = { color: 'var(--text)' };
const axisStroke = 'var(--text-muted)';
const gridStroke = 'var(--border)';

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function Analytics() {
  const [monthly, setMonthly] = useState([]);
  const [productWise, setProductWise] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/monthly'),
      api.get('/analytics/product-wise'),
      api.get('/analytics/summary').catch(() => ({ data: null })),
    ])
      .then(([m, p, s]) => {
        setMonthly((m.data || []).sort((a, b) => a.month.localeCompare(b.month)));
        setProductWise(p.data || []);
        setSummary(s.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;

  const monthlyBarData = monthly.map((m) => ({ name: m.month, quantity: m.totalQuantity, revenue: m.totalRevenue || 0 }));
  const pieData = productWise.map((p, i) => ({ name: p.productName || 'Unknown', value: p.totalQuantity, fill: COLORS[i % COLORS.length] }));
  const revenueCards = [
    { title: 'Total Revenue', value: formatINR(summary?.totalRevenue), color: 'green' },
    { title: 'This Month Revenue', value: formatINR(summary?.thisMonthRevenue), color: 'emerald' },
    { title: 'Last Month Revenue', value: formatINR(summary?.lastMonthRevenue), color: 'amber' },
  ];

  return (
    <div className="analytics-page">
      <header className="dashboard-header">
        <h1 className="page-title">Stock & Sales Analysis</h1>
        <p className="page-desc">Product-wise and monthly sales, revenue (₹ INR), pie/bar/line charts. Data from uploads and sales records.</p>
      </header>

      <section className="analytics-revenue-cards">
        {revenueCards.map((c) => (
          <div key={c.title} className={`revenue-card revenue-card-${c.color}`}>
            <span className="revenue-card-title">{c.title}</span>
            <span className="revenue-card-value">{c.value}</span>
          </div>
        ))}
      </section>

      <section className="chart-section">
        <h2>Monthly Sales (Quantity)</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyBarData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="name" stroke={axisStroke} fontSize={12} />
              <YAxis stroke={axisStroke} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
              <Bar dataKey="quantity" fill="#22c55e" radius={[4, 4, 0, 0]} name="Quantity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="chart-section">
        <h2>Monthly Revenue (₹)</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyBarData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="name" stroke={axisStroke} fontSize={12} />
              <YAxis stroke={axisStroke} fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatINR(v), 'Revenue']} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="chart-section">
        <h2>Product-wise Sales & Revenue</h2>
        <div className="chart-row">
          <div className="chart-container half">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-container half">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productWise.map((p) => ({ name: (p.productName || 'Unknown').slice(0, 12), quantity: p.totalQuantity, revenue: p.totalRevenue || 0 }))} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" stroke={axisStroke} fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke={axisStroke} fontSize={12} width={70} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [name === 'revenue' ? formatINR(v) : v, name === 'revenue' ? 'Revenue' : 'Quantity']} />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {monthlyBarData.length > 0 && (
        <section className="chart-section">
          <h2>Sales & Revenue Trend (Line)</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyBarData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="name" stroke={axisStroke} fontSize={12} />
                <YAxis yAxisId="left" stroke={axisStroke} fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke={axisStroke} fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [name === 'revenue' ? formatINR(v) : v, name === 'revenue' ? 'Revenue' : 'Quantity']} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="quantity" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} name="Quantity" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} name="Revenue (₹)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {(monthly.length === 0 && productWise.length === 0) && (
        <p className="empty-state">No sales data yet. Add exports or upload data to see analytics.</p>
      )}
    </div>
  );
}
