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
        const diffTime = txnDate - loan.lastDate;
        const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const durationMonths = diffDays / 30;
        const interestAmount = (loan.currentPrincipal * loan.interestRate * durationMonths) / 100;
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
    const diffTime = upToDate - loan.lastDate;
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const durationMonths = diffDays / 30;
    const interestAmount = (loan.currentPrincipal * loan.interestRate * durationMonths) / 100;
    
    const totalMonths = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;

    totalPrincipal += loan.currentPrincipal;
    totalInterestAccrued += interestAmount;

    return {
      _id: loan._id,
      date: loan.date,
      originalAmount: loan.originalAmount,
      currentPrincipal: Math.round(loan.currentPrincipal),
      interestRate: loan.interestRate,
      lastDate: loan.lastDate,
      duration: `${totalMonths} months ${remainingDays} days`,
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
