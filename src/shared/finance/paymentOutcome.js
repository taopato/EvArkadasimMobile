export function getPaymentOutcome(openDebtAmount, paymentAmount) {
  const debt = Math.max(0, Number(openDebtAmount) || 0);
  const payment = Math.max(0, Number(paymentAmount) || 0);

  return {
    remainingDebt: Math.max(0, debt - payment),
    resultingCredit: Math.max(0, payment - debt),
    closesDebt: debt > 0 && payment >= debt,
  };
}
