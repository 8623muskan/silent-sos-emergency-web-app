const Alert = require("../models/Alert");

const ACTIVE_STATUSES = [
  "ACTIVE",
  "ACKNOWLEDGED",
  "RESPONDING"
];

const getAllAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate("user", "name email phone")
      .sort({ triggeredAt: -1 });

    return res.status(200).json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error("ADMIN GET ALL ALERTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load alerts"
    });
  }
};

const getActiveAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({
      status: { $in: ACTIVE_STATUSES }
    })
      .populate("user", "name email phone")
      .sort({ triggeredAt: -1 });

    return res.status(200).json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error("ADMIN GET ACTIVE ALERTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load active alerts"
    });
  }
};

const getAlertById = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate("user", "name email phone");

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
    console.error("ADMIN GET ALERT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load alert"
    });
  }
};

/*
 * ADMIN ACKNOWLEDGE ALERT
 * ACTIVE -> ACKNOWLEDGED
 */
const acknowledgeAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate("user", "name email phone");

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found"
      });
    }

    if (alert.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: `Alert cannot be acknowledged from ${alert.status} status`
      });
    }

    alert.status = "ACKNOWLEDGED";
    alert.acknowledgedAt = new Date();

    if (alert.triggeredAt) {
      alert.responseTimeSeconds = Math.max(
        0,
        Math.round(
          (alert.acknowledgedAt.getTime() -
            alert.triggeredAt.getTime()) /
            1000
        )
      );
    }

    await alert.save();

    return res.status(200).json({
      success: true,
      message: "Alert acknowledged successfully",
      alert
    });
  } catch (error) {
    console.error("ADMIN ACKNOWLEDGE ALERT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to acknowledge alert"
    });
  }
};

/*
 * ADMIN RESPOND TO ALERT
 * ACKNOWLEDGED -> RESPONDING
 *
 * Also allows ACTIVE -> RESPONDING so an administrator
 * can respond directly if necessary.
 */
const respondToAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate("user", "name email phone");

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found"
      });
    }

    if (
      alert.status !== "ACKNOWLEDGED" &&
      alert.status !== "ACTIVE"
    ) {
      return res.status(400).json({
        success: false,
        message: `Alert cannot be marked responding from ${alert.status} status`
      });
    }

    alert.status = "RESPONDING";

    await alert.save();

    return res.status(200).json({
      success: true,
      message: "Response started successfully",
      alert
    });
  } catch (error) {
    console.error("ADMIN RESPOND ALERT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to respond to alert"
    });
  }
};

/*
 * ADMIN RESOLVE ALERT
 * RESPONDING -> RESOLVED
 *
 * Also accepts ACTIVE / ACKNOWLEDGED so an administrator
 * can resolve an alert directly when required.
 */
const resolveAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate("user", "name email phone");

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found"
      });
    }

    if (
      alert.status !== "ACTIVE" &&
      alert.status !== "ACKNOWLEDGED" &&
      alert.status !== "RESPONDING"
    ) {
      return res.status(400).json({
        success: false,
        message: `Alert cannot be resolved from ${alert.status} status`
      });
    }

    alert.status = "RESOLVED";
    alert.resolvedAt = new Date();

    await alert.save();

    return res.status(200).json({
      success: true,
      message: "Alert resolved successfully",
      alert
    });
  } catch (error) {
    console.error("ADMIN RESOLVE ALERT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resolve alert"
    });
  }
};

module.exports = {
  getAllAlerts,
  getActiveAlerts,
  getAlertById,
  acknowledgeAlert,
  respondToAlert,
  resolveAlert
};