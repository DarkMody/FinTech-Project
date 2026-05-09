const mongoose = require("mongoose");

const cycleSchema = new mongoose.Schema({
  totalAmount: { type: Number, required: true },
  cycleName: { type: String, default: "My Cycle" },
  startDate: { type: Date, required: true },
  endDate: { type: Date, require: true },
  safeLimit: { type: Number },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
});

module.exports = mongoose.model("Cycle", cycleSchema);
