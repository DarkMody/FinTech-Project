const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  cycleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  amount: { type: Number, required: true },
  category: { type: String, default: "Other" },
  timestamp: { type: Date, default: new Date() },
  note: { type: String },
});

module.exports = mongoose.model("Transaction", transactionSchema);
