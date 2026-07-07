const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Item = require('../models/Item');
const Payment = require('../models/Payment');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await Promise.all([
      Customer.syncIndexes(),
      Invoice.syncIndexes(),
      Item.syncIndexes(),
      Payment.syncIndexes(),
    ]);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
