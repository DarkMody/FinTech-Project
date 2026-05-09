const mongoose = require("mongoose");
const validate = require("validator");

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    validate: [validate.isEmail, "It must be email"],
  },
  password: {
    type: String,
    required: true,
  },
  pin: {
    type: String,
    require: true,
  },
});

module.exports = mongoose.model("User", userSchema);
