const express = require('express');
const router = express.Router();
const {
  createCustomer,
  getAllCustomers,
  deleteCustomer
} = require('../controllers/customerController');

router.route('/')
  .post(createCustomer)
  .get(getAllCustomers);

router.route('/:id')
  .delete(deleteCustomer);

module.exports = router;
