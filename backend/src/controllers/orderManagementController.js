
const mongoose = require("mongoose");
const crypto = require("crypto");

const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const asyncHandler =
  require("../utils/asyncHandler");

const {
  notifyUser,
  notifyUsers
} = require("../services/notificationService");

const {
  releaseInventory
} = require("../services/inventoryService");

/*
|--------------------------------------------------------------------------
| VALIDATE OBJECT ID
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/*
|--------------------------------------------------------------------------
| DELIVERY VERIFICATION CODE
|--------------------------------------------------------------------------
*/

const DELIVERY_CODE_EXPIRY_MINUTES = Math.max(
  Number(
    process.env.DELIVERY_CODE_EXPIRY_MINUTES
  ) || 15,
  1
);

const DELIVERY_CODE_MAX_ATTEMPTS = Math.max(
  Number(
    process.env.DELIVERY_CODE_MAX_ATTEMPTS
  ) || 5,
  1
);

const getDeliveryCodeSecret = () => {
  const secret =
    process.env.DELIVERY_CODE_SECRET ||
    process.env.JWT_SECRET ||
    process.env.JWT_SECRET_KEY;

  if (!secret) {
    throw new Error(
      "DELIVERY_CODE_SECRET or JWT_SECRET must be configured."
    );
  }

  return secret;
};

const generateDeliveryCode = () => {
  return String(
    crypto.randomInt(
      100000,
      1000000
    )
  );
};

const hashDeliveryCode = (
  code
) => {
  return crypto
    .createHmac(
      "sha256",
      getDeliveryCodeSecret()
    )
    .update(
      String(code)
    )
    .digest("hex");
};

const verifyDeliveryCode = (
  code,
  storedHash
) => {
  if (
    !storedHash ||
    !/^[0-9]{6}$/.test(
      String(code || "").trim()
    )
  ) {
    return false;
  }

  const candidateHash =
    Buffer.from(
      hashDeliveryCode(
        String(code).trim()
      ),
      "utf8"
    );

  const actualHash =
    Buffer.from(
      String(storedHash),
      "utf8"
    );

  if (
    candidateHash.length !==
    actualHash.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    candidateHash,
    actualHash
  );
};

/*
|--------------------------------------------------------------------------
| ORDER STATUS TRANSITIONS
|--------------------------------------------------------------------------
*/

const allowedTransitions = {
  pending: [
    "confirmed",
    "cancelled"
  ],

  confirmed: [
    "processing",
    "cancelled"
  ],

  processing: [
    "packed",
    "cancelled"
  ],

  packed: [
    "out_for_delivery"
  ],

  out_for_delivery: [
    "delivered"
  ],

  delivered: [
    "returned"
  ],

  cancelled: [],

  returned: [],

  unknown: []
};

/*
|--------------------------------------------------------------------------
| SELLER STATUS OPTIONS
|--------------------------------------------------------------------------
*/

const sellerAllowedStatuses = [
  "confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivered"
];

/*
|--------------------------------------------------------------------------
| ADMIN STATUS OPTIONS
|--------------------------------------------------------------------------
*/

const adminAllowedStatuses = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned"
];

/*
|--------------------------------------------------------------------------
| CHECK STATUS TRANSITION
|--------------------------------------------------------------------------
*/

const canTransition = (
  currentStatus,
  nextStatus
) => {
  const allowed =
    allowedTransitions[
      currentStatus
    ] || [];

  return allowed.includes(
    nextStatus
  );
};

/*
|--------------------------------------------------------------------------
| INDIA DATE KEY
|--------------------------------------------------------------------------
|
| Returns YYYY-MM-DD using Asia/Kolkata.
|
|--------------------------------------------------------------------------
*/

const getIndiaDateKey = (
  date = new Date()
) => {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Asia/Kolkata",

      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(date);
};

/*
|--------------------------------------------------------------------------
| HARVEST DATE KEY
|--------------------------------------------------------------------------
*/

const getHarvestDateKey = (
  harvestDate
) => {
  if (!harvestDate) {
    return null;
  }

  const date =
    new Date(
      harvestDate
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return getIndiaDateKey(
    date
  );
};

/*
|--------------------------------------------------------------------------
| FORMAT HARVEST DATE
|--------------------------------------------------------------------------
*/

const formatHarvestDate = (
  harvestDate
) => {
  const date =
    new Date(
      `${harvestDate}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return harvestDate;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  );
};

/*
|--------------------------------------------------------------------------
| CHECK FUTURE HARVEST PRODUCTS
|--------------------------------------------------------------------------
|
| IMPORTANT BUSINESS RULE:
|
| Sellers may confirm and process an order even if the harvest date
| is in the future.
|
| Sellers cannot pack the order until every product belonging to
| that seller has reached its harvest date.
|
|--------------------------------------------------------------------------
*/

const checkSellerCanPack = ({
  order,
  sellerId
}) => {
  const sellerIdString =
    sellerId.toString();

  const sellerItems =
    order.items.filter(
      (item) => {
        const itemSellerId =
          item.seller?._id
            ? item.seller._id.toString()
            : item.seller?.toString();

        return (
          itemSellerId ===
          sellerIdString
        );
      }
    );

  if (
    sellerItems.length === 0
  ) {
    return {
      allowed: false,

      message:
        "You do not have any products in this order."
    };
  }

  const todayKey =
    getIndiaDateKey();

  for (
    const item of sellerItems
  ) {
    const product =
      item.product;

    if (!product) {
      return {
        allowed: false,

        message:
          `"${item.productName}" could not be found.`
      };
    }

    const harvestDateKey =
      getHarvestDateKey(
        product.harvestDate
      );

    /*
    |--------------------------------------------------------------------------
    | No harvest date
    |--------------------------------------------------------------------------
    |
    | No date means there is no harvest restriction.
    |
    |--------------------------------------------------------------------------
    */

    if (!harvestDateKey) {
      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | FUTURE HARVEST
    |--------------------------------------------------------------------------
    */

    if (
      harvestDateKey >
      todayKey
    ) {
      return {
        allowed: false,

        harvestDate:
          harvestDateKey,

        message:
          `"${item.productName}" is scheduled to be harvested on ${formatHarvestDate(
            harvestDateKey
          )}. You can process the order, but you cannot pack it until the harvest date.`
      };
    }
  }

  return {
    allowed: true
  };
};

/*
|--------------------------------------------------------------------------
| GET SELLER ORDERS
|--------------------------------------------------------------------------
|
| GET /api/order-management/seller
|--------------------------------------------------------------------------
*/

const getSellerOrders =
  asyncHandler(
    async (req, res) => {
      const {
        status,
        page = 1,
        limit = 10
      } = req.query;

      const currentPage =
        Math.max(
          Number(page),
          1
        );

      const currentLimit =
        Math.min(
          Math.max(
            Number(limit),
            1
          ),
          50
        );

      const allowedStatuses = [
        "pending",
        "confirmed",
        "processing",
        "packed",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned"
      ];

      if (
        status &&
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order status"
        });
      }

      const query = {
        "items.seller":
          req.user._id
      };

      if (status) {
        query.orderStatus =
          status;
      }

      const skip =
        (currentPage - 1) *
        currentLimit;

      const [
        orders,
        total
      ] =
        await Promise.all([
          Order.find(query)
            .populate(
              "customer",
              "name email phone"
            )
            .populate(
              "items.product",
              "name slug images unit harvestDate status stockQuantity"
            )
            .populate(
              "items.seller",
              "name email sellerProfile.businessName"
            )
            .sort({
              createdAt: -1
            })
            .skip(skip)
            .limit(
              currentLimit
            )
            .lean(),

          Order.countDocuments(
            query
          )
        ]);

      const sellerId =
        req.user._id.toString();

      const sellerOrders =
        orders.map(
          (order) => ({
            ...order,

            items:
              order.items.filter(
                (item) => {
                  const itemSellerId =
                    item.seller?._id
                      ? item.seller._id.toString()
                      : item.seller?.toString();

                  return (
                    itemSellerId ===
                    sellerId
                  );
                }
              )
          })
        );

      return res.status(200).json({
        success: true,

        data:
          sellerOrders,

        pagination: {
          page:
            currentPage,

          limit:
            currentLimit,

          total,

          pages:
            Math.ceil(
              total /
                currentLimit
            )
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| GET SELLER ORDER DETAILS
|--------------------------------------------------------------------------
|
| GET /api/order-management/seller/:id
|--------------------------------------------------------------------------
*/

const getSellerOrderById =
  asyncHandler(
    async (req, res) => {
      const { id } =
        req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID"
        });
      }

      const order =
        await Order.findOne({
          _id: id,

          "items.seller":
            req.user._id
        }).select(
          "+deliveryCodeHash"
        )
          .populate(
            "customer",
            "name email phone"
          )
          .populate(
            "items.product",
            "name slug images unit harvestDate status stockQuantity"
          )
          .populate(
            "items.seller",
            "name email sellerProfile.businessName"
          );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found"
        });
      }

      const sellerId =
        req.user._id.toString();

      const orderObject =
        order.toObject();

      orderObject.items =
        orderObject.items.filter(
          (item) => {
            const itemSellerId =
              item.seller?._id
                ? item.seller._id.toString()
                : item.seller?.toString();

            return (
              itemSellerId ===
              sellerId
            );
          }
        );

      if (orderObject) {
        delete orderObject.deliveryCodeHash;
        delete orderObject.deliveryCodeIssuedTo;
      }

      return res.status(200).json({
        success: true,
        data:
          orderObject
      });
    }
  );

/*
|--------------------------------------------------------------------------
| UPDATE SELLER ORDER STATUS
|--------------------------------------------------------------------------
|
| PATCH /api/order-management/seller/:id/status
|--------------------------------------------------------------------------
*/

const updateSellerOrderStatus =
  asyncHandler(
    async (req, res) => {
      const { id } =
        req.params;

      const { status } =
        req.body;

      /*
      |--------------------------------------------------------------------------
      | VALIDATE ORDER ID
      |--------------------------------------------------------------------------
      */

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE STATUS
      |--------------------------------------------------------------------------
      */

      if (
        !sellerAllowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid seller order status"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | FIND SELLER ORDER
      |--------------------------------------------------------------------------
      |
      | Populate harvestDate because it is needed before packing.
      |
      |--------------------------------------------------------------------------
      */

      const order =
        await Order.findOne({
          _id: id,

          "items.seller":
            req.user._id
        })
          /*
          |--------------------------------------------------------------------------
          | IMPORTANT
          |--------------------------------------------------------------------------
          |
          | deliveryCodeHash has select:false in Order.js.
          |
          | We MUST explicitly request it here because this endpoint
          | verifies the customer's 6-digit delivery code.
          |
          |--------------------------------------------------------------------------
          */
          .select(
            "+deliveryCodeHash"
          )
          .populate(
            "customer",
            "name email phone"
          )
          .populate(
            "items.product",
            "name slug images unit harvestDate status stockQuantity"
          )
          .populate(
            "items.seller",
            "name email sellerProfile.businessName"
          );
      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found or you do not have access to it"
        });
      }

      const previousStatus =
        order.orderStatus;

      /*
      |--------------------------------------------------------------------------
      | SAME STATUS
      |--------------------------------------------------------------------------
      */

      if (
        previousStatus ===
        status
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Order is already "${status}"`
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE TRANSITION
      |--------------------------------------------------------------------------
      */

      if (
        !canTransition(
          previousStatus,
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Cannot change order status from "${previousStatus}" to "${status}"`
        });
      }

      /*
      |--------------------------------------------------------------------------
      | PACKING HARVEST VALIDATION
      |--------------------------------------------------------------------------
      |
      | Processing is allowed.
      |
      | Processing → Packed is allowed ONLY after all seller products
      | have reached their harvest date.
      |
      |--------------------------------------------------------------------------
      */

      if (
        status === "packed"
      ) {
        const packingCheck =
          checkSellerCanPack({
            order,

            sellerId:
              req.user._id
          });

        if (
          !packingCheck.allowed
        ) {
          return res.status(400).json({
            success: false,

            code:
              "HARVEST_NOT_READY",

            message:
              packingCheck.message,

            harvestDate:
              packingCheck.harvestDate ||
              null
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | SAFETY CHECK BEFORE SHIPPING/DELIVERY
      |--------------------------------------------------------------------------
      |
      | This prevents a malicious request from bypassing "packed".
      |
      |--------------------------------------------------------------------------
      */

      if (
        [
          "out_for_delivery",
          "delivered"
        ].includes(
          status
        )
      ) {
        const packingCheck =
          checkSellerCanPack({
            order,

            sellerId:
              req.user._id
          });

        if (
          !packingCheck.allowed
        ) {
          return res.status(400).json({
            success: false,

            code:
              "HARVEST_NOT_READY",

            message:
              packingCheck.message,

            harvestDate:
              packingCheck.harvestDate ||
              null
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | DELIVERY VERIFICATION
      |--------------------------------------------------------------------------
      */

      const submittedDeliveryCode =
        String(
          req.body?.deliveryCode || ""
        ).trim();

      /*
      | Generate a fresh 6-digit code when the seller starts delivery.
      | Only the hash is stored on the Order document.
      */

      if (
        status ===
        "out_for_delivery"
      ) {

        const deliveryCode =
          generateDeliveryCode();

        order.deliveryCodeHash =
          hashDeliveryCode(
            deliveryCode
          );

        order.deliveryCodeExpiresAt =
          new Date(
            Date.now() +
              DELIVERY_CODE_EXPIRY_MINUTES *
                60 *
                1000
          );

        order.deliveryCodeAttempts =
          0;

        order.deliveryCodeGeneratedAt =
          new Date();

        order.deliveryCodeVerifiedAt =
          null;

        order.deliveryCodeIssuedTo =
          order.customer?._id ||
          order.customer;

        try {

          await notifyUser({

            req,

            recipient:
              order.customer?._id ||
              order.customer,

            role:
              "customer",

            type:
              "DELIVERY_CODE",

            title:
              "🔐 Delivery verification code",

            message:
              `Your 6-digit delivery verification code for order ${order.orderNumber} is ${deliveryCode}. Please share this code with the seller only after your order has been physically delivered.`,

            metadata: {

              orderId:
                String(
                  order._id
                ),

              orderNumber:
                order.orderNumber,

              purpose:
                "delivery_verification",

              expiresAt:
                order.deliveryCodeExpiresAt,

              action:
                "verify_delivery"
            }

          });

          console.log(
            "DELIVERY CODE NOTIFICATION SENT:",
            {
              customerId:
                String(
                  order.customer?._id ||
                  order.customer
                ),

              orderId:
                String(
                  order._id
                ),

              orderNumber:
                order.orderNumber,

              type:
                "DELIVERY_CODE"
            }
          );

        } catch (
          notificationError
        ) {

          console.error(
            "Delivery code notification failed:",
            notificationError
          );

          return res.status(500).json({

            success:
              false,

            message:
              "Unable to send the delivery verification code to the customer. The order was not moved to out_for_delivery."

          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | REQUIRE CODE BEFORE DELIVERED
      |--------------------------------------------------------------------------
      */

      if (
        status ===
        "delivered"
      ) {
        if (
          !submittedDeliveryCode
        ) {
          return res.status(400).json({
            success: false,

            code:
              "DELIVERY_CODE_REQUIRED",

            message:
              "Enter the 6-digit delivery verification code provided by the customer."
          });
        }

        if (
          !/^[0-9]{6}$/.test(
            submittedDeliveryCode
          )
        ) {
          return res.status(400).json({
            success: false,

            code:
              "INVALID_DELIVERY_CODE",

            message:
              "Delivery verification code must contain exactly 6 digits."
          });
        }

        const attempts =
          Number(
            order.deliveryCodeAttempts ||
              0
          );

        if (
          attempts >=
          DELIVERY_CODE_MAX_ATTEMPTS
        ) {
          return res.status(429).json({
            success: false,

            code:
              "DELIVERY_CODE_LOCKED",

            message:
              "Delivery verification is locked after too many incorrect attempts. Contact an administrator."
          });
        }

        if (
          !order.deliveryCodeHash ||
          !order.deliveryCodeExpiresAt
        ) {
          return res.status(400).json({
            success: false,

            code:
              "DELIVERY_CODE_NOT_AVAILABLE",

            message:
              "No active delivery verification code exists for this order."
          });
        }

        /*
        |--------------------------------------------------------------------------
        | EXPIRED CODE
        |--------------------------------------------------------------------------
        |
        | If the customer code has expired:
        |
        | 1. Generate a NEW 6-digit code.
        | 2. Replace the old hash.
        | 3. Reset the expiry time.
        | 4. Reset failed attempts.
        | 5. Save the new code information.
        | 6. Send the NEW code to the customer notification.
        | 7. Keep the order as "out_for_delivery".
        | 8. Tell the seller to use the newly sent code.
        |
        |--------------------------------------------------------------------------
        */

        if (
          new Date(
            order.deliveryCodeExpiresAt
          ).getTime() <
          Date.now()
        ) {

          /*
          |--------------------------------------------------------------------------
          | GENERATE NEW CODE
          |--------------------------------------------------------------------------
          */

          const newDeliveryCode =
            generateDeliveryCode();

          /*
          |--------------------------------------------------------------------------
          | CREATE NEW HASH
          |--------------------------------------------------------------------------
          */

          order.deliveryCodeHash =
            hashDeliveryCode(
              newDeliveryCode
            );

          /*
          |--------------------------------------------------------------------------
          | NEW EXPIRY
          |--------------------------------------------------------------------------
          */

          order.deliveryCodeExpiresAt =
            new Date(
              Date.now() +
                DELIVERY_CODE_EXPIRY_MINUTES *
                  60 *
                  1000
            );

          /*
          |--------------------------------------------------------------------------
          | RESET ATTEMPTS
          |--------------------------------------------------------------------------
          */

          order.deliveryCodeAttempts =
            0;

          /*
          |--------------------------------------------------------------------------
          | NEW GENERATION TIME
          |--------------------------------------------------------------------------
          */

          order.deliveryCodeGeneratedAt =
            new Date();

          /*
          |--------------------------------------------------------------------------
          | RESET VERIFICATION TIME
          |--------------------------------------------------------------------------
          */

          order.deliveryCodeVerifiedAt =
            null;

          /*
          |--------------------------------------------------------------------------
          | CUSTOMER WHO RECEIVES THE CODE
          |--------------------------------------------------------------------------
          */

          order.deliveryCodeIssuedTo =
            order.customer?._id ||
            order.customer;

          /*
          |--------------------------------------------------------------------------
          | SAVE NEW CODE BEFORE SENDING NOTIFICATION
          |--------------------------------------------------------------------------
          |
          | This is important.
          |
          | The new hash and expiry must exist in MongoDB before the
          | customer receives the new code.
          |
          |--------------------------------------------------------------------------
          */

          try {

            await order.save();

          } catch (
            saveError
          ) {

            console.error(
              "Failed to save regenerated delivery code:",
              saveError
            );

            return res.status(500).json({

              success:
                false,

              code:
                "DELIVERY_CODE_RENEWAL_FAILED",

              message:
                "The delivery verification code expired, but a new code could not be generated. Please try again."

            });
          }

          /*
          |--------------------------------------------------------------------------
          | SEND NEW CODE TO CUSTOMER
          |--------------------------------------------------------------------------
          */

          try {

            await notifyUser({

              req,

              recipient:
                order.customer?._id ||
                order.customer,

              role:
                "customer",

              type:
                "DELIVERY_CODE",

              title:
                "New delivery verification code",

              message:
                `Your previous delivery code for order ${order.orderNumber} has expired. Your new delivery verification code is ${newDeliveryCode}. Share this code with the delivery person/seller only when your order is physically delivered.`,

              metadata: {

                orderId:
                  String(
                    order._id
                  ),

                orderNumber:
                  order.orderNumber,

                purpose:
                  "delivery_verification",

                expiresAt:
                  order.deliveryCodeExpiresAt,

                action:
                  "verify_delivery",

                regenerated:
                  true

              }

            });

          } catch (
            notificationError
          ) {

            console.error(
              "New delivery code notification failed:",
              notificationError
            );

            return res.status(500).json({

              success:
                false,

              code:
                "DELIVERY_CODE_NOTIFICATION_FAILED",

              message:
                "A new delivery verification code was generated, but it could not be sent to the customer. Please try again."

            });
          }

          /*
          |--------------------------------------------------------------------------
          | DO NOT MARK ORDER AS DELIVERED
          |--------------------------------------------------------------------------
          |
          | The seller must enter the NEW code.
          |
          |--------------------------------------------------------------------------
          */

          return res.status(400).json({

            success:
              false,

            code:
              "DELIVERY_CODE_EXPIRED_RESENT",

            message:
              "The previous delivery verification code has expired. A new 6-digit code has been sent to the customer. Ask the customer for the new code and try again.",

            expiresAt:
              order.deliveryCodeExpiresAt

          });
        }

        if (
          !verifyDeliveryCode(
            submittedDeliveryCode,
            order.deliveryCodeHash
          )
        ) {
          order.deliveryCodeAttempts =
            attempts + 1;

          await order.save();

          const remainingAttempts =
            Math.max(
              DELIVERY_CODE_MAX_ATTEMPTS -
                order.deliveryCodeAttempts,
              0
            );

          return res.status(400).json({
            success: false,

            code:
              remainingAttempts === 0
                ? "DELIVERY_CODE_LOCKED"
                : "INVALID_DELIVERY_CODE",

            message:
              remainingAttempts === 0
                ? "Incorrect delivery code. Verification is now locked."
                : `Incorrect delivery code. ${remainingAttempts} attempt(s) remaining.`
          });
        }

        order.deliveryCodeVerifiedAt =
          new Date();

        order.deliveryCodeHash =
          null;

        order.deliveryCodeExpiresAt =
          null;

        order.deliveryCodeAttempts =
          0;
      }

      /*
      |--------------------------------------------------------------------------
      | RAZORPAY PAYMENT VALIDATION
      |--------------------------------------------------------------------------
      */

      if (
        status === "delivered" &&
        order.paymentMethod ===
          "razorpay" &&
        order.paymentStatus !==
          "paid"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Razorpay payment must be completed before delivering this order."
        });
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE STATUS
      |--------------------------------------------------------------------------
      */

      order.orderStatus =
        status;

      /*
      |--------------------------------------------------------------------------
      | COD PAYMENT COLLECTION
      |--------------------------------------------------------------------------
      |
      | COD payment is considered collected at delivery.
      |
      |--------------------------------------------------------------------------
      */

      if (
        status === "delivered" &&
        order.paymentMethod ===
          "cod"
      ) {
        order.paymentStatus =
          "paid";
      }

      /*
      |--------------------------------------------------------------------------
      | DELIVERED TIMESTAMP
      |--------------------------------------------------------------------------
      */

      if (
        status === "delivered"
      ) {
        order.deliveredAt =
          order.deliveredAt ||
          new Date();

        order.paymentExpiresAt =
          null;

        order.deliveryCodeIssuedTo =
          null;
      }

      await order.save();

      /*
      |--------------------------------------------------------------------------
      | SOCKET EVENTS
      |--------------------------------------------------------------------------
      */

      const io =
        req.app.get("io");

      if (io) {
        io.to(
          `user:${order.customer._id || order.customer}`
        ).emit(
          "order:status-updated",
          {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            previousStatus,

            orderStatus:
              order.orderStatus,

            paymentMethod:
              order.paymentMethod,

            paymentStatus:
              order.paymentStatus
          }
        );

        io.to(
          "admin"
        ).emit(
          "admin:order-status-updated",
          {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            previousStatus,

            orderStatus:
              order.orderStatus,

            paymentMethod:
              order.paymentMethod,

            paymentStatus:
              order.paymentStatus,

            sellerId:
              req.user._id
          }
        );

        io.to(
          `seller:${req.user._id}`
        ).emit(
          "seller:order-status-updated",
          {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            previousStatus,

            orderStatus:
              order.orderStatus,

            paymentMethod:
              order.paymentMethod,

            paymentStatus:
              order.paymentStatus
          }
        );
      }

      /*
      |--------------------------------------------------------------------------
      | CUSTOMER NOTIFICATION
      |--------------------------------------------------------------------------
      */

      try {
        await notifyUser({
          req,

          recipient:
            order.customer._id ||
            order.customer,

          type:
            "ORDER_STATUS_UPDATED",

          title:
            status ===
            "delivered"
              ? order.paymentMethod ===
                "cod"
                ? "Order delivered and COD payment collected"
                : "Order delivered"
              : "Order status updated",

          message:
            status ===
            "delivered"
              ? order.paymentMethod ===
                "cod"
                ? `Your order ${order.orderNumber} has been delivered and COD payment has been collected.`
                : `Your order ${order.orderNumber} has been delivered successfully.`
              : `Your order ${order.orderNumber} is now ${order.orderStatus.replaceAll("_", " ")}.`,

          metadata: {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            previousStatus,

            status:
              order.orderStatus,

            paymentMethod:
              order.paymentMethod,

            paymentStatus:
              order.paymentStatus
          }
        });
      } catch (
        notificationError
      ) {
        console.error(
          "Seller status notification failed:",
          notificationError.message
        );
      }

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      return res.status(200).json({
        success: true,

        message:
          status ===
            "delivered" &&
          order.paymentMethod ===
            "cod"
            ? "Order delivered and COD payment marked as collected"
            : "Order status updated successfully",

        data:
          order
      });
    }
  );


/*
|--------------------------------------------------------------------------
| GET ORDER SELLER IDS
|--------------------------------------------------------------------------
*/

const getOrderSellerIds = (order) => {
  return [
    ...new Set(
      (order?.items || [])
        .map((item) => {
          const seller = item?.seller;

          if (!seller) {
            return "";
          }

          if (seller?._id) {
            return String(seller._id);
          }

          return String(seller);
        })
        .filter(Boolean)
    )
  ];
};

/*
|--------------------------------------------------------------------------
| DELETE SELLER ORDER
|--------------------------------------------------------------------------
|
| Seller can permanently delete an order only when:
| 1. The order belongs to this seller.
| 2. Every item in the order belongs to this seller.
| 3. The order is "cancelled" or "returned".
|
| Active commerce records are protected.
| Deleting a record does not trigger an external payment refund.
|--------------------------------------------------------------------------
*/

const deleteSellerOrder =
  asyncHandler(
    async (req, res) => {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID"
        });
      }

      const sellerId =
        req.user._id.toString();

      const session =
        await mongoose.startSession();

      let deletedOrder = null;
      let releasedReservation = false;

      try {
        await session.withTransaction(
          async () => {
            const order =
              await Order.findOne({
                _id: id,
                "items.seller": req.user._id
              }).session(session);

            if (!order) {
              throw new Error(
                "SELLER_ORDER_NOT_FOUND"
              );
            }

            const sellerIds =
              getOrderSellerIds(order);

            if (
              sellerIds.length !== 1 ||
              sellerIds[0] !== sellerId
            ) {
              throw new Error(
                "MULTI_SELLER_ORDER"
              );
            }

            const status =
              String(
                order.orderStatus || ""
              )
                .trim()
                .toLowerCase();

            if (
              ![
                "cancelled",
                "returned"
              ].includes(status)
            ) {
              throw new Error(
                "ORDER_NOT_ELIGIBLE"
              );
            }

            const inventoryStatus =
              String(
                order.inventoryStatus ||
                  "pending"
              )
                .trim()
                .toLowerCase();

            if (
              inventoryStatus === "reserved" &&
              order.inventoryReserved === true &&
              order.inventoryReleased !== true
            ) {
              await releaseInventory({
                order,
                session
              });

              releasedReservation = true;
            } else if (
              ![
                "pending",
                "reserved",
                "released",
                "committed"
              ].includes(inventoryStatus)
            ) {
              throw new Error(
                `Unknown inventory status "${inventoryStatus}". Order was not deleted.`
              );
            }

            deletedOrder = {
              _id: order._id,
              orderNumber: order.orderNumber,
              customer: order.customer,
              paymentMethod: order.paymentMethod,
              paymentStatus: order.paymentStatus,
              orderStatus: order.orderStatus,
              totalAmount: order.totalAmount,
              inventoryStatus,
              releasedReservation,
              sellerIds
            };

            await Order.deleteOne(
              { _id: order._id },
              { session }
            );
          }
        );
      } catch (error) {
        const statusMap = {
          SELLER_ORDER_NOT_FOUND: [
            404,
            "Order not found or you do not have access to it."
          ],
          MULTI_SELLER_ORDER: [
            409,
            "This order contains products from another seller and cannot be deleted from your seller account."
          ],
          ORDER_NOT_ELIGIBLE: [
            409,
            "Only cancelled or returned orders can be deleted."
          ]
        };

        const mapped =
          statusMap[error?.message];

        if (mapped) {
          return res.status(mapped[0]).json({
            success: false,
            message: mapped[1]
          });
        }

        throw error;
      } finally {
        await session.endSession();
      }

      const io = req.app.get("io");

      if (io && deletedOrder) {
        const payload = {
          orderId: String(
            deletedOrder._id
          ),
          orderNumber:
            deletedOrder.orderNumber,
          deletedBy: String(
            req.user._id
          ),
          deletedRole: "seller",
          paymentMethod:
            deletedOrder.paymentMethod,
          paymentStatus:
            deletedOrder.paymentStatus,
          orderStatus:
            deletedOrder.orderStatus,
          totalAmount:
            deletedOrder.totalAmount,
          releasedReservation
        };

        io.to(
          `seller:${sellerId}`
        ).emit(
          "seller:order-deleted",
          payload
        );

        if (deletedOrder.customer) {
          io.to(
            `user:${String(
              deletedOrder.customer
            )}`
          ).emit(
            "order:deleted",
            payload
          );
        }

        io.to("admin").emit(
          "admin:order-deleted",
          payload
        );
      }

      return res.status(200).json({
        success: true,
        message:
          "Order deleted successfully.",
        data: {
          orderId: deletedOrder._id,
          orderNumber:
            deletedOrder.orderNumber,
          releasedReservation,
          paymentPolicy:
            "Deleting an order record does not issue an external payment refund."
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| DELETE ADMIN ORDER
|--------------------------------------------------------------------------
|
| Admin-only permanent removal of an order record.
|
| Reserved inventory is released first when necessary.
| Committed stock is not restored merely because the record is deleted.
| Database deletion does not call an external payment-refund API.
|--------------------------------------------------------------------------
*/

const deleteAdminOrder =
  asyncHandler(
    async (req, res) => {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID"
        });
      }

      const session =
        await mongoose.startSession();

      let deletedOrder = null;
      let releasedReservation = false;

      try {
        await session.withTransaction(
          async () => {
            const order =
              await Order.findById(
                id
              ).session(session);

            if (!order) {
              throw new Error(
                "ORDER_NOT_FOUND"
              );
            }

            const inventoryStatus =
              String(
                order.inventoryStatus ||
                  "pending"
              )
                .trim()
                .toLowerCase();

            if (
              inventoryStatus === "reserved" &&
              order.inventoryReserved === true &&
              order.inventoryReleased !== true
            ) {
              await releaseInventory({
                order,
                session
              });

              releasedReservation = true;
            } else if (
              ![
                "pending",
                "reserved",
                "released",
                "committed"
              ].includes(inventoryStatus)
            ) {
              throw new Error(
                `Unknown inventory status "${inventoryStatus}". Order was not deleted.`
              );
            }

            deletedOrder = {
              _id: order._id,
              orderNumber: order.orderNumber,
              customer: order.customer,
              paymentMethod: order.paymentMethod,
              paymentStatus: order.paymentStatus,
              orderStatus: order.orderStatus,
              totalAmount: order.totalAmount,
              sellerIds:
                getOrderSellerIds(order),
              inventoryStatus,
              releasedReservation
            };

            await Order.deleteOne(
              { _id: order._id },
              { session }
            );
          }
        );
      } catch (error) {
        if (
          error?.message ===
          "ORDER_NOT_FOUND"
        ) {
          return res.status(404).json({
            success: false,
            message: "Order not found."
          });
        }

        throw error;
      } finally {
        await session.endSession();
      }

      const io = req.app.get("io");

      if (io && deletedOrder) {
        const payload = {
          orderId: String(
            deletedOrder._id
          ),
          orderNumber:
            deletedOrder.orderNumber,
          deletedBy: String(
            req.user._id
          ),
          deletedRole: "admin",
          paymentMethod:
            deletedOrder.paymentMethod,
          paymentStatus:
            deletedOrder.paymentStatus,
          orderStatus:
            deletedOrder.orderStatus,
          totalAmount:
            deletedOrder.totalAmount,
          releasedReservation
        };

        io.to("admin").emit(
          "admin:order-deleted",
          payload
        );

        if (deletedOrder.customer) {
          io.to(
            `user:${String(
              deletedOrder.customer
            )}`
          ).emit(
            "order:deleted",
            payload
          );
        }

        for (
          const sellerId of
            deletedOrder.sellerIds
        ) {
          io.to(
            `seller:${sellerId}`
          ).emit(
            "seller:order-deleted",
            payload
          );
        }
      }

      return res.status(200).json({
        success: true,
        message:
          "Order deleted successfully.",
        data: {
          orderId: deletedOrder._id,
          orderNumber:
            deletedOrder.orderNumber,
          releasedReservation,
          inventoryPolicy:
            "Committed stock was not restored by record deletion.",
          paymentPolicy:
            "Deleting an order record does not issue an external payment refund."
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| GET ADMIN ORDERS
|--------------------------------------------------------------------------
|
| GET /api/order-management/admin
|--------------------------------------------------------------------------
*/

const getAdminOrders =
  asyncHandler(
    async (req, res) => {
      const {
        status,
        page = 1,
        limit = 20,
        search
      } = req.query;

      const currentPage =
        Math.max(
          Number(page),
          1
        );

      const currentLimit =
        Math.min(
          Math.max(
            Number(limit),
            1
          ),
          100
        );

      const query = {};

      if (status) {
        if (
          !adminAllowedStatuses.includes(
            status
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid order status"
          });
        }

        query.orderStatus =
          status;
      }

      if (
        search &&
        String(search).trim()
      ) {
        query.orderNumber = {
          $regex:
            String(
              search
            ).trim(),

          $options: "i"
        };
      }

      const skip =
        (currentPage - 1) *
        currentLimit;

      const [
        orders,
        total
      ] =
        await Promise.all([
          Order.find(query)
            .populate(
              "customer",
              "name email phone"
            )
            .populate(
              "items.seller",
              "name email sellerProfile.businessName"
            )
            .populate(
              "items.product",
              "name slug images unit harvestDate stockQuantity"
            )
            .sort({
              createdAt: -1
            })
            .skip(skip)
            .limit(
              currentLimit
            )
            .lean(),

          Order.countDocuments(
            query
          )
        ]);

      return res.status(200).json({
        success: true,

        data:
          orders,

        pagination: {
          page:
            currentPage,

          limit:
            currentLimit,

          total,

          pages:
            Math.ceil(
              total /
                currentLimit
            )
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| GET ADMIN ORDER
|--------------------------------------------------------------------------
|
| GET /api/order-management/admin/:id
|--------------------------------------------------------------------------
*/

const getAdminOrderById =
  asyncHandler(
    async (req, res) => {
      const { id } =
        req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID"
        });
      }

      const order =
        await Order.findById(id)
          .populate(
            "customer",
            "name email phone"
          )
          .populate(
            "items.seller",
            "name email sellerProfile.businessName"
          )
          .populate(
            "items.product",
            "name slug images unit harvestDate stockQuantity"
          );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found"
        });
      }

      return res.status(200).json({
        success: true,
        data:
          order
      });
    }
  );

/*
|--------------------------------------------------------------------------
| RESTORE INVENTORY
|--------------------------------------------------------------------------
|
| Used when a committed order is cancelled.
|
|--------------------------------------------------------------------------
*/

const restoreCommittedInventory =
  async ({
    order,
    session
  }) => {
    for (
      const item of order.items
    ) {
      const product =
        await Product.findById(
          item.product
        ).session(
          session
        );

      if (!product) {
        continue;
      }

      await Product.findByIdAndUpdate(
        item.product,

        {
          $inc: {
            stockQuantity:
              item.quantity,

            totalSold:
              -item.quantity
          }
        },

        {
          session
        }
      );

      const updatedProduct =
        await Product.findById(
          item.product
        ).session(
          session
        );

      if (
        updatedProduct &&
        updatedProduct.stockQuantity >
          0 &&
        updatedProduct.status ===
          "out_of_stock"
      ) {
        updatedProduct.status =
          "approved";

        await updatedProduct.save({
          session
        });
      }
    }
  };

/*
|--------------------------------------------------------------------------
| UPDATE ADMIN ORDER STATUS
|--------------------------------------------------------------------------
|
| PATCH /api/order-management/admin/:id/status
|--------------------------------------------------------------------------
*/

const updateAdminOrderStatus =
  asyncHandler(
    async (req, res) => {
      const { id } =
        req.params;

      const {
        status,
        cancellationReason
      } = req.body;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID"
        });
      }

      if (
        !adminAllowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order status"
        });
      }

      const originalOrder =
        await Order.findById(id);

      if (!originalOrder) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found"
        });
      }

      const previousStatus =
        originalOrder.orderStatus;

      /*
      |--------------------------------------------------------------------------
      | SAME STATUS
      |--------------------------------------------------------------------------
      */

      if (
        previousStatus ===
        status
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Order is already "${status}"`
        });
      }

      /*
      |--------------------------------------------------------------------------
      | DELIVERED ORDER RULE
      |--------------------------------------------------------------------------
      */

      if (
        previousStatus ===
          "delivered" &&
        status !== "returned"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A delivered order can only move to returned"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CANCELLED ORDER RULE
      |--------------------------------------------------------------------------
      */

      if (
        previousStatus ===
          "cancelled" &&
        status !== "returned"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A cancelled order cannot be moved to this status"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | ADMIN CANCELLATION
      |--------------------------------------------------------------------------
      */

      if (
        status === "cancelled"
      ) {
        if (
          ![
            "pending",
            "confirmed",
            "processing"
          ].includes(
            previousStatus
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Order cannot be cancelled from "${previousStatus}"`
          });
        }

        const session =
          await mongoose.startSession();

        let cancelledOrder =
          null;

        try {
          await session.withTransaction(
            async () => {
              const order =
                await Order.findById(
                  id
                ).session(
                  session
                );

              if (!order) {
                throw new Error(
                  "Order not found"
                );
              }

              /*
              |--------------------------------------------------------------------------
              | RELEASE RAZORPAY RESERVATION
              |--------------------------------------------------------------------------
              */

              if (
                order.inventoryReserved &&
                !order.inventoryReleased
              ) {
                await releaseInventory({
                  order,

                  session
                });

                order.inventoryReleased =
                  true;
              } else if (
                order.paymentMethod ===
                  "cod" ||
                order.paymentStatus ===
                  "paid"
              ) {
                /*
                |--------------------------------------------------------------------------
                | RESTORE COMMITTED STOCK
                |--------------------------------------------------------------------------
                */

                await restoreCommittedInventory({
                  order,

                  session
                });
              }

              order.orderStatus =
                "cancelled";

              order.cancelledAt =
                new Date();

              order.paymentExpiresAt =
                null;

              if (
                cancellationReason
              ) {
                order.cancellationReason =
                  String(
                    cancellationReason
                  ).trim();
              }

              /*
              |--------------------------------------------------------------------------
              | ONLINE PAYMENT
              |--------------------------------------------------------------------------
              |
              | "refunded" here indicates that the order is being treated
              | as refunded/eligible for refund. It does not itself call
              | Razorpay's refund API.
              |
              |--------------------------------------------------------------------------
              */

              if (
                order.paymentMethod ===
                  "razorpay" &&
                order.paymentStatus ===
                  "paid"
              ) {
                order.paymentStatus =
                  "refunded";
              }

              await order.save({
                session
              });

              cancelledOrder =
                order;
            }
          );
        } finally {
          await session.endSession();
        }

        const updatedCancelledOrder =
          await Order.findById(
            cancelledOrder._id
          )
            .populate(
              "customer",
              "name email phone"
            )
            .populate(
              "items.seller",
              "name email sellerProfile.businessName"
            );

        /*
        |--------------------------------------------------------------------------
        | NOTIFICATIONS
        |--------------------------------------------------------------------------
        */

        try {
          await notifyUser({
            req,

            recipient:
              updatedCancelledOrder.customer,

            type:
              "ORDER_CANCELLED",

            title:
              "Order cancelled",

            message:
              `Order ${updatedCancelledOrder.orderNumber} has been cancelled.`,

            metadata: {
              orderId:
                updatedCancelledOrder._id,

              orderNumber:
                updatedCancelledOrder.orderNumber,

              reason:
                updatedCancelledOrder.cancellationReason
            }
          });

          const sellerIds = [
            ...new Set(
              updatedCancelledOrder.items
                .map(
                  (item) =>
                    item.seller?._id
                      ? item.seller._id.toString()
                      : item.seller?.toString()
                )
                .filter(Boolean)
            )
          ];

          if (
            sellerIds.length >
            0
          ) {
            await notifyUsers({
              req,

              recipients:
                sellerIds,

              type:
                "ORDER_CANCELLED",

              title:
                "Order cancelled",

              message:
                `Order ${updatedCancelledOrder.orderNumber} has been cancelled.`,

              metadata: {
                orderId:
                  updatedCancelledOrder._id,

                orderNumber:
                  updatedCancelledOrder.orderNumber
              }
            });
          }
        } catch (
          notificationError
        ) {
          console.error(
            "Admin cancellation notification failed:",
            notificationError.message
          );
        }

        /*
        |--------------------------------------------------------------------------
        | SOCKET
        |--------------------------------------------------------------------------
        */

        const io =
          req.app.get("io");

        if (io) {
          io.to(
            `user:${updatedCancelledOrder.customer._id || updatedCancelledOrder.customer}`
          ).emit(
            "order:cancelled",
            {
              orderId:
                updatedCancelledOrder._id,

              orderNumber:
                updatedCancelledOrder.orderNumber,

              paymentStatus:
                updatedCancelledOrder.paymentStatus
            }
          );

          const sellerIds = [
            ...new Set(
              updatedCancelledOrder.items
                .map(
                  (item) =>
                    item.seller?._id
                      ? item.seller._id.toString()
                      : item.seller?.toString()
                )
                .filter(Boolean)
            )
          ];

          for (
            const sellerId of sellerIds
          ) {
            io.to(
              `seller:${sellerId}`
            ).emit(
              "seller:order-cancelled",
              {
                orderId:
                  updatedCancelledOrder._id,

                orderNumber:
                  updatedCancelledOrder.orderNumber
              }
            );
          }

          io.to(
            "admin"
          ).emit(
            "admin:order-cancelled",
            {
              orderId:
                updatedCancelledOrder._id,

              orderNumber:
                updatedCancelledOrder.orderNumber
            }
          );
        }

        return res.status(200).json({
          success: true,

          message:
            "Order cancelled successfully",

          data:
            updatedCancelledOrder
        });
      }

      /*
      |--------------------------------------------------------------------------
      | RETURN
      |--------------------------------------------------------------------------
      */

      if (
        status === "returned"
      ) {
        if (
          previousStatus !==
          "delivered"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Only delivered orders can be returned"
          });
        }

        const session =
          await mongoose.startSession();

        try {
          await session.withTransaction(
            async () => {
              const order =
                await Order.findById(
                  id
                ).session(
                  session
                );

              if (!order) {
                throw new Error(
                  "Order not found"
                );
              }

              order.orderStatus =
                "returned";

              await order.save({
                session
              });
            }
          );
        } finally {
          await session.endSession();
        }

        const returnedOrder =
          await Order.findById(
            id
          )
            .populate(
              "customer",
              "name email phone"
            )
            .populate(
              "items.seller",
              "name email sellerProfile.businessName"
            )
            .populate(
              "items.product",
              "name slug images unit harvestDate"
            );

        try {
          await notifyUser({
            req,

            recipient:
              returnedOrder.customer,

            type:
              "ORDER_STATUS_UPDATED",

            title:
              "Order returned",

            message:
              `Order ${returnedOrder.orderNumber} has been marked as returned.`,

            metadata: {
              orderId:
                returnedOrder._id,

              orderNumber:
                returnedOrder.orderNumber,

              status:
                returnedOrder.orderStatus
            }
          });
        } catch (
          notificationError
        ) {
          console.error(
            "Return notification failed:",
            notificationError.message
          );
        }

        return res.status(200).json({
          success: true,

          message:
            "Order marked as returned",

          data:
            returnedOrder
        });
      }

      /*
      |--------------------------------------------------------------------------
      | RAZORPAY DELIVERY VALIDATION
      |--------------------------------------------------------------------------
      */

      if (
        status === "delivered" &&
        originalOrder.paymentMethod ===
          "razorpay" &&
        originalOrder.paymentStatus !==
          "paid"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Razorpay payment must be completed before delivering this order."
        });
      }

      /*
      |--------------------------------------------------------------------------
      | ADMIN STATUS TRANSITION
      |--------------------------------------------------------------------------
      */

      if (
        !canTransition(
          previousStatus,
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Cannot change order status from "${previousStatus}" to "${status}"`
        });
      }

      originalOrder.orderStatus =
        status;

      /*
      |--------------------------------------------------------------------------
      | COD PAYMENT
      |--------------------------------------------------------------------------
      */

      if (
        status === "delivered" &&
        originalOrder.paymentMethod ===
          "cod"
      ) {
        originalOrder.paymentStatus =
          "paid";
      }

      /*
      |--------------------------------------------------------------------------
      | DELIVERY DATE
      |--------------------------------------------------------------------------
      */

      if (
        status === "delivered"
      ) {
        originalOrder.deliveredAt =
          originalOrder.deliveredAt ||
          new Date();

        originalOrder.paymentExpiresAt =
          null;
      }

      await originalOrder.save();

      /*
      |--------------------------------------------------------------------------
      | RELOAD
      |--------------------------------------------------------------------------
      */

      const updatedOrder =
        await Order.findById(
          id
        )
          .populate(
            "customer",
            "name email phone"
          )
          .populate(
            "items.seller",
            "name email sellerProfile.businessName"
          )
          .populate(
            "items.product",
            "name slug images unit harvestDate"
          );

      /*
      |--------------------------------------------------------------------------
      | NOTIFICATIONS
      |--------------------------------------------------------------------------
      */

      try {
        await notifyUser({
          req,

          recipient:
            updatedOrder.customer,

          type:
            "ORDER_STATUS_UPDATED",

          title:
            status ===
            "delivered"
              ? updatedOrder.paymentMethod ===
                "cod"
                ? "Order delivered and payment collected"
                : "Order delivered"
              : "Order status updated",

          message:
            status ===
            "delivered"
              ? updatedOrder.paymentMethod ===
                "cod"
                ? `Your order ${updatedOrder.orderNumber} has been delivered and COD payment has been collected.`
                : `Your order ${updatedOrder.orderNumber} has been delivered successfully.`
              : `Your order ${updatedOrder.orderNumber} is now ${updatedOrder.orderStatus.replaceAll("_", " ")}.`,

          metadata: {
            orderId:
              updatedOrder._id,

            orderNumber:
              updatedOrder.orderNumber,

            status:
              updatedOrder.orderStatus,

            paymentMethod:
              updatedOrder.paymentMethod,

            paymentStatus:
              updatedOrder.paymentStatus
          }
        });

        const sellerIds = [
          ...new Set(
            updatedOrder.items
              .map(
                (item) =>
                  item.seller?._id
                    ? item.seller._id.toString()
                    : item.seller?.toString()
              )
              .filter(Boolean)
          )
        ];

        if (
          sellerIds.length >
          0
        ) {
          await notifyUsers({
            req,

            recipients:
              sellerIds,

            type:
              "ORDER_STATUS_UPDATED",

            title:
              "Order status updated",

            message:
              `Order ${updatedOrder.orderNumber} is now ${updatedOrder.orderStatus.replaceAll("_", " ")}.`,

            metadata: {
              orderId:
                updatedOrder._id,

              orderNumber:
                updatedOrder.orderNumber,

              status:
                updatedOrder.orderStatus,

              paymentStatus:
                updatedOrder.paymentStatus
            }
          });
        }

        const admins =
          await User.find({
            role:
              "admin",

            isActive:
              true
          }).select(
            "_id"
          );

        const adminIds =
          admins.map(
            (admin) =>
              admin._id
          );

        if (
          adminIds.length >
          0
        ) {
          await notifyUsers({
            req,

            recipients:
              adminIds,

            type:
              "ORDER_STATUS_UPDATED",

            title:
              "Order status updated",

            message:
              `Order ${updatedOrder.orderNumber} is now ${updatedOrder.orderStatus.replaceAll("_", " ")}.`,

            metadata: {
              orderId:
                updatedOrder._id,

              orderNumber:
                updatedOrder.orderNumber,

              status:
                updatedOrder.orderStatus,

              paymentStatus:
                updatedOrder.paymentStatus
            }
          });
        }
      } catch (
        notificationError
      ) {
        console.error(
          "Admin order status notification failed:",
          notificationError.message
        );
      }

      /*
      |--------------------------------------------------------------------------
      | SOCKET
      |--------------------------------------------------------------------------
      */

      const io =
        req.app.get("io");

      if (io) {
        io.to(
          `user:${updatedOrder.customer._id || updatedOrder.customer}`
        ).emit(
          "order:status-updated",
          {
            orderId:
              updatedOrder._id,

            orderNumber:
              updatedOrder.orderNumber,

            previousStatus,

            orderStatus:
              updatedOrder.orderStatus,

            paymentMethod:
              updatedOrder.paymentMethod,

            paymentStatus:
              updatedOrder.paymentStatus
          }
        );

        io.to(
          "admin"
        ).emit(
          "admin:order-status-updated",
          {
            orderId:
              updatedOrder._id,

            orderNumber:
              updatedOrder.orderNumber,

            previousStatus,

            orderStatus:
              updatedOrder.orderStatus,

            paymentMethod:
              updatedOrder.paymentMethod,

            paymentStatus:
              updatedOrder.paymentStatus
          }
        );

        const sellerIds = [
          ...new Set(
            updatedOrder.items
              .map(
                (item) =>
                  item.seller?._id
                    ? item.seller._id.toString()
                    : item.seller?.toString()
              )
              .filter(Boolean)
          )
        ];

        for (
          const sellerId of sellerIds
        ) {
          io.to(
            `seller:${sellerId}`
          ).emit(
            "seller:order-status-updated",
            {
              orderId:
                updatedOrder._id,

              orderNumber:
                updatedOrder.orderNumber,

              previousStatus,

              orderStatus:
                updatedOrder.orderStatus,

              paymentMethod:
                updatedOrder.paymentMethod,

              paymentStatus:
                updatedOrder.paymentStatus
            }
          );
        }
      }

      return res.status(200).json({
        success: true,

        message:
          status ===
            "delivered" &&
          updatedOrder.paymentMethod ===
            "cod"
            ? "Order delivered and COD payment marked as collected"
            : "Admin order status updated successfully",

        data:
          updatedOrder
      });
    }
  );

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  getSellerOrders,
  getSellerOrderById,
  updateSellerOrderStatus,
  deleteSellerOrder,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  deleteAdminOrder
};


