const { client } = require('../config/paypal');
const paypal = require('@paypal/checkout-server-sdk');
const Booking = require('../models/Booking');
const Guest = require('../models/Guest');
const { calculateTotalPaid, calculateRegistrationPaymentStatus } = require('../utils/paymentHelper');

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
          booking.registrationPaymentDetails = { transactions: [] };
        }
        if (!booking.registrationPaymentDetails.transactions) {
          booking.registrationPaymentDetails.transactions = [];
        }

        // Get all guests for this booking
        const guests = await Guest.find({ _id: { $in: booking.guestIds } });
        const paidGuestIds = booking.registrationPaymentDetails.paidGuestIds || [];
        const unpaidGuests = guests.filter(g => !paidGuestIds.includes(g._id));

        // Get first unpaid guest to link to transaction
        const paidGuestId = unpaidGuests.length > 0 ? unpaidGuests[0]._id : guests[0]._id;

        // Add this transaction with guestId reference
        booking.registrationPaymentDetails.transactions.push({
          transactionId: capture.result.id,
          guestId: paidGuestId,
          amount: capturedAmount,
          currency: capturedCurrency,
          paymentDate: new Date(),
          payerEmail: capture.result.payer.email_address,
          payerName: `${capture.result.payer.name.given_name} ${capture.result.payer.name.surname}`,
          status: 'completed'
        });

        // Mark unpaid guests as paid for THIS booking only
        unpaidGuests.forEach(guest => {
          if (!paidGuestIds.includes(guest._id)) {
            paidGuestIds.push(guest._id);
          }
        });
        booking.registrationPaymentDetails.paidGuestIds = paidGuestIds;

        await booking.save();

        const updatedBooking = await Booking.findById(booking._id)
          .populate('tripId', 'name destination price image')
          .populate('userId', 'name email')
          .populate('guestIds');

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

    const booking = await Booking.findById(bookingId)
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const guests = booking.guestIds || [];
    const allGuestsPaid = guests.length > 0 && guests.every(guest => guest.registrationPayment === true);
    const paidCount = guests.filter(guest => guest.registrationPayment === true).length;
    const totalPaid = calculateTotalPaid(booking.registrationPaymentDetails);

    res.json({
      success: true,
      bookingId: booking.bookingId,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      allGuestsPaid,
      guestCount: guests.length,
      paidCount,
      totalPaid,
      requiredAmount: booking.registrationPaymentDetails?.requiredAmount || 0,
      paymentDetails: booking.registrationPaymentDetails,
      guests: guests.map(guest => ({
        id: guest._id,
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

    const booking = await Booking.findById(bookingId).populate('guestIds');
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

    // Reset guest payment status in their own documents
    await Guest.updateMany(
      { _id: { $in: booking.guestIds } },
      { registrationPayment: false }
    );

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds');

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      booking: updatedBooking
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