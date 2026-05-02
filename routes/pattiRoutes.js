const express = require('express');
const router = express.Router();
const { createPatti } = require('../controllers/pattiController');

// Route to create a new Patti record
router.post('/', createPatti);

module.exports = router;
