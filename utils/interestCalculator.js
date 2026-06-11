/**
 * Calculates calendar months and days between two dates, ignoring timezone and exact time offsets.
 * 
 * @param {Date|String} startDateStr 
 * @param {Date|String} endDateStr 
 */
function getDurationInMonths(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  // Normalize both dates to noon to completely ignore time-of-day offsets/DST
  start.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);

  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();

  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    // Get number of days in the previous month relative to the end month
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }

  return {
    months: Math.max(0, months),
    days: Math.max(0, days),
    durationMonths: Math.max(0, months + (days / 30))
  };
}

/**
 * Calculates interest and running balance using a FIFO allocation of payments to open loans.
 * 
 * @param {Array} transactions - Array of customer transaction documents
 * @param {Date} upToDate - Date up to which to compute interest accrual
 */
function calculateRunningLedger(transactions, upToDate = new Date()) {
  // Sort transactions ascending: oldest first.
  const sortedTxns = [...transactions].sort((a, b) => {
    const dateDiff = new Date(a.date) - new Date(b.date);
    if (dateDiff !== 0) return dateDiff;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  let activeLoans = [];
  let prepayment = 0;

  for (const txn of sortedTxns) {
    const txnDate = new Date(txn.date);
    
    if (txn.type === 'gave') {
      let principal = txn.amount;
      
      // Apply prepayment if any exists
      if (prepayment > 0) {
        if (prepayment >= principal) {
          prepayment -= principal;
          principal = 0;
        } else {
          principal -= prepayment;
          prepayment = 0;
        }
      }

      if (principal > 0) {
        activeLoans.push({
          _id: txn._id,
          date: txnDate,
          originalAmount: txn.amount,
          currentPrincipal: principal,
          interestRate: txn.interestRate || 0,
          lastDate: txnDate,
          description: txn.description,
          billNo: txn.billNo
        });
      }
    } else if (txn.type === 'got') {
      let paymentAmount = txn.amount;

      // Apply payment to oldest active loans first (FIFO)
      for (let i = 0; i < activeLoans.length; i++) {
        if (paymentAmount <= 0) break;

        const loan = activeLoans[i];
        
        // Calculate interest accrued on this loan from loan.lastDate to txnDate
        const duration = getDurationInMonths(loan.lastDate, txnDate);
        const interestAmount = (loan.currentPrincipal * loan.interestRate * duration.durationMonths) / 100;
        const totalOwed = loan.currentPrincipal + interestAmount;

        if (paymentAmount >= totalOwed) {
          paymentAmount -= totalOwed;
          loan.currentPrincipal = 0;
          loan.lastDate = txnDate;
        } else {
          loan.currentPrincipal = totalOwed - paymentAmount;
          loan.lastDate = txnDate;
          paymentAmount = 0;
        }
      }

      // Filter out fully paid loans
      activeLoans = activeLoans.filter(l => l.currentPrincipal > 0);

      // Remaining payment becomes prepayment
      if (paymentAmount > 0) {
        prepayment += paymentAmount;
      }
    }
  }

  // Calculate accrued interest on remaining active loans up to upToDate
  let totalPrincipal = 0;
  let totalInterestAccrued = 0;
  
  const processedLoans = activeLoans.map(loan => {
    const duration = getDurationInMonths(loan.lastDate, upToDate);
    const interestAmount = (loan.currentPrincipal * loan.interestRate * duration.durationMonths) / 100;
    
    totalPrincipal += loan.currentPrincipal;
    totalInterestAccrued += interestAmount;

    return {
      _id: loan._id,
      date: loan.date,
      originalAmount: loan.originalAmount,
      currentPrincipal: Math.round(loan.currentPrincipal),
      interestRate: loan.interestRate,
      lastDate: loan.lastDate,
      duration: `${duration.months} months ${duration.days} days`,
      interestAmount: Math.round(interestAmount),
      totalAmount: Math.round(loan.currentPrincipal + interestAmount),
      description: loan.description,
      billNo: loan.billNo
    };
  });

  const netBalance = totalPrincipal + totalInterestAccrued - prepayment;

  return {
    activeLoans: processedLoans,
    prepayment: Math.round(prepayment),
    totalPrincipal: Math.round(totalPrincipal),
    totalInterest: Math.round(totalInterestAccrued),
    netBalance: Math.round(netBalance)
  };
}

module.exports = { calculateRunningLedger };
