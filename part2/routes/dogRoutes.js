const express = require('express');
const router = express.Router();
const db = require('../models/db');

router.get('/', async(req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT d.dog_id, d.name AS dog_name, d.size, 
    `)
  }catch(err){

  }
});

module.exports = router;