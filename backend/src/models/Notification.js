const mongoose = require("mongoose");

const NOTIFICATION_ROLES = [
  "customer",
  "seller",
  "admin"
];

const NOTIFICATION_TYPES = [
  "SELLER_REGISTERED",

  "ORDER_CREATED",
  "NEW_SELLER_ORDER",

  "PAYMENT_SUBMITTED",
  "PAYMENT_VERIFIED",
  "PAYMENT_REJECTED",

  "SELLER_APPROVED",
  "SELLER_REJECTED",
  "SELLER_ACTIVATED",
  "SELLER_DEACTIVATED",
  "SELLER_ACCOUNT_ACTIVATED",
  "SELLER_ACCOUNT_DEACTIVATED",

  "ORDER_STATUS_UPDATED",
  "ORDER_CANCELLED",

  "LOW_STOCK",

  "DELIVERY_CODE",

  "PRODUCT_ACTIVATED",
  "PRODUCT_APPROVED",
  "PRODUCT_REJECTED",
  "PRODUCT_DEACTIVATED"
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    role: {
      type: String,
      required: true,
      enum: NOTIFICATION_ROLES,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },

    type: {
      type: String,
      required: true,
      enum: NOTIFICATION_TYPES,
      index: true
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true
    },

    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false
    },

    versionKey: false
  }
);

notificationSchema.index({
  recipient: 1,
  createdAt: -1
});

notificationSchema.index({
  recipient: 1,
  isRead: 1,
  createdAt: -1
});

notificationSchema.index({
  role: 1,
  createdAt: -1
});

notificationSchema.index({
  type: 1,
  createdAt: -1
});

module.exports =
  mongoose.model(
    "Notification",
    notificationSchema
  );

module.exports.NOTIFICATION_ROLES =
  NOTIFICATION_ROLES;

module.exports.NOTIFICATION_TYPES =
  NOTIFICATION_TYPES;