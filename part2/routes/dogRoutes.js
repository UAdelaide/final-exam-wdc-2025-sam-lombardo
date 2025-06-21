const express = require('express');
const router = express.Router();
const db = require('../models/db');

router.get('/', async(req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT d.dog_id, d.name AS dog_name, d.size, d.owner_id FROM Dogs d
    `);
    res.json(rows);
  }catch(err){
    res.status(500).json({error: 'Failed to fetch dogs'});
  }
});

module.exports = router;