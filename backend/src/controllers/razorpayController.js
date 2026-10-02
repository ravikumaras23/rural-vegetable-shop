const crypto =
  require("crypto");

const mongoose =
  require("mongoose");

const Razorpay =
  require("razorpay");

const Order =
  require("../models/Order");

const SellerPaymentSettings =
  require("../models/SellerPaymentSettings");

const asyncHandler =
  require("../utils/asyncHandler");

const {
  commitInventory
} =
  require("../services/inventoryService");

const CURRENCY =
  process.env
    .RAZORPAY_CURRENCY ||
  "INR";

const TIMEOUT =
  Math.max(
    Number(
      process.env
        .RAZORPAY_PAYMENT_TIMEOUT_MINUTES
    ) || 15,
    1
  );

/*
|--------------------------------------------------------------------------
| VALIDATE OBJECT ID
|--------------------------------------------------------------------------
*/

const isValidObjectId =
  (id) =>
    mongoose.Types.ObjectId.isValid(
      id
    );

/*
|--------------------------------------------------------------------------
| MONEY
|--------------------------------------------------------------------------
*/

const rupeesToPaise =
  (amount) => {
    const value =
      Number(
        amount
      );

    if (
      !Number.isFinite(
        value
      ) ||
      value <=
        0
    ) {
      return 0;
    }

    return Math.round(
      value * 100
    );
  };

const paiseToRupees =
  (amount) =>
    Number(
      amount
    ) /
    100;

/*
|--------------------------------------------------------------------------
| DECRYPT SELLER SECRET
|--------------------------------------------------------------------------
*/

const decryptSellerSecret =
  (settings) => {
    if (
      !settings ||
      !settings.razorpaySecretEncrypted ||
      !settings.razorpaySecretIv ||
      !settings.razorpaySecretAuthTag
    ) {
      return "";
    }

    const encryptionSecret =
      process.env
        .PAYMENT_SETTINGS_ENCRYPTION_KEY;

    if (
      !encryptionSecret
    ) {
      throw new Error(
        "PAYMENT_SETTINGS_ENCRYPTION_KEY is not configured"
      );
    }

    const key =
      crypto
        .createHash(
          "sha256"
        )
        .update(
          encryptionSecret
        )
        .digest();

    const decipher =
      crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(
          settings
            .razorpaySecretIv,
          "base64"
        )
      );

    decipher.setAuthTag(
      Buffer.from(
        settings
          .razorpaySecretAuthTag,
        "base64"
      )
    );

    const decrypted =
      Buffer.concat([
        decipher.update(
          Buffer.from(
            settings
              .razorpaySecretEncrypted,
            "base64"
          )
        ),

        decipher.final()
      ]);

    return decrypted.toString(
      "utf8"
    );
  };

/*
|--------------------------------------------------------------------------
| GET RAZORPAY ACCOUNT
|--------------------------------------------------------------------------
*/

const getRazorpayAccount =
  async (
    order
  ) => {
    const sellerIds =
      [
        ...new Set(
          order.items.map(
            (
              item
            ) =>
              String(
                item.seller
              )
          )
        )
      ];

    /*
    |--------------------------------------------------------------------------
    | SINGLE SELLER → SELLER ACCOUNT
    |--------------------------------------------------------------------------
    */

    if (
      sellerIds.length ===
      1
    ) {
      const sellerSettings =
        await SellerPaymentSettings.findOne(
          {
            seller:
              sellerIds[0],

            razorpayEnabled:
              true
          }
        ).lean();

      if (
        sellerSettings?.razorpayKeyId &&
        sellerSettings?.razorpaySecretEncrypted
      ) {
        const secret =
          decryptSellerSecret(
            sellerSettings
          );

        if (
          secret
        ) {
          return {
            client:
              new Razorpay({
                key_id:
                  sellerSettings.razorpayKeyId,

                key_secret:
                  secret
              }),

            keyId:
              sellerSettings.razorpayKeyId,

            accountType:
              "seller",

            sellerId:
              sellerIds[0]
          };
        }
      }
    }

    /*
    |--------------------------------------------------------------------------
    | PLATFORM FALLBACK
    |--------------------------------------------------------------------------
    */

    if (
      !process.env
        .RAZORPAY_KEY_ID ||
      !process.env
        .RAZORPAY_KEY_SECRET
    ) {
      throw new Error(
        "Platform Razorpay credentials are not configured"
      );
    }

    return {
      client:
        new Razorpay({
          key_id:
            process.env
              .RAZORPAY_KEY_ID,

          key_secret:
            process.env
              .RAZORPAY_KEY_SECRET
        }),

      keyId:
        process.env
          .RAZORPAY_KEY_ID,

      accountType:
        "platform",

      sellerId:
        null
    };
  };

/*
|--------------------------------------------------------------------------
| CREATE RAZORPAY ORDER
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
      } = req.params;

      if (
        !isValidObjectId(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID"
        });
      }

      const order =
        await Order.findOne({
          _id:
            orderId,

          customer:
            req.user._id
        });

      if (
        !order
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found"
        });
      }

      if (
        order.paymentMethod !==
        "razorpay"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Order is not configured for Razorpay"
        });
      }

      if (
        order.paymentStatus ===
        "paid"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Order has already been paid"
        });
      }

      if (
        order.orderStatus ===
        "cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cancelled orders cannot be paid"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CRITICAL INVENTORY CHECK
      |--------------------------------------------------------------------------
      */

      if (
        order.inventoryStatus !==
          "reserved" ||
        order.inventoryReserved !==
          true
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Inventory is not reserved for this order",

          inventoryStatus:
            order.inventoryStatus ||
            "missing",

          inventoryReserved:
            order.inventoryReserved
        });
      }

      if (
        order.paymentExpiresAt &&
        order.paymentExpiresAt <=
          new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment window has expired. Please create a new order."
        });
      }

      const amount =
        rupeesToPaise(
          order.totalAmount
        );

      if (
        amount <=
        0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order amount"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | EXISTING GATEWAY ORDER
      |--------------------------------------------------------------------------
      */

      if (
        order.razorpay?.orderId
      ) {
        return res.status(200).json({
          success: true,

          message:
            "Existing Razorpay order retrieved",

          data: {
            keyId:
              order.razorpay.keyId,

            razorpayOrderId:
              order.razorpay.orderId,

            amount,

            amountInRupees:
              paiseToRupees(
                amount
              ),

            currency:
              CURRENCY,

            accountType:
              order
                .razorpay
                .accountType ||
              "platform",

            sellerId:
              order
                .razorpay
                .sellerId ||
              null,

            paymentExpiresAt:
              order.paymentExpiresAt
          }
        });
      }

      const {
        client,
        keyId,
        accountType,
        sellerId
      } =
        await getRazorpayAccount(
          order
        );

      let gatewayOrder;

      try {
        gatewayOrder =
          await client.orders.create({
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

        /*
        |--------------------------------------------------------------------------
        | 502 so frontend can offer QR fallback
        |--------------------------------------------------------------------------
        */

        return res.status(502).json({
          success: false,

          message:
            error?.error?.description ||
            error?.description ||
            error?.message ||
            "Razorpay gateway authentication failed",

          code:
            "RAZORPAY_GATEWAY_ERROR",

          canFallbackToQr:
            true,

          accountType
        });
      }

      order.razorpay =
        order.razorpay ||
        {};

      order.razorpay.orderId =
        gatewayOrder.id;

      order.razorpay.accountType =
        accountType;

      order.razorpay.sellerId =
        sellerId;

      order.razorpay.keyId =
        keyId;

      if (
        !order.paymentExpiresAt
      ) {
        order.paymentExpiresAt =
          new Date(
            Date.now() +
              TIMEOUT *
                60 *
                1000
          );
      }

      await order.save();

      return res.status(201).json({
        success: true,

        message:
          "Razorpay order created successfully",

        data: {
          keyId,

          razorpayOrderId:
            gatewayOrder.id,

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

          accountType,

          sellerId
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| VERIFY PAYMENT
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
      } = req.body;

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Razorpay verification data is incomplete"
        });
      }

      const order =
        await Order.findOne({
          "razorpay.orderId":
            razorpay_order_id,

          customer:
            req.user._id
        });

      if (
        !order
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Order associated with payment was not found"
        });
      }

      if (
        order.paymentStatus ===
        "paid"
      ) {
        return res.status(200).json({
          success: true,

          message:
            "Payment already verified",

          data: {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            paymentStatus:
              order.paymentStatus,

            orderStatus:
              order.orderStatus,

            inventoryStatus:
              order.inventoryStatus
          }
        });
      }

      if (
        order.inventoryStatus !==
          "reserved" ||
        order.inventoryReserved !==
          true
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Inventory reservation is not available for this payment"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CORRECT SECRET
      |--------------------------------------------------------------------------
      */

      let secret =
        process.env
          .RAZORPAY_KEY_SECRET;

      if (
        order.razorpay
          ?.accountType ===
          "seller" &&
        order.razorpay
          ?.sellerId
      ) {
        const settings =
          await SellerPaymentSettings.findOne(
            {
              seller:
                order
                  .razorpay
                  .sellerId
            }
          ).lean();

        secret =
          decryptSellerSecret(
            settings
          );
      }

      if (
        !secret
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Razorpay secret is not configured"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | SIGNATURE
      |--------------------------------------------------------------------------
      */

      const generated =
        crypto
          .createHmac(
            "sha256",
            secret
          )
          .update(
            `${razorpay_order_id}|${razorpay_payment_id}`
          )
          .digest(
            "hex"
          );

      const generatedBuffer =
        Buffer.from(
          generated,
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
        return res.status(400).json({
          success: false,
          message:
            "Invalid Razorpay payment signature"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CREATE CLIENT
      |--------------------------------------------------------------------------
      */

      const gateway =
        await getRazorpayAccount(
          order
        );

      let gatewayOrder;

      try {
        gatewayOrder =
          await gateway.client.orders.fetch(
            razorpay_order_id
          );
      } catch (error) {
        return res.status(502).json({
          success: false,
          message:
            "Unable to fetch Razorpay order"
        });
      }

      const expectedAmount =
        rupeesToPaise(
          order.totalAmount
        );

      if (
        Number(
          gatewayOrder.amount
        ) !==
        expectedAmount
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount does not match order amount"
        });
      }

      if (
        String(
          gatewayOrder.currency
        ).toUpperCase() !==
        CURRENCY.toUpperCase()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment currency does not match order currency"
        });
      }

      if (
        gatewayOrder.status !==
        "paid"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Razorpay order has not been paid"
        });
      }

      let payment;

      try {
        payment =
          await gateway.client.payments.fetch(
            razorpay_payment_id
          );
      } catch (error) {
        return res.status(502).json({
          success: false,
          message:
            "Unable to fetch Razorpay payment"
        });
      }

      if (
        String(
          payment.order_id
        ) !==
        String(
          razorpay_order_id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment does not belong to this order"
        });
      }

      if (
        Number(
          payment.amount
        ) !==
        expectedAmount
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount mismatch"
        });
      }

      if (
        payment.status !==
        "captured"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Razorpay payment is not captured"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | COMMIT
      |--------------------------------------------------------------------------
      */

      const session =
        await mongoose.startSession();

      let updatedOrder =
        null;

      try {
        await session.withTransaction(
          async () => {
            updatedOrder =
              await Order.findById(
                order._id
              ).session(
                session
              );

            if (
              !updatedOrder
            ) {
              throw new Error(
                "Order not found during payment verification"
              );
            }

            if (
              updatedOrder.paymentStatus ===
              "paid"
            ) {
              return;
            }

            if (
              updatedOrder.inventoryStatus !==
                "reserved" ||
              updatedOrder.inventoryReserved !==
                true
            ) {
              throw new Error(
                "Inventory reservation is not available for this payment"
              );
            }

            await commitInventory({
              order:
                updatedOrder,

              session
            });

            updatedOrder.inventoryStatus =
              "committed";

            updatedOrder.inventoryReserved =
              false;

            updatedOrder.inventoryReleased =
              false;

            updatedOrder.paymentStatus =
              "paid";

            updatedOrder.orderStatus =
              "confirmed";

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
            |--------------------------------------------------------------------------
            | Seller payment records
            |--------------------------------------------------------------------------
            */

            updatedOrder.sellerPayments =
              updatedOrder.sellerPayments.map(
                (
                  item
                ) => ({
                  ...item,
                  status:
                    "paid"
                })
              );

            updatedOrder.paymentExpiresAt =
              null;

            await updatedOrder.save({
              session
            });
          }
        );
      } finally {
        await session.endSession();
      }

      return res.status(200).json({
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

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  rupeesToPaise,
  paiseToRupees
};