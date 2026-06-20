const Bill = require('../models/Bill');
const Merchant = require('../models/Merchant');
const MerchantTransaction = require('../models/MerchantTransaction');

// @desc    Create a new Bill record
// @route   POST /api/bill
// @access  Public
const createBill = async (req, res) => {
  try {
    const {
      date,
      merchantName,
      cropName,
      quantity,
      rate,
      tolaiRate,
      commissionRate,
      totalAmount,
      tolaiDeduction,
      commissionAddition,
      grandTotal
    } = req.body;

    // Simple validation
    if (!date || !merchantName || !cropName) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const newBill = new Bill({
      date,
      merchantName,
      cropName,
      quantity,
      rate,
      tolaiRate,
      commissionRate,
      totalAmount,
      tolaiDeduction,
      commissionAddition,
      grandTotal
    });

    const savedBill = await newBill.save();

    // Automatically add transaction to the merchant account
    try {
      const merchant = await Merchant.findOne({ merchantName });
      if (merchant) {
        const transaction = new MerchantTransaction({
          merchantId: merchant._id,
          type: 'gave', // Bill amount added to the red section (You Gave)
          amount: grandTotal,
          date: date ? new Date(date) : Date.now(),
          cropName,
          description: `Bill auto-added (${quantity} Qtl @ ₹${rate})`,
          billNo: savedBill._id.toString()
        });

        await transaction.save();

        // Increment merchant balance (gave increases balance/receivable)
        await Merchant.findByIdAndUpdate(
          merchant._id,
          { $inc: { balance: grandTotal } }
        );
      }
    } catch (merchantErr) {
      console.error('Error linking bill to merchant transaction:', merchantErr);
      // We don't fail the whole request, but log it
    }
    
    res.status(201).json({
      success: true,
      data: savedBill,
      message: 'Bill record created successfully'
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Bill record',
      error: error.message
    });
  }
};

// @desc    Get all Bill records
// @route   GET /api/bill
// @access  Public
const getAllBills = async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills,
      message: 'Bill records fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Bill records',
      error: error.message
    });
  }
};

// @desc    Delete a Bill record
// @route   DELETE /api/bill/:id
// @access  Public
const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill record not found'
      });
    }

    // Automatically find and revert linked merchant transaction
    try {
      const transaction = await MerchantTransaction.findOne({ billNo: id });
      if (transaction) {
        // Revert merchant balance: since it was 'gave', we subtract the transaction amount
        await Merchant.findByIdAndUpdate(
          transaction.merchantId,
          { $inc: { balance: -transaction.amount } }
        );
        // Delete the transaction
        await MerchantTransaction.findByIdAndDelete(transaction._id);
      }
    } catch (txnErr) {
      console.error('Error reverting merchant transaction on bill delete:', txnErr);
    }

    await Bill.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Bill record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Bill record',
      error: error.message
    });
  }
};

module.exports = {
  createBill,
  getAllBills,
  deleteBill
};
