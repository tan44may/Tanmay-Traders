const Employee = require('../models/Employee');
const EmployeeAttendance = require('../models/EmployeeAttendance');
const EmployeeTransaction = require('../models/EmployeeTransaction');
const CashbookEntry = require('../models/CashbookEntry');
const BankTransaction = require('../models/BankTransaction');
const BankAccount = require('../models/BankAccount');

// ----------------------------------------------------
// Employees Controller
// ----------------------------------------------------

// @desc    Create a new Employee
// @route   POST /api/employee
const createEmployee = async (req, res) => {
  try {
    const { employeeName, contactNumber, weeklySalary, joiningDate, role } = req.body;

    if (!employeeName) {
      return res.status(400).json({ success: false, message: 'Employee name is required' });
    }

    // Check unique employee name
    const existingEmployee = await Employee.findOne({ employeeName });
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: 'An employee with this name already exists' });
    }

    const newEmployee = new Employee({
      employeeName,
      contactNumber,
      weeklySalary: weeklySalary || 0,
      joiningDate: joiningDate || Date.now(),
      role: role || 'Worker'
    });

    const savedEmployee = await newEmployee.save();

    res.status(201).json({
      success: true,
      data: savedEmployee,
      message: 'Employee added successfully'
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ success: false, message: 'Failed to create employee', error: error.message });
  }
};

// @desc    Get all Employees (with outstanding balances calculated from ledger transactions)
// @route   GET /api/employee
const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });

    const employeesWithBalance = await Promise.all(employees.map(async (emp) => {
      const transactions = await EmployeeTransaction.find({ employeeId: emp._id });
      
      let totalSalary = 0; // Credit
      let totalPayments = 0; // Debit

      transactions.forEach(t => {
        if (t.type === 'Salary') {
          totalSalary += t.amount;
        } else if (t.type === 'Payment') {
          totalPayments += t.amount;
        }
      });

      // Outstanding balance: Positive means we owe employee, negative means advance given
      const balance = totalSalary - totalPayments;
      
      const empObj = emp.toObject();
      empObj.balance = balance;
      return empObj;
    }));

    res.status(200).json({
      success: true,
      data: employeesWithBalance,
      message: 'Employees fetched successfully with balances'
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employees', error: error.message });
  }
};

// @desc    Update employee details
// @route   PUT /api/employee/:id
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeName, contactNumber, weeklySalary, joiningDate, role, status } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (employeeName && employeeName !== employee.employeeName) {
      const existingEmployee = await Employee.findOne({ employeeName });
      if (existingEmployee) {
        return res.status(400).json({ success: false, message: 'An employee with this name already exists' });
      }
    }

    employee.employeeName = employeeName !== undefined ? employeeName : employee.employeeName;
    employee.contactNumber = contactNumber !== undefined ? contactNumber : employee.contactNumber;
    employee.weeklySalary = weeklySalary !== undefined ? weeklySalary : employee.weeklySalary;
    employee.joiningDate = joiningDate !== undefined ? joiningDate : employee.joiningDate;
    employee.role = role !== undefined ? role : employee.role;
    employee.status = status !== undefined ? status : employee.status;

    const updatedEmployee = await employee.save();

    res.status(200).json({
      success: true,
      data: updatedEmployee,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ success: false, message: 'Failed to update employee', error: error.message });
  }
};

// @desc    Delete employee (cleans up associated attendances & transactions)
// @route   DELETE /api/employee/:id
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Retrieve all employee transactions to clean up external links
    const transactions = await EmployeeTransaction.find({ employeeId: id });
    for (const t of transactions) {
      if (t.type === 'Payment') {
        if (t.paymentMethod === 'Cash' && t.cashbookEntryId) {
          await CashbookEntry.findByIdAndDelete(t.cashbookEntryId);
        } else if (t.paymentMethod === 'Bank' && t.bankTransactionId) {
          // Delete Bank transaction and restore Bank Account Balance
          const bankTx = await BankTransaction.findById(t.bankTransactionId);
          if (bankTx) {
            await BankAccount.findByIdAndUpdate(
              bankTx.bankAccountId,
              { $inc: { balance: bankTx.amount } } // Restore balance since it was a debit
            );
            await BankTransaction.findByIdAndDelete(t.bankTransactionId);
          }
        }
      }
    }

    // Delete all ledger transactions and attendance records
    await EmployeeTransaction.deleteMany({ employeeId: id });
    await EmployeeAttendance.deleteMany({ employeeId: id });
    await Employee.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Employee and all associated records deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, message: 'Failed to delete employee', error: error.message });
  }
};


// ----------------------------------------------------
// Attendance Controller
// ----------------------------------------------------

// Helper to normalize Date to Sunday at 00:00:00.000 Local Time
const getSundayOfWeek = (dateInput) => {
  const d = new Date(dateInput);
  const day = d.getDay(); // 0 is Sunday
  const diff = d.getDate() - day; // adjust back to Sunday
  const sunday = new Date(d.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday;
};

// @desc    Get attendance for a specific week. Returns default if not exists.
// @route   GET /api/employee/:id/attendance
// @query   date (any date in target week YYYY-MM-DD)
const getEmployeeAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date query param is required' });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const weekStartDate = getSundayOfWeek(date);

    // Look for existing attendance record
    let attendanceRec = await EmployeeAttendance.findOne({ employeeId: id, weekStartDate });

    if (!attendanceRec) {
      // By default, mark present to all user only uncheck when employee is absent
      const defaultDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => ({
        day,
        present: true
      }));

      attendanceRec = {
        employeeId: id,
        weekStartDate,
        attendance: defaultDays,
        weeklySalary: employee.weeklySalary,
        calculatedSalary: employee.weeklySalary, // all 7 days present by default
        bonus: 0,
        deduction: 0,
        netSalary: employee.weeklySalary,
        isFinalized: false,
        notes: ''
      };
    }

    res.status(200).json({
      success: true,
      data: attendanceRec,
      message: 'Attendance retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: error.message });
  }
};

// @desc    Save/Update weekly attendance (draft or edit before finalizing)
// @route   POST /api/employee/:id/attendance
const saveEmployeeAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { weekStartDate, attendance, weeklySalary, bonus, deduction, notes } = req.body;

    if (!weekStartDate || !attendance || weeklySalary === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required attendance fields' });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const targetWeek = new Date(weekStartDate);

    let attendanceRec = await EmployeeAttendance.findOne({ employeeId: id, weekStartDate: targetWeek });
    if (attendanceRec && attendanceRec.isFinalized) {
      return res.status(400).json({ success: false, message: 'Attendance for this week is already finalized' });
    }

    // Calculate present days
    const presentCount = attendance.filter(a => a.present).length;
    // Salary is weekly based: weeklySalary * (presentDays / 7)
    const calculatedSalary = Number(((weeklySalary * presentCount) / 7).toFixed(2));
    const bonusNum = Number(bonus) || 0;
    const deductionNum = Number(deduction) || 0;
    const netSalary = Number((calculatedSalary + bonusNum - deductionNum).toFixed(2));

    if (!attendanceRec) {
      attendanceRec = new EmployeeAttendance({
        employeeId: id,
        weekStartDate: targetWeek,
        attendance,
        weeklySalary,
        calculatedSalary,
        bonus: bonusNum,
        deduction: deductionNum,
        netSalary,
        isFinalized: false,
        notes
      });
    } else {
      attendanceRec.attendance = attendance;
      attendanceRec.weeklySalary = weeklySalary;
      attendanceRec.calculatedSalary = calculatedSalary;
      attendanceRec.bonus = bonusNum;
      attendanceRec.deduction = deductionNum;
      attendanceRec.netSalary = netSalary;
      attendanceRec.notes = notes;
    }

    const saved = await attendanceRec.save();

    res.status(200).json({
      success: true,
      data: saved,
      message: 'Attendance saved successfully'
    });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to save attendance', error: error.message });
  }
};

// @desc    Finalize weekly attendance and post salary to ledger
// @route   POST /api/employee/:id/attendance/finalize
const finalizeEmployeeAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { weekStartDate, attendance, weeklySalary, bonus, deduction, notes } = req.body;

    if (!weekStartDate || !attendance || weeklySalary === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required attendance fields' });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const targetWeek = new Date(weekStartDate);

    let attendanceRec = await EmployeeAttendance.findOne({ employeeId: id, weekStartDate: targetWeek });
    if (attendanceRec && attendanceRec.isFinalized) {
      return res.status(400).json({ success: false, message: 'Attendance for this week is already finalized' });
    }

    // Calculate present days
    const presentCount = attendance.filter(a => a.present).length;
    const calculatedSalary = Number(((weeklySalary * presentCount) / 7).toFixed(2));
    const bonusNum = Number(bonus) || 0;
    const deductionNum = Number(deduction) || 0;
    const netSalary = Number((calculatedSalary + bonusNum - deductionNum).toFixed(2));

    if (!attendanceRec) {
      attendanceRec = new EmployeeAttendance({
        employeeId: id,
        weekStartDate: targetWeek,
        attendance,
        weeklySalary,
        calculatedSalary,
        bonus: bonusNum,
        deduction: deductionNum,
        netSalary,
        isFinalized: true,
        notes
      });
    } else {
      attendanceRec.attendance = attendance;
      attendanceRec.weeklySalary = weeklySalary;
      attendanceRec.calculatedSalary = calculatedSalary;
      attendanceRec.bonus = bonusNum;
      attendanceRec.deduction = deductionNum;
      attendanceRec.netSalary = netSalary;
      attendanceRec.notes = notes;
      attendanceRec.isFinalized = true;
    }

    const savedAttendance = await attendanceRec.save();

    // Format weekStartDate for description
    const formattedDate = targetWeek.toISOString().split('T')[0];

    // Create credit ledger entry (Salary Payable)
    const ledgerTx = new EmployeeTransaction({
      employeeId: id,
      date: new Date(), // posted today
      type: 'Salary',
      amount: netSalary,
      paymentMethod: 'N/A',
      description: `साप्ताहिक पगार अंतिम केला (आठवडा तारीख: ${formattedDate}, ${presentCount}/7 उपस्थित)`,
      attendanceId: savedAttendance._id
    });

    await ledgerTx.save();

    res.status(200).json({
      success: true,
      data: savedAttendance,
      message: 'Weekly attendance finalized and salary posted to ledger successfully'
    });
  } catch (error) {
    console.error('Error finalizing attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to finalize attendance', error: error.message });
  }
};


// ----------------------------------------------------
// Ledger & Payments Controller
// ----------------------------------------------------

// @desc    Get ledger transactions for an employee
// @route   GET /api/employee/:id/transactions
const getEmployeeTransactions = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const transactions = await EmployeeTransaction.find({ employeeId: id }).sort({ date: 1 });

    // Calculate running balance
    let runningBalance = 0;
    const ledger = transactions.map(t => {
      if (t.type === 'Salary') {
        runningBalance += t.amount;
      } else if (t.type === 'Payment') {
        runningBalance -= t.amount;
      }
      const tObj = t.toObject();
      tObj.runningBalance = runningBalance;
      return tObj;
    });

    res.status(200).json({
      success: true,
      data: ledger,
      message: 'Employee ledger transactions fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching employee transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: error.message });
  }
};

// @desc    Add a payment/advance for an employee
// @route   POST /api/employee/:id/transactions
const addEmployeePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, amount, paymentMethod, bankAccountId, description } = req.body;

    if (!amount || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Amount and Payment Method are required' });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const amtNum = Number(amount);
    const txnDate = date ? new Date(date) : new Date();

    const newTxn = new EmployeeTransaction({
      employeeId: id,
      date: txnDate,
      type: 'Payment',
      amount: amtNum,
      paymentMethod,
      description: description || 'Salary payment'
    });

    // Integrated transaction creations
    if (paymentMethod === 'Cash') {
      // Post to cashbook
      const dateStr = txnDate.toISOString().split('T')[0];
      const cashbookEntry = new CashbookEntry({
        date: dateStr,
        type: 'withdrawal', // Cash outflow (Naave / Debit)
        description: `कर्मचारी पेमेंट: ${employee.employeeName} (${description || 'पगार जमा'})`,
        amount: amtNum,
        isManual: true
      });
      const savedCashbook = await cashbookEntry.save();
      newTxn.cashbookEntryId = savedCashbook._id;

    } else if (paymentMethod === 'Bank') {
      if (!bankAccountId) {
        return res.status(400).json({ success: false, message: 'Bank account is required for Bank payment method' });
      }
      const bankAcct = await BankAccount.findById(bankAccountId);
      if (!bankAcct) {
        return res.status(404).json({ success: false, message: 'Bank account not found' });
      }

      // Post BankTransaction
      const bankTxn = new BankTransaction({
        bankAccountId,
        type: 'debit',
        amount: amtNum,
        date: txnDate,
        description: `कर्मचारी पेमेंट: ${employee.employeeName} (${description || 'पगार जमा'})`,
        transactionType: 'imps'
      });
      const savedBankTxn = await bankTxn.save();
      newTxn.bankAccountId = bankAccountId;
      newTxn.bankTransactionId = savedBankTxn._id;

      // Update bank account balance (debits reduce bank accounts)
      await BankAccount.findByIdAndUpdate(
        bankAccountId,
        { $inc: { balance: -amtNum } }
      );
    }

    const savedTxn = await newTxn.save();

    res.status(201).json({
      success: true,
      data: savedTxn,
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    console.error('Error recording employee payment:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment', error: error.message });
  }
};

// @desc    Delete a payment or salary transaction
// @route   DELETE /api/employee/transactions/:txnId
const deleteEmployeeTransaction = async (req, res) => {
  try {
    const { txnId } = req.params;

    const txn = await EmployeeTransaction.findById(txnId);
    if (!txn) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Clean up integrations if payment
    if (txn.type === 'Payment') {
      if (txn.paymentMethod === 'Cash' && txn.cashbookEntryId) {
        await CashbookEntry.findByIdAndDelete(txn.cashbookEntryId);
      } else if (txn.paymentMethod === 'Bank' && txn.bankTransactionId) {
        // Delete Bank transaction and restore bank balance
        const bankTx = await BankTransaction.findById(txn.bankTransactionId);
        if (bankTx) {
          await BankAccount.findByIdAndUpdate(
            bankTx.bankAccountId,
            { $inc: { balance: bankTx.amount } } // Add back the debited amount
          );
          await BankTransaction.findByIdAndDelete(txn.bankTransactionId);
        }
      }
    } else if (txn.type === 'Salary' && txn.attendanceId) {
      // Revert isFinalized to false on attendance if the finalized salary credit is deleted
      await EmployeeAttendance.findByIdAndUpdate(txn.attendanceId, { isFinalized: false });
    }

    await EmployeeTransaction.findByIdAndDelete(txnId);

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully and balances reverted'
    });
  } catch (error) {
    console.error('Error deleting employee transaction:', error);
    res.status(500).json({ success: false, message: 'Failed to delete transaction', error: error.message });
  }
};

module.exports = {
  createEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
  getEmployeeAttendance,
  saveEmployeeAttendance,
  finalizeEmployeeAttendance,
  getEmployeeTransactions,
  addEmployeePayment,
  deleteEmployeeTransaction
};
