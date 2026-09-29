const express = require("express");
const { body } = require("express-validator");

const {
  getContacts,
  addContact,
  updateContact,
  deleteContact
} = require("../controllers/contactController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// GET all emergency contacts
router.get("/", getContacts);

// ADD emergency contact
router.post(
  "/",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Contact name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Contact name must be between 2 and 100 characters"),

    body("phone")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required")
      .isLength({ max: 30 })
      .withMessage("Phone number is too long"),

    body("email")
      .optional({ values: "falsy" })
      .trim()
      .isEmail()
      .withMessage("Email must be valid"),

    body("relationship")
      .optional({ values: "falsy" })
      .trim()
      .isLength({ max: 50 })
      .withMessage("Relationship is too long"),

    body("isPrimary")
      .optional()
      .isBoolean()
      .withMessage("isPrimary must be true or false")
  ],
  addContact
);

// UPDATE emergency contact
router.put(
  "/:id",
  [
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Contact name cannot be empty")
      .isLength({ min: 2, max: 100 })
      .withMessage("Contact name must be between 2 and 100 characters"),

    body("phone")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Phone number cannot be empty")
      .isLength({ max: 30 })
      .withMessage("Phone number is too long"),

    body("email")
      .optional({ values: "falsy" })
      .trim()
      .isEmail()
      .withMessage("Email must be valid"),

    body("relationship")
      .optional({ values: "falsy" })
      .trim()
      .isLength({ max: 50 })
      .withMessage("Relationship is too long"),

    body("isPrimary")
      .optional()
      .isBoolean()
      .withMessage("isPrimary must be true or false")
  ],
  updateContact
);

// DELETE emergency contact
router.delete("/:id", deleteContact);

module.exports = router;