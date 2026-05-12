const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  alert: { type: Number, default: 80 },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
});

module.exports = mongoose.model("Alert", alertSchema);
