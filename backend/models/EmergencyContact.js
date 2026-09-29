const mongoose = require("mongoose");

const emergencyContactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    name: {
      type: String,
      required: [true, "Contact name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      maxlength: 30
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },

    relationship: {
      type: String,
      trim: true,
      maxlength: 50,
      default: ""
    },

    isPrimary: {
      type: Boolean,
      default: false
    },

    isVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "EmergencyContact",
  emergencyContactSchema
);