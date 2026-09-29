const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },

    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },

    accuracy: {
      type: Number,
      min: 0,
      default: null
    }
  },
  {
    _id: false
  }
);

const alertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "ACKNOWLEDGED",
        "RESPONDING",
        "RESOLVED",
        "CANCELLED"
      ],
      default: "ACTIVE",
      index: true
    },

    triggeredAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    acknowledgedAt: {
      type: Date,
      default: null
    },

    resolvedAt: {
      type: Date,
      default: null
    },

    cancelledAt: {
      type: Date,
      default: null
    },

    initialLocation: {
      type: locationSchema,
      required: true
    },

    currentLocation: {
      type: locationSchema,
      required: true
    },

    lastLocationUpdate: {
      type: Date,
      default: Date.now
    },

    responseTimeSeconds: {
      type: Number,
      default: null,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Alert", alertSchema);
