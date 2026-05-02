const express = require('express');
const router = express.Router();
const { createPatti, getAllPattis } = require('../controllers/pattiController');

// Route to get all Patti records
router.get('/', getAllPattis);

// Route to create a new Patti record
router.post('/', createPatti);

module.exports = router;
