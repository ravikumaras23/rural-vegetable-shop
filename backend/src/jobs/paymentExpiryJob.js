const mongoose = require("mongoose");

const Order = require("../models/Order");

const {
  releaseInventory
} = require("../services/inventoryService");

const processExpiredPayments =
  async () => {
    const now = new Date();

    const expiredOrders =
      await Order.find({
        paymentMethod: "razorpay",

        paymentStatus: "pending",

        orderStatus: {
          $ne: "cancelled"
        },

        inventoryStatus:
          "reserved",

        paymentExpiresAt: {
          $ne: null,
          $lte: now
        }
      }).select("_id");

    for (
      const orderSummary of expiredOrders
    ) {
      const session =
        await mongoose.startSession();

      try {
        await session.withTransaction(
          async () => {
            const order =
              await Order.findOne({
                _id:
                  orderSummary._id,

                paymentMethod:
                  "razorpay",

                paymentStatus:
                  "pending",

                inventoryStatus:
                  "reserved",

                paymentExpiresAt: {
                  $ne: null,
                  $lte: now
                }
              }).session(
                session
              );

            /*
            |--------------------------------------------------------------------------
            | Another process may already have handled it.
            |--------------------------------------------------------------------------
            */

            if (!order) {
              return;
            }

            await releaseInventory({
              order,

              session
            });

            order.inventoryStatus =
              "released";

            order.paymentStatus =
              "failed";

            order.paymentExpiresAt =
              null;

            /*
            |--------------------------------------------------------------------------
            | Keep the application order pending/cancelled
            | rather than pretending the customer completed it.
            |--------------------------------------------------------------------------
            */

            if (
              order.orderStatus ===
              "pending"
            ) {
              order.orderStatus =
                "cancelled";

              order.cancellationReason =
                "Razorpay payment window expired";

              order.cancelledAt =
                new Date();
            }

            await order.save({
              session
            });
          }
        );
      } catch (error) {
        console.error(
          `Failed to expire payment for order ${orderSummary._id}:`,
          error.message
        );
      } finally {
        await session.endSession();
      }
    }
  };

module.exports =
  processExpiredPayments;