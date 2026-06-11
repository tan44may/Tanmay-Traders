const Customer = require('../models/Customer');
const CustomerTransaction = require('../models/CustomerTransaction');
const { calculateRunningLedger } = require('../utils/interestCalculator');


// @desc    Create a new Customer
// @route   POST /api/customer
// @access  Public
const createCustomer = async (req, res) => {
  try {
    const { customerName, contactNumber } = req.body;

    if (!customerName) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    // Check for duplicate name
    const existingCustomer = await Customer.findOne({ customerName });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'A customer with this name already exists'
      });
    }

    const newCustomer = new Customer({
      customerName,
      contactNumber
    });

    const savedCustomer = await newCustomer.save();

    res.status(201).json({
      success: true,
      data: savedCustomer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message
    });
  }
};

// @desc    Get all Customers
// @route   GET /api/customer
// @access  Public
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });

    // Calculate dynamic interest-inclusive balance for each customer
    const customersWithInterest = await Promise.all(customers.map(async (c) => {
      const customer = c.toObject();
      const transactions = await CustomerTransaction.find({ customerId: customer._id });

      const ledger = calculateRunningLedger(transactions, new Date());
      customer.balance = ledger.netBalance;
      return customer;
    }));

    res.status(200).json({
      success: true,
      count: customersWithInterest.length,
      data: customersWithInterest,
      message: 'Customers fetched successfully with dynamic interest'
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
};

// @desc    Delete a Customer
// @route   DELETE /api/customer/:id
// @access  Public
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndDelete(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error.message
    });
  }
};

module.exports = {
  createCustomer,
  getAllCustomers,
  deleteCustomer
};
