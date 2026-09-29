const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const EmergencyContact = require("../models/EmergencyContact");

const getContacts = async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({
      user: req.user._id
    }).sort({
      isPrimary: -1,
      createdAt: 1
    });

    return res.status(200).json({
      success: true,
      count: contacts.length,
      contacts
    });
  } catch (error) {
    console.error("GET CONTACTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve emergency contacts"
    });
  }
};

const addContact = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const {
      name,
      phone,
      email,
      relationship,
      isPrimary
    } = req.body;

    const makePrimary = isPrimary === true;

    // If this contact is primary,
    // remove primary status from all other contacts.
    if (makePrimary) {
      await EmergencyContact.updateMany(
        {
          user: req.user._id,
          isPrimary: true
        },
        {
          $set: {
            isPrimary: false
          }
        }
      );
    }

    const contact = await EmergencyContact.create({
      user: req.user._id,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : "",
      relationship: relationship
        ? relationship.trim()
        : "",
      isPrimary: makePrimary,
      isVerified: false
    });

    return res.status(201).json({
      success: true,
      message: "Emergency contact added successfully",
      contact
    });
  } catch (error) {
    console.error("ADD CONTACT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add emergency contact"
    });
  }
};

const updateContact = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    // Prevent invalid MongoDB ObjectId errors.
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid emergency contact ID"
      });
    }

    const contact = await EmergencyContact.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Emergency contact not found"
      });
    }

    const {
      name,
      phone,
      email,
      relationship,
      isPrimary
    } = req.body;

    // If this contact becomes primary,
    // remove primary status from all other contacts.
    if (isPrimary === true) {
      await EmergencyContact.updateMany(
        {
          user: req.user._id,
          _id: {
            $ne: contact._id
          },
          isPrimary: true
        },
        {
          $set: {
            isPrimary: false
          }
        }
      );
    }

    if (name !== undefined) {
      contact.name = name.trim();
    }

    if (phone !== undefined) {
      contact.phone = phone.trim();
    }

    if (email !== undefined) {
      contact.email = email
        ? email.toLowerCase().trim()
        : "";
    }

    if (relationship !== undefined) {
      contact.relationship = relationship.trim();
    }

    if (isPrimary !== undefined) {
      contact.isPrimary = isPrimary === true;
    }

    await contact.save();

    return res.status(200).json({
      success: true,
      message: "Emergency contact updated successfully",
      contact
    });
  } catch (error) {
    console.error("UPDATE CONTACT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update emergency contact"
    });
  }
};

const deleteContact = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid emergency contact ID"
      });
    }

    const contact = await EmergencyContact.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Emergency contact not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Emergency contact deleted successfully"
    });
  } catch (error) {
    console.error("DELETE CONTACT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete emergency contact"
    });
  }
};

module.exports = {
  getContacts,
  addContact,
  updateContact,
  deleteContact
};