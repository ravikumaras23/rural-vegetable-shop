const crypto = require("crypto");
const mongoose = require("mongoose");

const razorpay =
  require("../config/razorpay");

const Order =
  require("../models/Order");

const User =
  require("../models/User");

const asyncHandler =
  require("../utils/asyncHandler");

const {
  commitInventory,
  releaseInventory
} =
  require("../services/inventoryService");

const {
  notifyUser,
  notifyUsers
} =
  require("../services/businessNotificationService");


console.log(
  "Razorpay configuration:",
  {
    keyId:
      process.env.RAZORPAY_KEY_ID
        ? `${process.env.RAZORPAY_KEY_ID.slice(0, 10)}...`
        : "MISSING",

    secretConfigured:
      Boolean(
        process.env.RAZORPAY_KEY_SECRET
      ),

    currency:
      process.env.RAZORPAY_CURRENCY
  }
);

  /*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
*/

const CURRENCY =
  process.env.RAZORPAY_CURRENCY ||
  "INR";

const PAYMENT_TIMEOUT_MINUTES =
  Math.max(
    Number(
      process.env.RAZORPAY_PAYMENT_TIMEOUT_MINUTES
    ) || 15,
    1
  );

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isValidObjectId = (
  id
) => {
  return mongoose.Types.ObjectId.isValid(
    id
  );
};

const rupeesToPaise = (
  amount
) => {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {
    return 0;
  }

  return Math.round(
    numericAmount * 100
  );
};

const paiseToRupees = (
  amount
) => {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount
    )
  ) {
    return 0;
  }

  return numericAmount / 100;
};

/*
|--------------------------------------------------------------------------
| SAFE NOTIFICATIONS
|--------------------------------------------------------------------------
*/

const safeNotifyUser =
  async (payload) => {
    try {
      await notifyUser(
        payload
      );
    } catch (error) {
      console.error(
        "Notification error:",
        error.message
      );
    }
  };

const safeNotifyUsers =
  async (payload) => {
    try {
      await notifyUsers(
        payload
      );
    } catch (error) {
      console.error(
        "Notification error:",
        error.message
      );
    }
  };

/*
|--------------------------------------------------------------------------
| SELLER IDS
|--------------------------------------------------------------------------
*/

const getSellerIds = (
  order
) => {
  if (
    !order ||
    !Array.isArray(
      order.items
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      order.items
        .map(
          (item) =>
            String(
              item.seller
            )
        )
        .filter(Boolean)
    )
  ];
};

/*
|--------------------------------------------------------------------------
| CREATE RAZORPAY ORDER
|--------------------------------------------------------------------------
|
| POST
| /api/payments/razorpay/order/:orderId
|
| Required state:
|
| order.inventoryStatus = "reserved"
|
|--------------------------------------------------------------------------
*/

const createRazorpayOrder =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const {
        orderId
      } =
        req.params;

      /*
      |----------------------------------------------------------------------
      | VALIDATE ORDER ID
      |----------------------------------------------------------------------
      */

      if (
        !isValidObjectId(
          orderId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid order ID"
          });
      }

      /*
      |----------------------------------------------------------------------
      | FIND CUSTOMER ORDER
      |----------------------------------------------------------------------
      */

      const order =
        await Order.findOne({
          _id:
            orderId,

          customer:
            req.user._id
        });

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Order not found"
          });
      }

      /*
      |----------------------------------------------------------------------
      | PAYMENT METHOD
      |----------------------------------------------------------------------
      */

      if (
        order.paymentMethod !==
        "razorpay"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "This order is not configured for Razorpay payment"
          });
      }

      /*
      |----------------------------------------------------------------------
      | ALREADY PAID
      |----------------------------------------------------------------------
      */

      if (
        order.paymentStatus ===
        "paid"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Order payment is already completed"
          });
      }

      /*
      |----------------------------------------------------------------------
      | CANCELLED
      |----------------------------------------------------------------------
      */

      if (
        order.orderStatus ===
        "cancelled"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Cancelled orders cannot be paid"
          });
      }

      /*
      |----------------------------------------------------------------------
      | INVENTORY STATE
      |----------------------------------------------------------------------
      |
      | Razorpay payment MUST have an active inventory reservation.
      |
      */

      if (
        order.inventoryStatus !==
        "reserved"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Inventory is not reserved for this order",

            inventoryStatus:
              order.inventoryStatus ||
              "missing"
          });
      }

      /*
      |----------------------------------------------------------------------
      | PAYMENT EXPIRY
      |----------------------------------------------------------------------
      */

      if (
        order.paymentExpiresAt &&
        order.paymentExpiresAt <=
          new Date()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Payment window has expired. Please create a new order.",

            expired:
              true
          });
      }

      /*
      |----------------------------------------------------------------------
      | VERIFY RAZORPAY CONFIG
      |----------------------------------------------------------------------
      */

      if (
        !process.env
          .RAZORPAY_KEY_ID ||
        !process.env
          .RAZORPAY_KEY_SECRET
      ) {
        return res
          .status(500)
          .json({
            success: false,

            message:
              "Razorpay is not configured correctly on the server."
          });
      }

      /*
      |----------------------------------------------------------------------
      | CALCULATE AMOUNT
      |----------------------------------------------------------------------
      */

      const amount =
        rupeesToPaise(
          order.totalAmount
        );

      if (
        amount <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid order amount"
          });
      }

      /*
      |----------------------------------------------------------------------
      | EXISTING RAZORPAY ORDER
      |----------------------------------------------------------------------
      |
      | Avoid creating duplicate gateway orders when the customer
      | refreshes or retries.
      |
      */

      if (
        order.razorpay?.orderId
      ) {
        return res
          .status(200)
          .json({
            success: true,

            message:
              "Existing Razorpay order retrieved",

            data: {
              keyId:
                process.env
                  .RAZORPAY_KEY_ID,

              razorpayOrderId:
                order.razorpay
                  .orderId,

              orderId:
                order._id,

              orderNumber:
                order.orderNumber,

              amount,

              amountInRupees:
                paiseToRupees(
                  amount
                ),

              currency:
                CURRENCY,

              paymentExpiresAt:
                order.paymentExpiresAt,

              inventoryStatus:
                order.inventoryStatus
            }
          });
      }

      /*
      |----------------------------------------------------------------------
      | CREATE RAZORPAY ORDER
      |----------------------------------------------------------------------
      */

      let razorpayOrder;

      try {
        razorpayOrder =
          await razorpay.orders.create({
            amount,

            currency:
              CURRENCY,

            receipt:
              String(
                order.orderNumber
              ),

            notes: {
              orderId:
                String(
                  order._id
                ),

              orderNumber:
                String(
                  order.orderNumber
                ),

              customerId:
                String(
                  order.customer
                )
            }
          });
      } catch (error) {
        console.error(
          "Razorpay order creation failed:",
          error
        );

        return res
          .status(502)
          .json({
            success: false,

            message:
              error?.error?.description ||
              error?.description ||
              error?.message ||
              "Unable to create Razorpay order"
          });
      }

      /*
      |----------------------------------------------------------------------
      | STORE GATEWAY ORDER
      |----------------------------------------------------------------------
      */

      order.razorpay =
        order.razorpay ||
        {};

      order.razorpay.orderId =
        razorpayOrder.id;

      /*
      |----------------------------------------------------------------------
      | GUARANTEE EXPIRY
      |----------------------------------------------------------------------
      */

      if (
        !order.paymentExpiresAt
      ) {
        order.paymentExpiresAt =
          new Date(
            Date.now() +
              PAYMENT_TIMEOUT_MINUTES *
                60 *
                1000
          );
      }

      await order.save();

      /*
      |----------------------------------------------------------------------
      | RESPONSE
      |----------------------------------------------------------------------
      */

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Razorpay order created successfully",

          data: {
            keyId:
              process.env
                .RAZORPAY_KEY_ID,

            razorpayOrderId:
              razorpayOrder.id,

            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            amount,

            amountInRupees:
              paiseToRupees(
                amount
              ),

            currency:
              CURRENCY,

            paymentExpiresAt:
              order.paymentExpiresAt,

            inventoryStatus:
              order.inventoryStatus
          }
        });
    }
  );

/*
|--------------------------------------------------------------------------
| VERIFY RAZORPAY PAYMENT
|--------------------------------------------------------------------------
|
| POST
| /api/payments/razorpay/verify
|
|--------------------------------------------------------------------------
*/

const verifyRazorpayPayment =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      } =
        req.body;

      /*
      |----------------------------------------------------------------------
      | VALIDATE PAYMENT DATA
      |----------------------------------------------------------------------
      */

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Razorpay payment verification data is incomplete"
          });
      }

      /*
      |----------------------------------------------------------------------
      | FIND ORDER
      |----------------------------------------------------------------------
      */

      const order =
        await Order.findOne({
          "razorpay.orderId":
            razorpay_order_id,

          customer:
            req.user._id
        });

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Order associated with Razorpay payment was not found"
          });
      }

      /*
      |----------------------------------------------------------------------
      | ALREADY PAID
      |----------------------------------------------------------------------
      */

      if (
        order.paymentStatus ===
        "paid"
      ) {
        return res
          .status(200)
          .json({
            success: true,

            message:
              "Payment has already been verified",

            data: {
              orderId:
                order._id,

              orderNumber:
                order.orderNumber,

              paymentId:
                order.razorpay
                  ?.paymentId,

              razorpayOrderId:
                order.razorpay
                  ?.orderId,

              paymentStatus:
                order.paymentStatus,

              orderStatus:
                order.orderStatus,

              inventoryStatus:
                order.inventoryStatus
            }
          });
      }

      /*
      |----------------------------------------------------------------------
      | CANCELLED
      |----------------------------------------------------------------------
      */

      if (
        order.orderStatus ===
        "cancelled"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Cancelled orders cannot be paid"
          });
      }

      /*
      |----------------------------------------------------------------------
      | EXPIRY
      |----------------------------------------------------------------------
      */

      if (
        order.paymentExpiresAt &&
        order.paymentExpiresAt <=
          new Date()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Payment window has expired. Please create a new order."
          });
      }

      /*
      |----------------------------------------------------------------------
      | INVENTORY MUST BE RESERVED
      |----------------------------------------------------------------------
      */

      if (
        order.inventoryStatus !==
        "reserved"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Inventory reservation is not available for this payment",

            inventoryStatus:
              order.inventoryStatus ||
              "missing"
          });
      }

      /*
      |----------------------------------------------------------------------
      | VERIFY RAZORPAY SIGNATURE
      |----------------------------------------------------------------------
      */

      if (
        !process.env
          .RAZORPAY_KEY_SECRET
      ) {
        return res
          .status(500)
          .json({
            success: false,

            message:
              "Razorpay secret key is not configured"
          });
      }

      const generatedSignature =
        crypto
          .createHmac(
            "sha256",
            process.env
              .RAZORPAY_KEY_SECRET
          )
          .update(
            `${razorpay_order_id}|${razorpay_payment_id}`
          )
          .digest("hex");

      const generatedBuffer =
        Buffer.from(
          generatedSignature,
          "utf8"
        );

      const receivedBuffer =
        Buffer.from(
          String(
            razorpay_signature
          ),
          "utf8"
        );

      if (
        generatedBuffer.length !==
          receivedBuffer.length ||
        !crypto.timingSafeEqual(
          generatedBuffer,
          receivedBuffer
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid Razorpay payment signature"
          });
      }

      /*
      |----------------------------------------------------------------------
      | FETCH RAZORPAY ORDER
      |----------------------------------------------------------------------
      */

      let razorpayOrder;

      try {
        razorpayOrder =
          await razorpay.orders.fetch(
            razorpay_order_id
          );
      } catch (error) {
        console.error(
          "Razorpay order fetch failed:",
          error.message
        );

        return res
          .status(502)
          .json({
            success: false,

            message:
              "Unable to verify Razorpay order with payment gateway"
          });
      }

      /*
      |----------------------------------------------------------------------
      | VERIFY AMOUNT
      |----------------------------------------------------------------------
      */

      const expectedAmount =
        rupeesToPaise(
          order.totalAmount
        );

      if (
        Number(
          razorpayOrder.amount
        ) !==
        expectedAmount
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Razorpay payment amount does not match order amount"
          });
      }

      /*
      |----------------------------------------------------------------------
      | VERIFY CURRENCY
      |----------------------------------------------------------------------
      */

      if (
        String(
          razorpayOrder.currency
        ).toUpperCase() !==
        String(
          CURRENCY
        ).toUpperCase()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Razorpay payment currency does not match order currency"
          });
      }

      /*
      |----------------------------------------------------------------------
      | RAZORPAY ORDER MUST BE PAID
      |----------------------------------------------------------------------
      */

      if (
        razorpayOrder.status !==
        "paid"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Razorpay payment has not been captured yet",

            data: {
              razorpayOrderStatus:
                razorpayOrder.status
            }
          });
      }

      /*
      |----------------------------------------------------------------------
      | FETCH PAYMENT
      |----------------------------------------------------------------------
      */

      let razorpayPayment;

      try {
        razorpayPayment =
          await razorpay.payments.fetch(
            razorpay_payment_id
          );
      } catch (error) {
        console.error(
          "Razorpay payment fetch failed:",
          error.message
        );

        return res
          .status(502)
          .json({
            success: false,

            message:
              "Unable to verify Razorpay payment"
          });
      }

      /*
      |----------------------------------------------------------------------
      | PAYMENT MUST BELONG TO ORDER
      |----------------------------------------------------------------------
      */

      if (
        String(
          razorpayPayment.order_id
        ) !==
        String(
          razorpay_order_id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Razorpay payment does not belong to this order"
          });
      }

      /*
      |----------------------------------------------------------------------
      | PAYMENT AMOUNT
      |----------------------------------------------------------------------
      */

      if (
        Number(
          razorpayPayment.amount
        ) !==
        expectedAmount
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Razorpay payment amount does not match order amount"
          });
      }

      /*
      |----------------------------------------------------------------------
      | PAYMENT CURRENCY
      |----------------------------------------------------------------------
      */

      if (
        String(
          razorpayPayment.currency
        ).toUpperCase() !==
        String(
          CURRENCY
        ).toUpperCase()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Razorpay payment currency does not match order currency"
          });
      }

      /*
      |----------------------------------------------------------------------
      | PAYMENT MUST BE CAPTURED
      |----------------------------------------------------------------------
      */

      if (
        razorpayPayment.status !==
        "captured"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Razorpay payment has not been captured"
          });
      }

      /*
      |----------------------------------------------------------------------
      | DATABASE TRANSACTION
      |----------------------------------------------------------------------
      */

      const session =
        await mongoose.startSession();

      let updatedOrder =
        null;

      let alreadyProcessed =
        false;

      try {
        await session.withTransaction(
          async () => {
            /*
            |----------------------------------------------------------------
            | RELOAD ORDER INSIDE TRANSACTION
            |----------------------------------------------------------------
            */

            updatedOrder =
              await Order.findOne({
                _id:
                  order._id,

                customer:
                  req.user._id
              }).session(
                session
              );

            if (!updatedOrder) {
              throw new Error(
                "Order not found during payment verification"
              );
            }

            /*
            |----------------------------------------------------------------
            | IDEMPOTENCY
            |----------------------------------------------------------------
            */

            if (
              updatedOrder.paymentStatus ===
              "paid"
            ) {
              alreadyProcessed =
                true;

              return;
            }

            /*
            |----------------------------------------------------------------
            | INVENTORY RESERVATION CHECK
            |----------------------------------------------------------------
            */

            if (
              updatedOrder.inventoryStatus !==
              "reserved"
            ) {
              throw new Error(
                `Inventory reservation is not available for this payment. Current status: ${updatedOrder.inventoryStatus || "missing"}`
              );
            }

            /*
            |----------------------------------------------------------------
            | COMMIT INVENTORY
            |----------------------------------------------------------------
            */

            await commitInventory({
              order:
                updatedOrder,

              session
            });

            /*
            |----------------------------------------------------------------
            | PAYMENT STATE
            |----------------------------------------------------------------
            */

            updatedOrder.paymentStatus =
              "paid";

            updatedOrder.inventoryStatus =
              "committed";

            /*
            |----------------------------------------------------------------
            | RAZORPAY DATA
            |----------------------------------------------------------------
            */

            updatedOrder.razorpay =
              updatedOrder.razorpay ||
              {};

            updatedOrder.razorpay.orderId =
              razorpay_order_id;

            updatedOrder.razorpay.paymentId =
              razorpay_payment_id;

            updatedOrder.razorpay.signature =
              razorpay_signature;

            /*
            |----------------------------------------------------------------
            | ORDER STATUS
            |----------------------------------------------------------------
            */

            if (
              updatedOrder.orderStatus ===
              "pending"
            ) {
              updatedOrder.orderStatus =
                "confirmed";
            }

            /*
            |----------------------------------------------------------------
            | PAYMENT EXPIRY
            |----------------------------------------------------------------
            */

            updatedOrder.paymentExpiresAt =
              null;

            /*
            |----------------------------------------------------------------
            | SAVE
            |----------------------------------------------------------------
            */

            await updatedOrder.save({
              session
            });
          }
        );
      } finally {
        await session.endSession();
      }

      /*
      |----------------------------------------------------------------------
      | IF ANOTHER REQUEST ALREADY PROCESSED PAYMENT
      |----------------------------------------------------------------------
      */

      if (
        alreadyProcessed
      ) {
        return res
          .status(200)
          .json({
            success: true,

            message:
              "Payment has already been verified",

            data: {
              orderId:
                updatedOrder._id,

              orderNumber:
                updatedOrder.orderNumber,

              paymentId:
                updatedOrder.razorpay
                  ?.paymentId,

              razorpayOrderId:
                updatedOrder.razorpay
                  ?.orderId,

              paymentStatus:
                updatedOrder.paymentStatus,

              orderStatus:
                updatedOrder.orderStatus,

              inventoryStatus:
                updatedOrder.inventoryStatus
            }
          });
      }

      /*
      |----------------------------------------------------------------------
      | NOTIFICATIONS
      |----------------------------------------------------------------------
      */

      await sendPaymentSuccessNotifications({
        req,

        order:
          updatedOrder,

        paymentId:
          razorpay_payment_id
      });

      /*
      |----------------------------------------------------------------------
      | RESPONSE
      |----------------------------------------------------------------------
      */

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Razorpay payment verified successfully",

          data: {
            orderId:
              updatedOrder._id,

            orderNumber:
              updatedOrder.orderNumber,

            paymentId:
              razorpay_payment_id,

            razorpayOrderId:
              razorpay_order_id,

            paymentStatus:
              updatedOrder.paymentStatus,

            orderStatus:
              updatedOrder.orderStatus,

            inventoryStatus:
              updatedOrder.inventoryStatus
          }
        });
    }
  );

/*
|--------------------------------------------------------------------------
| RAZORPAY WEBHOOK
|--------------------------------------------------------------------------
|
| POST
| /api/payments/razorpay/webhook
|
|--------------------------------------------------------------------------
*/

const handleRazorpayWebhook =
  asyncHandler(
    async (
      req,
      res
    ) => {
      /*
      |----------------------------------------------------------------------
      | SIGNATURE
      |----------------------------------------------------------------------
      */

      const webhookSignature =
        req.headers[
          "x-razorpay-signature"
        ];

      if (
        !webhookSignature
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Missing Razorpay webhook signature"
          });
      }

      /*
      |----------------------------------------------------------------------
      | SECRET
      |----------------------------------------------------------------------
      */

      const webhookSecret =
        process.env
          .RAZORPAY_WEBHOOK_SECRET;

      if (
        !webhookSecret
      ) {
        console.error(
          "RAZORPAY_WEBHOOK_SECRET is not configured"
        );

        return res
          .status(500)
          .json({
            success: false,

            message:
              "Razorpay webhook is not configured"
          });
      }

      /*
      |----------------------------------------------------------------------
      | RAW BODY
      |----------------------------------------------------------------------
      */

      if (
        !req.rawBody
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Raw webhook body is missing"
          });
      }

      /*
      |----------------------------------------------------------------------
      | VERIFY WEBHOOK SIGNATURE
      |----------------------------------------------------------------------
      */

      const expectedSignature =
        crypto
          .createHmac(
            "sha256",
            webhookSecret
          )
          .update(
            req.rawBody
          )
          .digest("hex");

      const expectedBuffer =
        Buffer.from(
          expectedSignature,
          "utf8"
        );

      const receivedBuffer =
        Buffer.from(
          String(
            webhookSignature
          ),
          "utf8"
        );

      if (
        expectedBuffer.length !==
          receivedBuffer.length ||
        !crypto.timingSafeEqual(
          expectedBuffer,
          receivedBuffer
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid Razorpay webhook signature"
          });
      }

      /*
      |----------------------------------------------------------------------
      | EVENT
      |----------------------------------------------------------------------
      */

      const event =
        req.body?.event;

      /*
      |--------------------------------------------------------------------------
      | PAYMENT CAPTURED
      |--------------------------------------------------------------------------
      */

      if (
        event ===
        "payment.captured"
      ) {
        const payment =
          req.body?.payload
            ?.payment?.entity;

        if (!payment) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Payment information missing from webhook"
            });
        }

        const razorpayOrderId =
          payment.order_id;

        if (
          !razorpayOrderId
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Razorpay order ID missing from webhook"
            });
        }

        const session =
          await mongoose.startSession();

        let order =
          null;

        let wasAlreadyPaid =
          false;

        let inventoryWasCommitted =
          false;

        try {
          await session.withTransaction(
            async () => {
              /*
              |----------------------------------------------------------------
              | FIND ORDER
              |----------------------------------------------------------------
              */

              order =
                await Order.findOne({
                  "razorpay.orderId":
                    razorpayOrderId
                }).session(
                  session
                );

              if (!order) {
                return;
              }

              /*
              |----------------------------------------------------------------
              | IDEMPOTENCY
              |----------------------------------------------------------------
              */

              if (
                order.paymentStatus ===
                "paid"
              ) {
                wasAlreadyPaid =
                  true;

                return;
              }

              /*
              |----------------------------------------------------------------
              | AMOUNT
              |----------------------------------------------------------------
              */

              const expectedAmount =
                rupeesToPaise(
                  order.totalAmount
                );

              if (
                Number(
                  payment.amount
                ) !==
                expectedAmount
              ) {
                throw new Error(
                  "Webhook payment amount does not match order amount"
                );
              }

              /*
              |----------------------------------------------------------------
              | CURRENCY
              |----------------------------------------------------------------
              */

              if (
                String(
                  payment.currency
                ).toUpperCase() !==
                String(
                  CURRENCY
                ).toUpperCase()
              ) {
                throw new Error(
                  "Webhook payment currency does not match order currency"
                );
              }

              /*
              |----------------------------------------------------------------
              | CAPTURED
              |----------------------------------------------------------------
              */

              if (
                payment.status !==
                "captured"
              ) {
                throw new Error(
                  "Webhook payment is not captured"
                );
              }

              /*
              |----------------------------------------------------------------
              | INVENTORY
              |----------------------------------------------------------------
              */

              if (
                order.inventoryStatus !==
                "reserved"
              ) {
                /*
                |--------------------------------------------------------------
                | If inventory is already committed, another verification
                | path probably completed payment first.
                |--------------------------------------------------------------
                */

                if (
                  order.inventoryStatus ===
                    "committed" &&
                  order.paymentStatus ===
                    "paid"
                ) {
                  wasAlreadyPaid =
                    true;

                  return;
                }

                throw new Error(
                  `Inventory reservation is not available for webhook payment. Current status: ${order.inventoryStatus || "missing"}`
                );
              }

              /*
              |----------------------------------------------------------------
              | COMMIT INVENTORY
              |----------------------------------------------------------------
              */

              await commitInventory({
                order,

                session
              });

              inventoryWasCommitted =
                true;

              /*
              |----------------------------------------------------------------
              | PAYMENT
              |----------------------------------------------------------------
              */

              order.inventoryStatus =
                "committed";

              order.paymentStatus =
                "paid";

              /*
              |----------------------------------------------------------------
              | RAZORPAY PAYMENT
              |----------------------------------------------------------------
              */

              order.razorpay =
                order.razorpay ||
                {};

              order.razorpay.orderId =
                razorpayOrderId;

              order.razorpay.paymentId =
                payment.id;

              /*
              | IMPORTANT:
              | Do not store the webhook signature as the
              | customer payment verification signature.
              */

              /*
              |----------------------------------------------------------------
              | ORDER STATUS
              |----------------------------------------------------------------
              */

              if (
                order.orderStatus ===
                "pending"
              ) {
                order.orderStatus =
                  "confirmed";
              }

              /*
              |----------------------------------------------------------------
              | EXPIRY
              |----------------------------------------------------------------
              */

              order.paymentExpiresAt =
                null;

              await order.save({
                session
              });
            }
          );
        } finally {
          await session.endSession();
        }

        /*
        |----------------------------------------------------------------------
        | ORDER NOT FOUND
        |----------------------------------------------------------------------
        */

        if (!order) {
          return res
            .status(200)
            .json({
              success: true,

              message:
                "Webhook received; order not found locally"
            });
        }

        /*
        |----------------------------------------------------------------------
        | SUCCESS NOTIFICATIONS
        |----------------------------------------------------------------------
        */

        if (
          inventoryWasCommitted &&
          !wasAlreadyPaid
        ) {
          await sendPaymentSuccessNotifications({
            req,

            order,

            paymentId:
              payment.id
          });
        }

        return res
          .status(200)
          .json({
            success: true,

            message:
              "Razorpay payment captured webhook processed"
          });
      }

      /*
      |--------------------------------------------------------------------------
      | PAYMENT FAILED
      |--------------------------------------------------------------------------
      */

      if (
        event ===
        "payment.failed"
      ) {
        const payment =
          req.body?.payload
            ?.payment?.entity;

        if (!payment) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Payment information missing from webhook"
            });
        }

        const razorpayOrderId =
          payment.order_id;

        if (
          !razorpayOrderId
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Razorpay order ID missing from webhook"
            });
        }

        const session =
          await mongoose.startSession();

        let order =
          null;

        let wasAlreadyPaid =
          false;

        let reservationReleased =
          false;

        try {
          await session.withTransaction(
            async () => {
              order =
                await Order.findOne({
                  "razorpay.orderId":
                    razorpayOrderId
                }).session(
                  session
                );

              if (!order) {
                return;
              }

              /*
              |----------------------------------------------------------------
              | NEVER CHANGE PAID TO FAILED
              |----------------------------------------------------------------
              */

              if (
                order.paymentStatus ===
                "paid"
              ) {
                wasAlreadyPaid =
                  true;

                return;
              }

              /*
              |----------------------------------------------------------------
              | RELEASE RESERVATION
              |----------------------------------------------------------------
              */

              if (
                order.inventoryStatus ===
                "reserved"
              ) {
                await releaseInventory({
                  order,

                  session
                });

                order.inventoryStatus =
                  "released";

                reservationReleased =
                  true;
              }

              /*
              |----------------------------------------------------------------
              | PENDING INVENTORY
              |----------------------------------------------------------------
              */

              if (
                order.inventoryStatus ===
                "pending"
              ) {
                order.inventoryStatus =
                  "released";

                reservationReleased =
                  true;
              }

              /*
              |----------------------------------------------------------------
              | COMMITTED
              |----------------------------------------------------------------
              |
              | Do not release physical stock here.
              |
              | A committed order means payment/inventory finalization
              | already happened.
              |
              |----------------------------------------------------------------
              */

              if (
                order.inventoryStatus ===
                "committed"
              ) {
                wasAlreadyPaid =
                  true;

                return;
              }

              /*
              |----------------------------------------------------------------
              | PAYMENT STATE
              |----------------------------------------------------------------
              */

              order.paymentStatus =
                "failed";

              order.paymentExpiresAt =
                null;

              await order.save({
                session
              });
            }
          );
        } finally {
          await session.endSession();
        }

        /*
        |----------------------------------------------------------------------
        | ORDER NOT FOUND
        |----------------------------------------------------------------------
        */

        if (!order) {
          return res
            .status(200)
            .json({
              success: true,

              message:
                "Webhook received; order not found locally"
            });
        }

        /*
        |----------------------------------------------------------------------
        | FAILURE NOTIFICATIONS
        |----------------------------------------------------------------------
        */

        if (
          reservationReleased &&
          !wasAlreadyPaid
        ) {
          await sendPaymentFailureNotifications({
            req,

            order,

            payment
          });
        }

        return res
          .status(200)
          .json({
            success: true,

            message:
              "Razorpay payment failed webhook processed"
          });
      }

      /*
      |--------------------------------------------------------------------------
      | OTHER EVENTS
      |--------------------------------------------------------------------------
      */

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Razorpay webhook received"
        });
    }
  );

/*
|--------------------------------------------------------------------------
| PAYMENT SUCCESS NOTIFICATIONS
|--------------------------------------------------------------------------
*/

const sendPaymentSuccessNotifications =
  async ({
    req,
    order,
    paymentId
  }) => {
    /*
    | CUSTOMER
    */

    await safeNotifyUser({
      req,

      recipient:
        order.customer,

      type:
        "payment_successful",

      title:
        "Payment successful",

      message:
        `Payment received successfully for order ${order.orderNumber}.`,

      data: {
        orderId:
          order._id,

        orderNumber:
          order.orderNumber,

        paymentId,

        paymentStatus:
          order.paymentStatus,

        orderStatus:
          order.orderStatus,

        inventoryStatus:
          order.inventoryStatus
      }
    });

    /*
    | SELLERS
    */

    const sellerIds =
      getSellerIds(order);

    if (
      sellerIds.length > 0
    ) {
      await safeNotifyUsers({
        req,

        recipients:
          sellerIds,

        type:
          "payment_successful",

        title:
          "Customer payment received",

        message:
          `Payment was successfully received for order ${order.orderNumber}.`,

        data: {
          orderId:
            order._id,

          orderNumber:
            order.orderNumber,

          paymentId
        }
      });
    }

    /*
    | ADMIN
    */

    try {
      const admins =
        await User.find({
          role:
            "admin",

          isActive:
            true
        })
          .select("_id")
          .lean();

      const adminIds =
        admins.map(
          (admin) =>
            String(
              admin._id
            )
        );

      if (
        adminIds.length > 0
      ) {
        await safeNotifyUsers({
          req,

          recipients:
            adminIds,

          type:
            "payment_successful",

          title:
            "Razorpay payment captured",

          message:
            `Razorpay payment captured for order ${order.orderNumber}.`,

          data: {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            paymentId
          }
        });
      }
    } catch (error) {
      console.error(
        "Admin payment notification failed:",
        error.message
      );
    }

    /*
    | SOCKET
    */

    try {
      const io =
        req.app.get("io");

      if (!io) {
        return;
      }

      /*
      | CUSTOMER
      */

      io.to(
        `user:${order.customer}`
      ).emit(
        "payment:success",
        {
          orderId:
            order._id,

          orderNumber:
            order.orderNumber,

          paymentId,

          paymentStatus:
            order.paymentStatus,

          orderStatus:
            order.orderStatus,

          inventoryStatus:
            order.inventoryStatus
        }
      );

      /*
      | SELLERS
      */

      for (
        const sellerId of sellerIds
      ) {
        io.to(
          `seller:${sellerId}`
        ).emit(
          "payment:success",
          {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            paymentStatus:
              order.paymentStatus,

            inventoryStatus:
              order.inventoryStatus
          }
        );
      }

      /*
      | ADMIN
      */

      io.to(
        "admin"
      ).emit(
        "payment:success",
        {
          orderId:
            order._id,

          orderNumber:
            order.orderNumber,

          paymentStatus:
            order.paymentStatus,

          inventoryStatus:
            order.inventoryStatus
        }
      );
    } catch (error) {
      console.error(
        "Payment socket notification failed:",
        error.message
      );
    }
  };

/*
|--------------------------------------------------------------------------
| PAYMENT FAILURE NOTIFICATIONS
|--------------------------------------------------------------------------
*/

const sendPaymentFailureNotifications =
  async ({
    req,
    order,
    payment
  }) => {
    /*
    | CUSTOMER
    */

    await safeNotifyUser({
      req,

      recipient:
        order.customer,

      type:
        "payment_failed",

      title:
        "Payment failed",

      message:
        `Payment failed for order ${order.orderNumber}. Please try again.`,

      data: {
        orderId:
          order._id,

        orderNumber:
          order.orderNumber,

        paymentId:
          payment.id,

        paymentStatus:
          order.paymentStatus,

        inventoryStatus:
          order.inventoryStatus,

        errorCode:
          payment.error_code,

        errorDescription:
          payment.error_description
      }
    });

    /*
    | SELLERS
    */

    const sellerIds =
      getSellerIds(order);

    if (
      sellerIds.length > 0
    ) {
      await safeNotifyUsers({
        req,

        recipients:
          sellerIds,

        type:
          "payment_failed",

        title:
          "Customer payment failed",

        message:
          `Payment failed for order ${order.orderNumber}.`,

        data: {
          orderId:
            order._id,

          orderNumber:
            order.orderNumber,

          paymentId:
            payment.id
        }
      });
    }

    /*
    | ADMIN
    */

    try {
      const admins =
        await User.find({
          role:
            "admin",

          isActive:
            true
        })
          .select("_id")
          .lean();

      const adminIds =
        admins.map(
          (admin) =>
            String(
              admin._id
            )
        );

      if (
        adminIds.length > 0
      ) {
        await safeNotifyUsers({
          req,

          recipients:
            adminIds,

          type:
            "payment_failed",

          title:
            "Razorpay payment failed",

          message:
            `Razorpay payment failed for order ${order.orderNumber}.`,

          data: {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            paymentId:
              payment.id,

            errorCode:
              payment.error_code,

            errorDescription:
              payment.error_description
          }
        });
      }
    } catch (error) {
      console.error(
        "Admin payment failure notification failed:",
        error.message
      );
    }

    /*
    | SOCKET
    */

    try {
      const io =
        req.app.get("io");

      if (!io) {
        return;
      }

      /*
      | CUSTOMER
      */

      io.to(
        `user:${order.customer}`
      ).emit(
        "payment:failed",
        {
          orderId:
            order._id,

          orderNumber:
            order.orderNumber,

          paymentId:
            payment.id,

          paymentStatus:
            order.paymentStatus,

          inventoryStatus:
            order.inventoryStatus,

          errorCode:
            payment.error_code,

          errorDescription:
            payment.error_description
        }
      );

      /*
      | SELLERS
      */

      for (
        const sellerId of sellerIds
      ) {
        io.to(
          `seller:${sellerId}`
        ).emit(
          "payment:failed",
          {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            paymentStatus:
              order.paymentStatus,

            inventoryStatus:
              order.inventoryStatus
          }
        );
      }

      /*
      | ADMIN
      */

      io.to(
        "admin"
      ).emit(
        "payment:failed",
        {
          orderId:
            order._id,

          orderNumber:
            order.orderNumber,

          paymentStatus:
            order.paymentStatus,

          inventoryStatus:
            order.inventoryStatus
        }
      );
    } catch (error) {
      console.error(
        "Payment failure socket notification failed:",
        error.message
      );
    }
  };

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  rupeesToPaise,
  paiseToRupees
};