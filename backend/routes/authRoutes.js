const express = require("express");
const { body } = require("express-validator");

const {
  registerUser,
  loginUser,
  getCurrentUser
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/register",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters"),

    body("email")
      .trim()
      .isEmail()
      .withMessage("A valid email is required")
      .normalizeEmail(),

    body("phone")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required"),

    body("password")
      .isString()
      .isLength({ min: 8 })
      .withMessage("Password must contain at least 8 characters")
  ],
  registerUser
);

router.post(
  "/login",
  [
    body("email")
      .trim()
      .isEmail()
      .withMessage("A valid email is required")
      .normalizeEmail(),

    body("password")
      .isString()
      .notEmpty()
      .withMessage("Password is required")
  ],
  loginUser
);

router.get(
  "/me",
  protect,
  getCurrentUser
);

module.exports = router;
