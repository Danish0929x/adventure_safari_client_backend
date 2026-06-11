// Calculate total paid from transactions
const calculateTotalPaid = (registrationPaymentDetails) => {
  if (!registrationPaymentDetails || !registrationPaymentDetails.transactions) {
    return 0;
  }
  return registrationPaymentDetails.transactions.reduce((sum, transaction) => {
    return sum + (transaction.amount || 0);
  }, 0);
};

// Calculate registration payment status based on guest payment completion
const calculateRegistrationPaymentStatus = (guests) => {
  if (!guests || guests.length === 0) {
    return 'pending';
  }

  const totalGuests = guests.length;
  const paidGuests = guests.filter(g => g.registrationPayment === true).length;

  if (paidGuests === 0) {
    return 'pending';
  }
  if (paidGuests === totalGuests) {
    return 'paid';
  }
  return 'partial';
};

module.exports = { calculateTotalPaid, calculateRegistrationPaymentStatus };
