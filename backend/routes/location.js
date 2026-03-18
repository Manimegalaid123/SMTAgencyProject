const express = require('express');
const https = require('https');

const router = express.Router();

// Simple helper to call Nominatim from the backend so the frontend
// doesn't hit cross-origin / rate-limit issues directly.
const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'SMTAgencyApp/1.0 (contact: example@smt-agency.local)',
          Accept: 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
  });
};

// GET /api/location/search?q=Erode
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) {
      return res.json([]);
    }

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      q
    )}&addressdetails=1&limit=5`;

    const results = await fetchJson(url);

    if (!Array.isArray(results)) {
      return res.json([]);
    }

    // Return only fields we actually use on the frontend
    const simplified = results.map((r) => ({
      place_id: r.place_id,
      display_name: r.display_name,
      lat: r.lat,
      lon: r.lon,
    }));

    res.json(simplified);
  } catch (err) {
    console.error('Location search error:', err);
    res.status(500).json({ error: 'Location search failed' });
  }
});

module.exports = router;
