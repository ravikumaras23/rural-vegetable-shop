const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/*
|--------------------------------------------------------------------------
| ADDRESS SCHEMA
|--------------------------------------------------------------------------
*/
const addressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250
    },
    addressLine2: {
      type: String,
      trim: true,
      default: "",
      maxlength: 250
    },
    village: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    },
    district: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    },
    state: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{6}$/
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

/*
|--------------------------------------------------------------------------
| SELLER PAYMENT SETTINGS
|--------------------------------------------------------------------------
*/
const sellerPaymentSettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true
    },
    method: {
      type: String,
      enum: ["seller_qr", "razorpay"],
      default: "seller_qr"
    },
    upiId: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 150,
      default: ""
    },
    qrCodeUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    }
  },
  { _id: false }
);

/*
|--------------------------------------------------------------------------
| USER SCHEMA
|--------------------------------------------------------------------------
*/
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      maxlength: 150
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    role: {
      type: String,
      enum: ["admin", "seller", "customer"],
      default: "customer",
      index: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    sellerProfile: {
      farmName: {
        type: String,
        trim: true,
        default: "",
        maxlength: 150
      },
      farmDescription: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1000
      },
      village: {
        type: String,
        trim: true,
        default: "",
        maxlength: 100
      },
      district: {
        type: String,
        trim: true,
        default: "",
        maxlength: 100
      },
      state: {
        type: String,
        trim: true,
        default: "",
        maxlength: 100
      },
      approvalStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
        index: true
      },
      approvedAt: {
        type: Date,
        default: null
      },
      rejectedAt: {
        type: Date,
        default: null
      },
      rejectionReason: {
        type: String,
        trim: true,
        default: "",
        maxlength: 500
      },
      paymentSettings: {
        type: sellerPaymentSettingsSchema,
        default: () => ({})
      }
    },

    addresses: {
      type: [addressSchema],
      default: []
    },

    avatar: {
      type: String,
      trim: true,
      default: ""
    },

    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

/*
|--------------------------------------------------------------------------
| HASH PASSWORD
|--------------------------------------------------------------------------
*/
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

/*
|--------------------------------------------------------------------------
| COMPARE PASSWORD
|--------------------------------------------------------------------------
*/
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/*
|--------------------------------------------------------------------------
| HIDE PASSWORD IN JSON
|--------------------------------------------------------------------------
*/
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model("User", userSchema);
