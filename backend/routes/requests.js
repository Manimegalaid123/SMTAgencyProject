const express = require('express');
const ProductRequest = require('../models/ProductRequest');
const { auth, adminOnly, agencyOnly } = require('../middleware/auth');

const router = express.Router();

// Get all enquiries
router.get('/', auth, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { requestedBy: req.user._id };
    const requests = await ProductRequest.find(query)
      .populate('product', 'name')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new enquiry (Agency only)
router.post('/', auth, agencyOnly, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required' });
    
    const enquiry = await ProductRequest.create({
      subject,
      message,
      requestedBy: req.user._id,
      agencyName: req.user.agencyName || req.user.name || req.user.email,
    });
    res.status(201).json(enquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin reply to enquiry
router.patch('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { adminReply, status } = req.body;
    const enquiry = await ProductRequest.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });
    
    if (adminReply) {
      enquiry.adminReply = adminReply;
      enquiry.repliedAt = new Date();
      enquiry.status = 'replied';
    }
    
    if (status && ['pending', 'replied', 'closed'].includes(status)) {
      enquiry.status = status;
    }
    
    enquiry.updatedAt = new Date();
    await enquiry.save();
    res.json(enquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Close enquiry (Agency can close their own)
router.patch('/:id/close', auth, async (req, res) => {
  try {
    const enquiry = await ProductRequest.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });
    
    // Check ownership for agency
    if (req.user.role === 'agency' && !enquiry.requestedBy.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    enquiry.status = 'closed';
    enquiry.updatedAt = new Date();
    await enquiry.save();
    res.json(enquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
