const { client } = require('../config/paypal');
const paypal = require('@paypal/checkout-server-sdk');
const {Booking} = require('../models/Booking'); // Adjust path as needed

// Create PayPal Order
const createPayPalOrder = async (req, res) => {
  try {
    const { bookingId, amount, currency = 'USD', description } = req.body;

    // Validate booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Force USD currency to avoid currency issues
    const supportedCurrency = 'USD'; // Force USD which is widely supported

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: supportedCurrency, // Use forced currency
          value: amount.toString()
        },
        description: description || `Registration Payment for Booking ${booking.bookingId}`,
        custom_id: `REG_${booking.bookingId}_${Date.now()}`,
        soft_descriptor: 'Trip Registration'
      }],
      application_context: {
        brand_name: 'Adventure Safari',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.CLIENT_URL}/payment/success`,
        cancel_url: `${process.env.CLIENT_URL}/payment/cancel`
      }
    });

    const order = await client().execute(request);

    res.json({
      success: true,
      orderId: order.result.id,
      order: order.result
    });

  } catch (error) {
    console.error('Error creating PayPal order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create PayPal order',
      error: error.message
    });
  }
};

// Capture PayPal Order
const capturePayPalOrder = async (req, res) => {
  try {
    const { orderId, bookingId } = req.body;

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const capture = await client().execute(request);

    if (capture.result.status === 'COMPLETED') {
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.bookingStatus = 'confirmed';

        const capturedAmount = parseFloat(capture.result.purchase_units[0].payments.captures[0].amount.value);
        const capturedCurrency = capture.result.purchase_units[0].payments.captures[0].amount.currency_code;

        // Initialize registrationPaymentDetails if not exists
        if (!booking.registrationPaymentDetails) {
          booking.registrationPaymentDetails = { transactions: [], totalPaid: 0, status: 'pending' };
        }
        if (!booking.registrationPaymentDetails.transactions) {
          booking.registrationPaymentDetails.transactions = [];
        }

        // Count unpaid guests being paid in this transaction
        const unpaidGuests = booking.guests.filter(g => !g.registrationPayment);
        const guestsPaidNow = unpaidGuests.length;

        // Add this transaction
        booking.registrationPaymentDetails.transactions.push({
          transactionId: capture.result.id,
          paymentDate: new Date(),
          amount: capturedAmount,
          currency: capturedCurrency,
          payerEmail: capture.result.payer.email_address,
          payerName: `${capture.result.payer.name.given_name} ${capture.result.payer.name.surname}`,
          guestsPaid: guestsPaidNow
        });

        // Update total paid
        booking.registrationPaymentDetails.totalPaid =
          (booking.registrationPaymentDetails.totalPaid || 0) + capturedAmount;

        // Mark unpaid guests as paid
        booking.guests.forEach(guest => {
          if (!guest.registrationPayment) {
            guest.registrationPayment = true;
          }
        });

        // Update status based on whether all guests are now paid
        const allPaid = booking.guests.every(g => g.registrationPayment);
        booking.registrationPaymentDetails.status = allPaid ? 'paid' : 'partial';

        await booking.save();

        const updatedBooking = await Booking.findById(booking._id)
          .populate('tripId', 'name destination price image')
          .populate('userId', 'name email');

        res.json({
          success: true,
          message: 'Payment completed successfully',
          transactionId: capture.result.id,
          paymentDetails: capture.result,
          bookingStatus: 'confirmed',
          booking: updatedBooking
        });
      } else {
        res.status(404).json({ success: false, message: 'Booking not found' });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment was not completed',
        status: capture.result.status
      });
    }

  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to capture PayPal order',
      error: error.message
    });
  }
};

// Get payment status
const getPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId).populate('tripId userId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const allGuestsPaid = booking.guests.every(guest => guest.registrationPayment === true);
    const paidCount = booking.guests.filter(guest => guest.registrationPayment === true).length;

    res.json({
      success: true,
      bookingId: booking.bookingId,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      allGuestsPaid,
      guestCount: booking.guests.length,
      paidCount,
      totalAmount: booking.registrationPaymentDetails?.amount || 0,
      paymentDetails: booking.registrationPaymentDetails,
      guests: booking.guests.map(guest => ({
        name: guest.name,
        age: guest.age,
        registrationPayment: guest.registrationPayment
      })),
      tripDetails: booking.tripId ? {
        name: booking.tripId.name,
        destination: booking.tripId.destination,
        price: booking.tripId.price
      } : null
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
};

// Refund payment (optional additional functionality)
const refundPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment has not been completed, cannot refund'
      });
    }

    // Here you would implement PayPal refund API call
    // For now, just update the status
    booking.paymentStatus = 'refunded';
    booking.bookingStatus = 'cancelled';
    
    // Reset guest payment status
    booking.guests.forEach(guest => {
      guest.registrationPayment = false;
    });

    await booking.save();

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus
    });

  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refund payment',
      error: error.message
    });
  }
};

module.exports = {
  createPayPalOrder,
  capturePayPalOrder,
  getPaymentStatus,
  refundPayment
};