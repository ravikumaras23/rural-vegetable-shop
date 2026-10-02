const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| RESERVATION SCHEMA
|--------------------------------------------------------------------------
*/

const reservationSchema =
  new mongoose.Schema(
    {
      order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
      },

      quantity: {
        type: Number,
        required: true,
        min: 0.001
      },

      expiresAt: {
        type: Date,
        required: true,
        index: true
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| PRODUCT IMAGE SCHEMA
|--------------------------------------------------------------------------
*/

const productImageSchema =
  new mongoose.Schema(
    {
      url: {
        type: String,
        required: true
      },

      publicId: {
        type: String,
        required: true
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| PRODUCT SCHEMA
|--------------------------------------------------------------------------
*/

const productSchema =
  new mongoose.Schema(
    {
      seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      name: {
        type: String,
        required: [
          true,
          "Product name is required"
        ],
        trim: true,
        minlength: 2,
        maxlength: 150,
        index: true
      },

      slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
      },

      description: {
        type: String,
        trim: true,
        maxlength: 2000
      },

      category: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
        index: true
      },

      price: {
        type: Number,
        required: [
          true,
          "Price is required"
        ],
        min: [
          0,
          "Price cannot be negative"
        ]
      },

      unit: {
        type: String,
        required: true,
        enum: [
          "kg",
          "gram",
          "piece",
          "bundle",
          "dozen",
          "litre"
        ]
      },

      stockQuantity: {
        type: Number,
        required: true,
        min: [
          0,
          "Stock cannot be negative"
        ],
        default: 0
      },

      lowStockThreshold: {
        type: Number,
        min: 0,
        default: function () {
          return (
            Number(
              process.env.LOW_STOCK_THRESHOLD
            ) || 10
          );
        }
      },

      harvestDate: {
        type: Date
      },

      isOrganic: {
        type: Boolean,
        default: false
      },

      images: {
        type: [productImageSchema],
        required: true,

        validate: {
          validator:
            function (images) {
              return (
                Array.isArray(images) &&
                images.length >= 1
              );
            },

          message:
            "At least one product image is required"
        }
      },

      status: {
        type: String,

        enum: [
          "pending",
          "approved",
          "rejected",
          "out_of_stock",
          "inactive"
        ],

        default: "pending",
        index: true
      },

      rejectionReason: {
        type: String,
        maxlength: 500
      },

      ratingAverage: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
      },

      ratingCount: {
        type: Number,
        min: 0,
        default: 0
      },

      /*
      |--------------------------------------------------------------------------
      | RESERVED INVENTORY
      |--------------------------------------------------------------------------
      */

      reservedQuantity: {
        type: Number,
        default: 0,
        min: 0
      },

      /*
      |--------------------------------------------------------------------------
      | ACTIVE INVENTORY RESERVATIONS
      |--------------------------------------------------------------------------
      */

      reservations: {
        type: [reservationSchema],
        default: []
      },

      /*
      |--------------------------------------------------------------------------
      | SALES
      |--------------------------------------------------------------------------
      */

      totalSold: {
        type: Number,
        min: 0,
        default: 0
      }
    },

    {
      timestamps: true,
      versionKey: false
    }
  );

/*
|--------------------------------------------------------------------------
| TEXT SEARCH INDEX
|--------------------------------------------------------------------------
*/

productSchema.index({
  name: "text",
  description: "text",
  category: "text"
});

/*
|--------------------------------------------------------------------------
| SELLER + STATUS INDEX
|--------------------------------------------------------------------------
*/

productSchema.index({
  seller: 1,
  status: 1
});

/*
|--------------------------------------------------------------------------
| CATEGORY + STATUS + PRICE INDEX
|--------------------------------------------------------------------------
*/

productSchema.index({
  category: 1,
  status: 1,
  price: 1
});

/*
|--------------------------------------------------------------------------
| NOTE
|--------------------------------------------------------------------------
|
| Do NOT add this index again:
|
| productSchema.index({
|   "reservations.expiresAt": 1
| });
|
| expiresAt already has:
|
| index: true
|
| inside reservationSchema.
|
|--------------------------------------------------------------------------
*/

module.exports =
  mongoose.model(
    "Product",
    productSchema
  );