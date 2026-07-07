const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');

// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.id })
      .populate('invoiceId')
      .populate('customerId');
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get single payment
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('invoiceId')
      .populate('customerId');
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }
    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Create payment
exports.createPayment = async (req, res) => {
  try {
    const { invoiceId } = req.body;

    // Verify invoice exists
    const invoice = await Invoice.findOne({ _id: invoiceId, userId: req.user.id });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}`;

    const payment = await Payment.create({
      ...req.body,
      userId: req.user.id,
      customerId: invoice.customerId,
      transactionId,
      status: 'completed',
    });

    // Update invoice status
    await Invoice.findOneAndUpdate(
      { _id: invoiceId, userId: req.user.id },
      {
        status: 'paid',
        paidDate: Date.now(),
      }
    );

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Update payment
exports.updatePayment = async (req, res) => {
  try {
    const { userId, ...updates } = req.body;

    if (updates.invoiceId) {
      const invoice = await Invoice.findOne({ _id: updates.invoiceId, userId: req.user.id });
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      updates.customerId = invoice.customerId;
    } else {
      delete updates.customerId;
    }

    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updates,
      { new: true, runValidators: true }
    );
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }
    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete payment
exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }
    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get payments by customer
exports.getPaymentsByCustomer = async (req, res) => {
  try {
    const payments = await Payment.find({
      userId: req.user.id,
      customerId: req.params.customerId,
    });
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
