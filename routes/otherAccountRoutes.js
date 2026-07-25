const express = require('express');
const router = express.Router();
const {
  createOtherAccount,
  getAllOtherAccounts,
  deleteOtherAccount
} = require('../controllers/otherAccountController');

router.route('/')
  .post(createOtherAccount)
  .get(getAllOtherAccounts);

router.route('/:id')
  .delete(deleteOtherAccount);

module.exports = router;
