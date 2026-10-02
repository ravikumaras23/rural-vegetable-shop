const mongoose = require("mongoose");

const sellerPaymentSettingsSchema =
  new mongoose.Schema(
    {
      seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true
      },

      razorpayEnabled: {
        type: Boolean,
        default: true
      },

      qrEnabled: {
        type: Boolean,
        default: true
      },

      defaultMethod: {
        type: String,
        enum: [
          "razorpay",
          "seller_qr"
        ],
        default: "razorpay"
      },

      upiId: {
        type: String,
        trim: true,
        lowercase: true,
        default: ""
      },

      qrCodeUrl: {
        type: String,
        default: ""
      },

      qrCodePublicId: {
        type: String,
        default: ""
      },

      razorpayKeyId: {
        type: String,
        trim: true,
        default: ""
      },

      razorpaySecretEncrypted: {
        type: String,
        default: ""
      },

      razorpaySecretIv: {
        type: String,
        default: ""
      },

      razorpaySecretAuthTag: {
        type: String,
        default: ""
      }
    },
    {
      timestamps: true,
      versionKey: false
    }
  );

module.exports =
  mongoose.model(
    "SellerPaymentSettings",
    sellerPaymentSettingsSchema
  );