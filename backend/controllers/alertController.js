const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const Alert = require("../models/Alert");
const EmergencyContact = require("../models/EmergencyContact");

const {
  sendEmergencyNotifications
} = require("../services/notificationService");

const createSOSAlert = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid emergency location",
        errors: errors.array()
      });
    }

    const {
      latitude,
      longitude,
      accuracy
    } = req.body;

    const location = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy:
        accuracy === undefined || accuracy === null
          ? null
          : Number(accuracy)
    };

    const alert = await Alert.create({
      user: req.user._id,
      status: "ACTIVE",
      initialLocation: location,
      currentLocation: location,
      triggeredAt: new Date(),
      lastLocationUpdate: new Date()
    });

    const populatedAlert = await Alert.findById(alert._id)
      .populate("user", "name email phone");

    console.log(
      `SOS ALERT CREATED: ${alert._id} | User: ${req.user._id}`
    );

    try {
      const contacts = await EmergencyContact.find({
        user: req.user._id
      }).lean();

      console.log(
        `SOS CONTACTS FOUND: ${contacts.length} | Alert: ${alert._id}`
      );

      if (contacts.length === 0) {
        console.log(
          `SOS NOTIFICATION: No emergency contacts configured | Alert: ${alert._id}`
        );
      } else {
        console.log(
          "SOS CONTACT EMAILS:",
          contacts.map((contact) => ({
            name: contact.name,
            email: contact.email,
            isPrimary: contact.isPrimary
          }))
        );

        const notificationResult =
          await sendEmergencyNotifications({
            contacts,

            userName:
              populatedAlert.user?.name ||
              req.user.name ||
              "Silent SOS User",

            alertId: populatedAlert._id.toString(),

            latitude:
              populatedAlert.currentLocation?.latitude,

            longitude:
              populatedAlert.currentLocation?.longitude,

            accuracy:
              populatedAlert.currentLocation?.accuracy,

            triggeredAt:
              populatedAlert.triggeredAt,

            status:
              populatedAlert.status || "ACTIVE"
          });

        console.log(
          `SOS NOTIFICATION RESULT: Alert: ${alert._id} | ` +
          `Attempted: ${notificationResult.attempted} | ` +
          `Sent: ${notificationResult.sent} | ` +
          `Failed: ${notificationResult.failed} | ` +
          `Skipped: ${notificationResult.skipped}`
        );

        if (Array.isArray(notificationResult.results)) {
          notificationResult.results.forEach((result) => {
            console.log(
              `SOS CONTACT RESULT: ${result.contactName || "Unknown"} | ` +
              `Email: ${result.recipient || "N/A"} | ` +
              `Success: ${result.success} | ` +
              `Skipped: ${result.skipped} | ` +
              `Message: ${result.message || "None"}`
            );
          });
        }
      }
    } catch (notificationError) {
      console.error(
        "SOS NOTIFICATION ERROR:",
        notificationError
      );
    }

    return res.status(201).json({
      success: true,
      message: "Emergency alert activated",
      alert: populatedAlert
    });
  } catch (error) {
    console.error(
      "CREATE SOS ALERT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create emergency alert"
    });
  }
};

const getActiveAlert = async (req, res) => {
  try {
    const alert = await Alert.findOne({
      user: req.user._id,
      status: {
        $in: [
          "ACTIVE",
          "ACKNOWLEDGED",
          "RESPONDING"
        ]
      }
    })
      .sort({
        triggeredAt: -1
      })
      .populate("user", "name email phone");

    return res.status(200).json({
      success: true,
      alert
    });
  } catch (error) {
    console.error(
      "GET ACTIVE ALERT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve active alert"
    });
  }
};

const getAlert = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID"
      });
    }

    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate(
      "user",
      "name email phone"
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found"
      });
    }

    return res.status(200).json({
      success: true,
      alert
    });
  } catch (error) {
    console.error(
      "GET ALERT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve alert"
    });
  }
};

const updateAlertLocation = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid location",
        errors: errors.array()
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID"
      });
    }

    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: {
        $in: [
          "ACTIVE",
          "ACKNOWLEDGED",
          "RESPONDING"
        ]
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Active alert not found"
      });
    }

    const {
      latitude,
      longitude,
      accuracy
    } = req.body;

    alert.currentLocation = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy:
        accuracy === undefined || accuracy === null
          ? null
          : Number(accuracy)
    };

    alert.lastLocationUpdate = new Date();

    await alert.save();

    return res.status(200).json({
      success: true,
      message: "Location updated",
      alert
    });
  } catch (error) {
    console.error(
      "UPDATE ALERT LOCATION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update alert location"
    });
  }
};

const acknowledgeAlert = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID"
      });
    }

    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found"
      });
    }

    if (alert.status === "ACKNOWLEDGED") {
      return res.status(200).json({
        success: true,
        message: "Alert is already acknowledged",
        alert
      });
    }

    if (alert.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message:
          `Only active alerts can be acknowledged. Current status: ${alert.status}`
      });
    }

    alert.status = "ACKNOWLEDGED";

    await alert.save();

    return res.status(200).json({
      success: true,
      message: "Emergency alert acknowledged",
      alert
    });
  } catch (error) {
    console.error(
      "ACKNOWLEDGE ALERT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to acknowledge emergency alert"
    });
  }
};

const respondToAlert = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID"
      });
    }

    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found"
      });
    }

    if (alert.status === "RESPONDING") {
      return res.status(200).json({
        success: true,
        message: "Alert is already marked as responding",
        alert
      });
    }

    if (alert.status !== "ACKNOWLEDGED") {
      return res.status(400).json({
        success: false,
        message:
          `Alert must be acknowledged before responding. Current status: ${alert.status}`
      });
    }

    alert.status = "RESPONDING";

    await alert.save();

    return res.status(200).json({
      success: true,
      message: "Emergency response started",
      alert
    });
  } catch (error) {
    console.error(
      "RESPOND TO ALERT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update emergency response status"
    });
  }
};

const cancelAlert = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID"
      });
    }

    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: {
        $in: [
          "ACTIVE",
          "ACKNOWLEDGED",
          "RESPONDING"
        ]
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Active alert not found"
      });
    }

    alert.status = "CANCELLED";
    alert.cancelledAt = new Date();

    await alert.save();

    return res.status(200).json({
      success: true,
      message: "Emergency alert cancelled",
      alert
    });
  } catch (error) {
    console.error(
      "CANCEL ALERT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to cancel emergency alert"
    });
  }
};

const resolveAlert = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID"
      });
    }

    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: {
        $in: [
          "ACTIVE",
          "ACKNOWLEDGED",
          "RESPONDING"
        ]
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Active alert not found"
      });
    }

    const resolvedAt = new Date();

    alert.status = "RESOLVED";
    alert.resolvedAt = resolvedAt;

    alert.responseTimeSeconds = Math.max(
      0,
      Math.round(
        (
          resolvedAt.getTime() -
          alert.triggeredAt.getTime()
        ) / 1000
      )
    );

    await alert.save();

    return res.status(200).json({
      success: true,
      message: "Emergency alert resolved",
      alert
    });
  } catch (error) {
    console.error(
      "RESOLVE ALERT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to resolve emergency alert"
    });
  }
};

module.exports = {
  createSOSAlert,
  getActiveAlert,
  getAlert,
  updateAlertLocation,
  acknowledgeAlert,
  respondToAlert,
  cancelAlert,
  resolveAlert
};