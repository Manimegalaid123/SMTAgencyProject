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
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';
import './Analytics.css';
import {
  IconWallet,
  IconTrending,
  IconTrendingDown,
  IconChart,
  IconCalendar,
  IconPackage,
  IconRocket,
  IconTrophy,
  IconPieChart,
  IconBarChart,
  IconDownload,
} from '../components/Icons';

const COLORS = ['#006633', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#22c55e', '#ec4899'];

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
};
const tooltipLabelStyle = { color: 'var(--text)' };
const axisStroke = 'var(--text-muted)';
const gridStroke = 'var(--border)';

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const formatCompact = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

export default function Analytics() {
  const [monthly, setMonthly] = useState([]);
  const [productWise, setProductWise] = useState([]);
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/monthly'),
      api.get('/analytics/product-wise'),
      api.get('/analytics/summary').catch(() => ({ data: null })),
      api.get('/analytics/top-products?limit=5').catch(() => ({ data: [] })),
      api.get('/analytics/monthly-comparison').catch(() => ({ data: [] })),
    ])
      .then(([m, p, s, tp, comp]) => {
        setMonthly((m.data || []).sort((a, b) => a.month.localeCompare(b.month)));
        setProductWise(p.data || []);
        setSummary(s.data);
        setTopProducts(tp.data || []);
        setComparison(comp.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;

  const monthlyBarData = monthly.map((m) => ({ name: m.month, quantity: m.totalQuantity, revenue: m.totalRevenue || 0 }));

  // PDF-friendly format (uses Rs. instead of ₹)
  const formatINRforPDF = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

  // PDF Export Function
  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Header
    doc.setFillColor(0, 102, 51); // Green
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('SMT Agency', 14, 18);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Analytics Report', 14, 28);
    doc.setFontSize(10);
    doc.text(`Generated: ${today}`, pageWidth - 14, 28, { align: 'right' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    let yPos = 50;

    // Summary Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Overview', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', formatINRforPDF(summary?.totalRevenue)],
        ['This Month Revenue', formatINRforPDF(summary?.thisMonthRevenue)],
        ['Last Month Revenue', formatINRforPDF(summary?.lastMonthRevenue)],
        ['Daily Average', formatINRforPDF(summary?.dailyAvgRevenue)],
        ['Total Products', summary?.totalProducts || 0],
        ['Revenue Growth', `${summary?.revenueGrowth > 0 ? '+' : ''}${summary?.revenueGrowth || 0}%`],
        ['Sales Growth', `${summary?.salesGrowth > 0 ? '+' : ''}${summary?.salesGrowth || 0}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 51], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
    
    yPos = doc.lastAutoTable.finalY + 15;

    // Top Products Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Selling Products', 14, yPos);
    yPos += 10;

    if (topProducts.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Product', 'Qty Sold', 'Revenue']],
        body: topProducts.map((p, idx) => [
          idx + 1,
          p.productName || 'Unknown',
          p.totalQuantity.toLocaleString(),
          formatINRforPDF(p.totalRevenue)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 51], textColor: 255 },
        margin: { left: 14, right: 14 },
      });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Monthly Sales Section
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Sales Data', 14, yPos);
    yPos += 10;

    if (monthly.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Month', 'Quantity', 'Revenue']],
        body: monthly.map(m => [
          m.month,
          m.totalQuantity.toLocaleString(),
          formatINRforPDF(m.totalRevenue)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 51], textColor: 255 },
        margin: { left: 14, right: 14 },
      });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    // Product-wise Sales Section
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Product-wise Sales', 14, yPos);
    yPos += 10;

    if (productWise.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Product', 'Quantity', 'Revenue']],
        body: productWise.map(p => [
          p.productName || 'Unknown',
          p.totalQuantity.toLocaleString(),
          formatINRforPDF(p.totalRevenue)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 51], textColor: 255 },
        margin: { left: 14, right: 14 },
      });
    }

    // Footer on last page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
      doc.text('SMT Agency - FMCG Distribution', 14, doc.internal.pageSize.getHeight() - 10);
    }

    // Save the PDF
    doc.save(`SMT_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF: ' + error.message);
    }
  };
  const pieData = productWise.map((p, i) => ({ name: p.productName || 'Unknown', value: p.totalQuantity, fill: COLORS[i % COLORS.length] }));
  
  // Enhanced stats cards
  const statsCards = [
    { 
      title: 'Total Revenue', 
      value: formatINR(summary?.totalRevenue), 
      icon: <IconWallet />,
      color: 'primary',
      subtitle: 'All time'
    },
    { 
      title: 'This Month', 
      value: formatINR(summary?.thisMonthRevenue), 
      icon: <IconTrending />,
      color: 'success',
      // Show only label, hide the numeric % change on the card
      subtitle: 'vs last month'
    },
    { 
      title: 'Last Month', 
      value: formatINR(summary?.lastMonthRevenue), 
      icon: <IconChart />,
      color: 'warning',
      subtitle: 'Previous period'
    },
    { 
      title: 'Daily Average', 
      value: formatINR(summary?.dailyAvgRevenue), 
      icon: <IconCalendar />,
      color: 'info',
      subtitle: `~${summary?.dailyAvgSales || 0} units/day`
    },
    { 
      title: 'Total Products', 
      value: summary?.totalProducts || 0, 
      icon: <IconPackage />,
      color: 'purple',
      subtitle: 'Active items'
    },
    { 
      title: 'Sales Growth', 
      value: `${summary?.salesGrowth > 0 ? '+' : ''}${summary?.salesGrowth || 0}%`, 
      icon: summary?.salesGrowth > 0 ? <IconRocket /> : <IconTrendingDown />,
      color: summary?.salesGrowth > 0 ? 'success' : 'danger',
      subtitle: 'vs last month'
    },
  ];

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div className="header-content">
          <h1 className="page-title"><IconBarChart className="title-icon" /> Analytics Dashboard</h1>
          <p className="page-desc">Track your sales performance, revenue trends, and top-selling products</p>
        </div>
        <div className="header-actions">
          <button className="download-pdf-btn" onClick={downloadPDF}>
            <IconDownload /> Export PDF
          </button>
          <span className="header-date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </header>

      {/* Stats Cards Grid */}
      <section className="stats-grid">
        {statsCards.map((card) => (
          <div key={card.title} className={`stat-card stat-card-${card.color}`}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-content">
              <span className="stat-title">{card.title}</span>
              <span className="stat-value">{card.value}</span>
              <span className={`stat-subtitle ${card.trend === 'up' ? 'trend-up' : card.trend === 'down' ? 'trend-down' : ''}`}>
                {card.subtitle}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Two Column Layout */}
      <div className="analytics-grid">
        {/* Monthly Revenue Trend */}
        <section className="chart-section chart-large">
          <div className="section-header">
            <h2><IconTrending className="section-icon" /> Monthly Revenue Trend</h2>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={monthlyBarData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006633" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#006633" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="name" stroke={axisStroke} fontSize={12} />
                <YAxis stroke={axisStroke} fontSize={12} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatINR(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#006633" strokeWidth={2} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Top Selling Products Table */}
        <section className="chart-section">
          <div className="section-header">
            <h2><IconTrophy className="section-icon" /> Top Selling Products</h2>
          </div>
          <div className="top-products-table">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Qty Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length > 0 ? topProducts.map((p, idx) => (
                  <tr key={p.productName}>
                    <td className="rank">
                      {idx === 0 ? <span className="medal gold">1</span> : idx === 1 ? <span className="medal silver">2</span> : idx === 2 ? <span className="medal bronze">3</span> : idx + 1}
                    </td>
                    <td className="product-name">{p.productName || 'Unknown'}</td>
                    <td className="qty">{p.totalQuantity.toLocaleString()}</td>
                    <td className="revenue">{formatINR(p.totalRevenue)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="empty">No sales data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Year-over-Year Comparison */}
      {comparison.some(c => c.currentRevenue > 0 || c.previousRevenue > 0) && (
        <section className="chart-section full-width">
          <div className="section-header">
            <h2><IconCalendar className="section-icon" /> Year-over-Year Comparison</h2>
            <span className="chart-legend">
              <span className="legend-item"><span className="dot current"></span> Current Year</span>
              <span className="legend-item"><span className="dot previous"></span> Previous Year</span>
            </span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={comparison} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" stroke={axisStroke} fontSize={12} />
                <YAxis stroke={axisStroke} fontSize={12} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatINR(v)]} />
                <Bar dataKey="currentRevenue" fill="#006633" radius={[4, 4, 0, 0]} name="Current Year" />
                <Line type="monotone" dataKey="previousRevenue" stroke="#c9a227" strokeWidth={2} dot={{ fill: '#c9a227' }} name="Previous Year" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Product-wise Analysis */}
      <section className="chart-section full-width">
        <div className="section-header">
          <h2><IconPieChart className="section-icon" /> Product-wise Sales Analysis</h2>
        </div>
        <div className="chart-row">
          <div className="chart-container half">
            <h3 className="chart-subtitle">Sales Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  label={({ name, percent }) => `${name.slice(0,10)} ${(percent * 100).toFixed(0)}%`}
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
            <h3 className="chart-subtitle">Revenue by Product</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productWise.map((p) => ({ name: (p.productName || 'Unknown').slice(0, 12), quantity: p.totalQuantity, revenue: p.totalRevenue || 0 }))} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" stroke={axisStroke} fontSize={12} tickFormatter={(v) => formatCompact(v)} />
                <YAxis type="category" dataKey="name" stroke={axisStroke} fontSize={12} width={70} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatINR(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="#00a86b" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Monthly Sales Quantity Bar Chart */}
      <section className="chart-section full-width">
        <div className="section-header">
          <h2><IconPackage className="section-icon" /> Monthly Sales Quantity</h2>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyBarData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="name" stroke={axisStroke} fontSize={12} />
              <YAxis stroke={axisStroke} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
              <Bar dataKey="quantity" fill="#22c55e" radius={[4, 4, 0, 0]} name="Quantity">
                {monthlyBarData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {(monthly.length === 0 && productWise.length === 0) && (
        <div className="empty-state-card">
          <span className="empty-icon"><IconTrendingDown /></span>
          <h3>No Sales Data Yet</h3>
          <p>Upload sales data or add exports to see detailed analytics.</p>
        </div>
      )}
    </div>
  );
}
