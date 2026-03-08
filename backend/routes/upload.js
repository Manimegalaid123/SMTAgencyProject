const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { parse } = require('csv-parse/sync');
const Product = require('../models/Product');
const Import = require('../models/Import');
const Stock = require('../models/Stock');
const SalesRecord = require('../models/SalesRecord');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function normalizeRow(row) {
  const keys = Object.keys(row).map(k => k?.toString().toLowerCase().trim());
  const get = (...names) => {
    for (const n of names) {
      const k = keys.find(x => x.includes(n) || n.includes(x));
      if (k) return row[k];
    }
    return null;
  };
  const hasKey = (...names) => names.some(n => keys.some(k => k.includes(n) || n.includes(k)));
  const category = get('category');
  const importedQty = parseInt(get('imported qty', 'imported', 'import', 'quantity'), 10) || 0;
  const soldQty = parseInt(get('sold qty', 'sold', 'export', 'quantity'), 10) || 0;
  const rawRemaining = get('remaining', 'stock');
  const remainingStock = hasKey('remaining', 'stock') && rawRemaining !== null && rawRemaining !== ''
    ? (parseInt(rawRemaining, 10) || 0)
    : null;
  return {
    date: get('date'),
    productName: get('product name', 'product', 'name'),
    category: category || 'FMCG',
    importedQuantity: importedQty,
    soldQuantity: soldQty,
    remainingStock,
    price: parseFloat(String(get('price', 'price (₹)', 'price (inr)')).replace(/[^0-9.]/g, '')) || 0,
  };
}

function validateFileStructure(rows, isCsv = true) {
  if (!rows || rows.length === 0) return { valid: false, error: 'File is empty or has no data rows.' };
  const first = rows[0];
  const keys = Object.keys(first).map(k => k?.toString().toLowerCase().trim());
  const hasDate = keys.some(k => k.includes('date'));
  const hasProduct = keys.some(k => k.includes('product') || k.includes('name'));
  const hasPrice = keys.some(k => k.includes('price'));
  if (!hasDate || !hasProduct || !hasPrice) {
    return { valid: false, error: 'File must contain columns: Date, Product Name (or Product), and Price (₹).' };
  }
  return { valid: true };
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.post('/csv', auth, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = (req.file.originalname || '').toLowerCase().split('.').pop();
    if (ext !== 'csv') return res.status(400).json({ error: 'Invalid file type. Please upload a .csv file.' });
    const text = req.file.buffer.toString('utf8');
    const rows = parse(text, { columns: true, skip_empty_lines: true });
    const validation = validateFileStructure(rows);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    let created = 0, updated = 0;
    for (const row of rows) {
      const r = normalizeRow(row);
      if (!r.productName) continue;
      let product = await Product.findOne({ name: { $regex: new RegExp(`^${escapeRegex(r.productName)}$`, 'i') } });
      if (!product) {
        product = await Product.create({ name: r.productName, category: r.category, price: r.price || 0, importSource: 'Nestlé' });
        await Stock.create({ product: product._id, quantity: r.remainingStock != null ? r.remainingStock : 0 });
        created++;
      } else {
        if (r.category && r.category !== 'FMCG') product.category = r.category;
        await product.save();
        const stock = await Stock.findOne({ product: product._id });
        if (stock) {
          if (r.remainingStock != null) stock.quantity = r.remainingStock;
          stock.lastUpdated = new Date();
          await stock.save();
        }
        updated++;
      }
      const d = r.date ? new Date(r.date) : new Date();
      if (r.importedQuantity > 0) {
        await Import.create({ product: product._id, quantity: r.importedQuantity, date: d, source: 'Nestlé' });
      }
      if (r.soldQuantity > 0) {
        const month = d.getMonth() + 1, year = d.getFullYear();
        const revenue = (r.price || 0) * r.soldQuantity;
        await SalesRecord.findOneAndUpdate(
          { product: product._id, month, year },
          { $inc: { quantity: r.soldQuantity, revenue }, productName: product.name },
          { upsert: true }
        );
      }
    }
    res.json({ message: 'File processed successfully', created, updated, rows: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/excel', auth, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = (req.file.originalname || '').toLowerCase().split('.').pop();
    if (!['xlsx', 'xls'].includes(ext)) return res.status(400).json({ error: 'Invalid file type. Please upload a .xlsx or .xls file.' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const validation = validateFileStructure(rows, false);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    let created = 0, updated = 0;
    for (const row of rows) {
      const r = normalizeRow(row);
      if (!r.productName) continue;
      let product = await Product.findOne({ name: { $regex: new RegExp(`^${escapeRegex(r.productName)}$`, 'i') } });
      if (!product) {
        product = await Product.create({ name: r.productName, category: r.category, price: r.price || 0, importSource: 'Nestlé' });
        const initialQty = r.remainingStock != null ? r.remainingStock : Math.max(0, r.importedQuantity - r.soldQuantity);
        await Stock.create({ product: product._id, quantity: initialQty });
        created++;
      } else {
        if (r.category && r.category !== 'FMCG') product.category = r.category;
        await product.save();
        const stock = await Stock.findOne({ product: product._id });
        if (stock) {
          if (r.remainingStock != null) stock.quantity = r.remainingStock;
          stock.lastUpdated = new Date();
          await stock.save();
        }
        updated++;
      }
      const d = r.date ? new Date(r.date) : new Date();
      if (r.importedQuantity > 0) {
        await Import.create({ product: product._id, quantity: r.importedQuantity, date: d, source: 'Nestlé' });
      }
      if (r.soldQuantity > 0) {
        const month = d.getMonth() + 1, year = d.getFullYear();
        const revenue = (r.price || 0) * r.soldQuantity;
        await SalesRecord.findOneAndUpdate(
          { product: product._id, month, year },
          { $inc: { quantity: r.soldQuantity, revenue }, productName: product.name },
          { upsert: true }
        );
      }
    }
    res.json({ message: 'File processed successfully', created, updated, rows: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
