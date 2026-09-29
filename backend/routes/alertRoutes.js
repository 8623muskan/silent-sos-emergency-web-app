const express = require("express");
const { body } = require("express-validator");

const {
  createSOSAlert,
  getActiveAlert,
  getAlert,
  updateAlertLocation,
  acknowledgeAlert,
  respondToAlert,
  cancelAlert,
  resolveAlert
} = require("../controllers/alertController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

const locationValidation = [
  body("latitude")
    .exists()
    .withMessage("Latitude is required")
    .isFloat({
      min: -90,
      max: 90
    })
    .withMessage(
      "Latitude must be between -90 and 90"
    ),

  body("longitude")
    .exists()
    .withMessage("Longitude is required")
    .isFloat({
      min: -180,
      max: 180
    })
    .withMessage(
      "Longitude must be between -180 and 180"
    ),

  body("accuracy")
    .optional({
      nullable: true
    })
    .isFloat({
      min: 0
    })
    .withMessage(
      "Accuracy must be a positive number"
    )
];

router.post(
  "/sos",
  locationValidation,
  createSOSAlert
);

router.get(
  "/active",
  getActiveAlert
);

router.get(
  "/:id",
  getAlert
);

router.patch(
  "/:id/location",
  locationValidation,
  updateAlertLocation
);

router.patch(
  "/:id/acknowledge",
  acknowledgeAlert
);

router.patch(
  "/:id/respond",
  respondToAlert
);

router.patch(
  "/:id/cancel",
  cancelAlert
);

router.patch(
  "/:id/resolve",
  resolveAlert
);

module.exports = router;