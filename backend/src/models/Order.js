const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| ORDER ITEM SCHEMA
|--------------------------------------------------------------------------
|
| Stores a snapshot of the product at the time the order is created.
|
*/

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    productName: {
      type: String,
      required: true,
      trim: true
    },

    productImage: {
      type: String,
      trim: true,
      default: ""
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.001
    },

    unit: {
      type: String,
      required: true,
      trim: true
    },

    priceAtPurchase: {
      type: Number,
      required: true,
      min: 0
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| SELLER PAYMENT SCHEMA
|--------------------------------------------------------------------------
|
| For a multi-seller order, each seller gets a separate payment record.
|
| Example:
|
| Seller A = ₹450
| Seller B = ₹350
|
| The customer's order therefore contains two seller payment records.
|
*/

const sellerPaymentSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    /*
    |--------------------------------------------------------------------------
    | Payment method used for this seller
    |--------------------------------------------------------------------------
    */

    paymentMethod: {
      type: String,
      enum: [
        "razorpay",
        "seller_qr"
      ],
      required: true
    },

    /*
    |--------------------------------------------------------------------------
    | Payment status
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: [
        "pending",
        "submitted",
        "paid",
        "failed",
        "refunded"
      ],
      default: "pending",
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | Seller payment snapshot
    |--------------------------------------------------------------------------
    |
    | These values are copied when the order is created.
    |
    | If seller changes UPI ID later, an existing order still keeps
    | the original payment destination.
    |
    */

    upiIdSnapshot: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },

    qrImageSnapshot: {
      type: String,
      trim: true,
      default: ""
    },

    /*
    |--------------------------------------------------------------------------
    | Customer payment reference
    |--------------------------------------------------------------------------
    |
    | UTR / transaction ID entered by customer after scanning QR.
    |
    */

    transactionReference: {
      type: String,
      trim: true,
      default: ""
    },

    submittedAt: {
      type: Date,
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | Seller verification
    |--------------------------------------------------------------------------
    */

    verifiedAt: {
      type: Date,
      default: null
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | Optional rejection reason
    |--------------------------------------------------------------------------
    */

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    }
  }
);

/*
|--------------------------------------------------------------------------
| ORDER SCHEMA
|--------------------------------------------------------------------------
*/

const orderSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | ORDER NUMBER
    |--------------------------------------------------------------------------
    */

    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER
    |--------------------------------------------------------------------------
    */

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | ORDER ITEMS
    |--------------------------------------------------------------------------
    */

    items: {
      type: [orderItemSchema],

      required: true,

      validate: {
        validator: function (items) {
          return (
            Array.isArray(items) &&
            items.length > 0
          );
        },

        message:
          "Order must contain at least one item"
      }
    },

    /*
    |--------------------------------------------------------------------------
    | SHIPPING ADDRESS
    |--------------------------------------------------------------------------
    */

    shippingAddress: {
      name: {
        type: String,
        required: true,
        trim: true
      },

      phone: {
        type: String,
        required: true,
        trim: true
      },

      addressLine1: {
        type: String,
        required: true,
        trim: true
      },

      addressLine2: {
        type: String,
        trim: true,
        default: ""
      },

      village: {
        type: String,
        trim: true,
        default: ""
      },

      district: {
        type: String,
        trim: true,
        default: ""
      },

      state: {
        type: String,
        trim: true,
        default: ""
      },

      pincode: {
        type: String,
        required: true,
        trim: true,
        match: /^[0-9]{6}$/
      }
    },

    /*
    |--------------------------------------------------------------------------
    | FINANCIAL INFORMATION
    |--------------------------------------------------------------------------
    */

    subtotal: {
      type: Number,
      required: true,
      min: 0
    },

    deliveryCharge: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    /*
    |--------------------------------------------------------------------------
    | PAYMENT METHOD
    |--------------------------------------------------------------------------
    */

    paymentMethod: {
      type: String,

      enum: [
        "cod",
        "razorpay",
        "seller_qr"
      ],

      required: true,

      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | PAYMENT STATUS
    |--------------------------------------------------------------------------
    */

    paymentStatus: {
      type: String,

      enum: [
        "pending",
        "partially_paid",
        "paid",
        "failed",
        "refunded"
      ],

      default: "pending",

      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | PER-SELLER PAYMENT RECORDS
    |--------------------------------------------------------------------------
    */

    sellerPayments: {
      type: [sellerPaymentSchema],

      default: []
    },

    /*
    |--------------------------------------------------------------------------
    | ORDER STATUS
    |--------------------------------------------------------------------------
    */

    orderStatus: {
      type: String,

      enum: [
        "pending",
        "confirmed",
        "processing",
        "packed",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned"
      ],

      default: "pending",

      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | RAZORPAY INFORMATION
    |--------------------------------------------------------------------------
    */

    razorpay: {
      orderId: {
        type: String,
        trim: true,
        default: null
      },

      paymentId: {
        type: String,
        trim: true,
        default: null
      },

      signature: {
        type: String,
        trim: true,
        default: null
      }
    },

    /*
    |--------------------------------------------------------------------------
    | PAYMENT EXPIRY
    |--------------------------------------------------------------------------
    |
    | Used for:
    |
    | Razorpay payment timeout
    | Seller QR payment timeout
    |
    */

    paymentExpiresAt: {
      type: Date,
      default: null,
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | INVENTORY LIFECYCLE
    |--------------------------------------------------------------------------
    |
    | pending
    |   Order created but inventory transaction not completed.
    |
    | reserved
    |   Inventory temporarily held.
    |
    | committed
    |   Inventory permanently deducted.
    |
    | released
    |   Previous reservation released.
    |
    */

    inventoryStatus: {
      type: String,

      enum: [
        "pending",
        "reserved",
        "committed",
        "released"
      ],

      default: "pending",

      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | LEGACY INVENTORY FLAGS
    |--------------------------------------------------------------------------
    |
    | These are retained because some of your existing controllers/services
    | already use them.
    |
    */

    inventoryReserved: {
      type: Boolean,
      default: false
    },

    inventoryReleased: {
      type: Boolean,
      default: false
    },

    /*
    |--------------------------------------------------------------------------
    | REFUND LIFECYCLE
    |--------------------------------------------------------------------------
    */

    refundStatus: {
      type: String,

      enum: [
        "not_required",
        "pending",
        "processing",
        "processed",
        "failed"
      ],

      default: "not_required",

      index: true
    },

    refundId: {
      type: String,
      trim: true,
      default: ""
    },

    refundedAt: {
      type: Date,
      default: null
    },

    refundError: {
      type: String,
      maxlength: 1000,
      trim: true,
      default: ""
    },

    /*
    |--------------------------------------------------------------------------
    | CANCELLATION
    |--------------------------------------------------------------------------
    */

    cancellationReason: {
      type: String,
      maxlength: 500,
      trim: true,
      default: ""
    },

    cancelledAt: {
      type: Date,
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | DELIVERY
    |--------------------------------------------------------------------------
    */

    deliveredAt: {
      type: Date,
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | DELIVERY VERIFICATION
    |--------------------------------------------------------------------------
    */

    deliveryCodeHash: {
      type: String,
      default: null,
      select: false
    },

    deliveryCodeExpiresAt: {
      type: Date,
      default: null,
      index: true
    },

    deliveryCodeAttempts: {
      type: Number,
      default: 0,
      min: 0
    },

    deliveryCodeGeneratedAt: {
      type: Date,
      default: null
    },

    deliveryCodeVerifiedAt: {
      type: Date,
      default: null
    },

    deliveryCodeIssuedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
| INDEXES
|--------------------------------------------------------------------------
*/

/*
| Customer order history
*/

orderSchema.index({
  customer: 1,
  createdAt: -1
});

/*
| Seller order lookup
*/

orderSchema.index({
  "items.seller": 1,
  createdAt: -1
});

/*
| Payment timeout worker
*/

orderSchema.index({
  paymentStatus: 1,
  paymentExpiresAt: 1
});

/*
| Inventory state lookup
*/

orderSchema.index({
  inventoryStatus: 1,
  paymentStatus: 1
});

/*
| Razorpay order lookup
*/

orderSchema.index({
  "razorpay.orderId": 1
});

/*
| Seller payment lookup
*/

orderSchema.index({
  "sellerPayments.seller": 1
});

/*
|--------------------------------------------------------------------------
| PRE-VALIDATION SAFETY
|--------------------------------------------------------------------------
|
| Prevent obviously invalid combinations.
|
| IMPORTANT:
| This middleware intentionally does NOT use `next`.
| It is an async document middleware and throws an Error when
| validation should fail.
|
*/

orderSchema.pre(
  "validate",
  async function () {

    /*
    |--------------------------------------------------------------------------
    | Razorpay
    |--------------------------------------------------------------------------
    */

    if (
      this.paymentMethod === "razorpay"
    ) {

      if (
        this.paymentStatus === "partially_paid"
      ) {

        throw new Error(
          "Razorpay orders cannot have partially_paid status"
        );

      }

    }

    /*
    |--------------------------------------------------------------------------
    | Seller QR
    |--------------------------------------------------------------------------
    */

    if (
      this.paymentMethod === "seller_qr"
    ) {

      if (
        !Array.isArray(
          this.sellerPayments
        ) ||
        this.sellerPayments.length === 0
      ) {

        throw new Error(
          "Seller QR orders must contain seller payment records"
        );

      }

    }

    /*
    |--------------------------------------------------------------------------
    | COD
    |--------------------------------------------------------------------------
    |
    | COD does not require seller QR records.
    |
    */

    if (
      this.paymentMethod === "cod"
    ) {

      // No additional validation required.

    }

  }
);

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports =
  mongoose.model(
    "Order",
    orderSchema
  );