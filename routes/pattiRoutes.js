const express = require('express');
const router = express.Router();
const { createPatti, getAllPattis, deletePatti } = require('../controllers/pattiController');

// Route to get all Patti records
router.get('/', getAllPattis);

// Route to create a new Patti record
router.post('/', createPatti);

// Route to delete a Patti record
router.delete('/:id', deletePatti);

module.exports = router;
