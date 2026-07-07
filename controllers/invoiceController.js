const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');

// Get all invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user.id }).populate('customerId');
    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get single invoice
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id }).populate('customerId');
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }
    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Create invoice
exports.createInvoice = async (req, res) => {
  try {
    const { customerId, items, tax, dueDate } = req.body;

    // Validate required fields
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invoice must have at least one item',
      });
    }

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Due date is required',
      });
    }

    // Verify customer exists
    const customer = await Customer.findOne({ _id: customerId, userId: req.user.id });
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    // Validate items
    for (let item of items) {
      if (!item.description || !item.quantity || !item.unitPrice || item.amount === undefined) {
        return res.status(400).json({
          success: false,
          error: 'All items must have description, quantity, unit price, and amount',
        });
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const total = subtotal + (tax || 0);

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    const invoice = await Invoice.create({
      userId: req.user.id,
      invoiceNumber,
      customerId,
      items,
      subtotal,
      tax: tax || 0,
      total,
      dueDate: req.body.dueDate,
      notes: req.body.notes,
    });

    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Invoice creation error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Update invoice
exports.updateInvoice = async (req, res) => {
  try {
    let invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    if (req.body.customerId) {
      const customer = await Customer.findOne({ _id: req.body.customerId, userId: req.user.id });
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }
    }

    const { userId, ...updates } = req.body;

    // Recalculate totals if items are updated
    if (updates.items) {
      updates.subtotal = updates.items.reduce((sum, item) => sum + item.amount, 0);
      updates.total = updates.subtotal + (updates.tax !== undefined ? updates.tax : invoice.tax);
    }

    invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete invoice
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
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

// Mark invoice as paid
exports.markAsPaid = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: 'paid', paidDate: Date.now() },
      { new: true }
    );
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }
    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get invoices by customer
exports.getInvoicesByCustomer = async (req, res) => {
  try {
    const invoices = await Invoice.find({
      userId: req.user.id,
      customerId: req.params.customerId,
    });
    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
