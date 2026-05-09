const mongoose = require("mongoose");

const spendingSchema = new mongoose.Schema({
  cycleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  totalSpent: { type: Number, default: 0 },
  remaining: { type: Number },
  categoryTotals: {
    type: Map,
    of: Number,
    default: {},
  },
});

module.exports = mongoose.model("Spending", spendingSchema);
