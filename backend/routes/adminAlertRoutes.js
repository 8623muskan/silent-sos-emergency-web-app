const express = require("express");

const {
  getAllAlerts,
  getActiveAlerts,
  getAlertById,
  acknowledgeAlert,
  respondToAlert,
  resolveAlert
} = require("../controllers/adminAlertController");

const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.use(protect);
router.use(admin);

// Read operations
router.get("/", getAllAlerts);
router.get("/active", getActiveAlerts);

// Admin alert actions
router.patch("/:id/acknowledge", acknowledgeAlert);
router.patch("/:id/respond", respondToAlert);
router.patch("/:id/resolve", resolveAlert);

// Single alert
router.get("/:id", getAlertById);

module.exports = router;