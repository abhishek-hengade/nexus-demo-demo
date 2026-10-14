const express = require('express');
const router = express.Router();
const db = require('../database/jsonDb');

// List assets
router.get('/', (req, res) => {
  const { category, status } = req.query;
  let assets = db.getAll('assets');

  if (category && category !== 'All') {
    assets = assets.filter(a => a.category.toLowerCase() === category.toLowerCase());
  }
  if (status && status !== 'All') {
    assets = assets.filter(a => a.status.toLowerCase() === status.toLowerCase());
  }

  res.json({
    success: true,
    count: assets.length,
    data: assets
  });
});

// Add asset / inventory item
router.post('/', (req, res) => {
  const { name, category, serialNumber, assignedTo, condition } = req.body;

  if (!name || !category) {
    return res.status(400).json({
      success: false,
      error: 'Asset name and category are required'
    });
  }

  const newAsset = db.insert('assets', {
    name,
    category,
    serialNumber: serialNumber || `AST-${Date.now().toString().slice(-6)}`,
    assignedTo: assignedTo || null,
    status: assignedTo ? 'In Use' : 'In Stock',
    condition: condition || 'Brand New',
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  res.status(201).json({
    success: true,
    message: 'Asset recorded into office inventory',
    data: newAsset
  });
});

// Assign or return asset
router.post('/:id/assign', (req, res) => {
  const { assignedTo } = req.body;
  const asset = db.getById('assets', req.params.id);

  if (!asset) {
    return res.status(404).json({ success: false, error: 'Asset not found' });
  }

  const isReturn = !assignedTo || assignedTo === 'None';
  const updated = db.update('assets', req.params.id, {
    assignedTo: isReturn ? null : assignedTo,
    status: isReturn ? 'In Stock' : 'In Use'
  });

  res.json({
    success: true,
    message: isReturn ? `Asset returned to inventory` : `Asset assigned to ${assignedTo}`,
    data: updated
  });
});

// Update asset details
router.put('/:id', (req, res) => {
  const updated = db.update('assets', req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Asset not found' });
  }
  res.json({
    success: true,
    message: 'Asset details updated',
    data: updated
  });
});

module.exports = router;
