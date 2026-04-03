const mongoose = require("mongoose");

const citizenSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  phone: String,
  email: String,
  photo: String,
  identityDocument: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Citizen", citizenSchema);