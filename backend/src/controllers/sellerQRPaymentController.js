const mongoose = require("mongoose");

const Order = require("../models/Order");

const {
  commitInventory
} = require("../services/inventoryService");

const {
  notifyUser,
  notifyUsers
} = require("../services/businessNotificationService");

const asyncHandler =
  require("../utils/asyncHandler");

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const getIo = (req) => {
  return req.app.get("io");
};

const emitPaymentUpdate = ({
  req,
  order,
  payment
}) => {
  const io = getIo(req);

  if (!io) {
    return;
  }

  const payload = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    paymentId: payment?._id || null,
    sellerId: payment?.seller || null,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    inventoryStatus: order.inventoryStatus,
    sellerPaymentStatus: payment?.status || null,
    transactionReference:
      payment?.transactionReference || ""
  };

  if (order.customer) {
    io.to(
      `user:${order.customer}`
    ).emit(
      "qr-payment:updated",
      payload
    );
  }

  if (payment?.seller) {
    io.to(
      `seller:${payment.seller}`
    ).emit(
      "seller:qr-payment-updated",
      payload
    );
  }
};

const normalizeReference = (
  value
) => {
  return String(
    value || ""
  ).trim();
};

const isValidPaymentId = (
  paymentId
) => {
  return mongoose.Types.ObjectId.isValid(
    paymentId
  );
};

/*
|--------------------------------------------------------------------------
| SUBMIT SELLER QR PAYMENT
|--------------------------------------------------------------------------
|
| Customer submits UTR / transaction reference for one seller payment.
|
*/

const submitSellerPayment =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const {
        orderId,
        paymentId
      } = req.params;

      const {
        transactionReference
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID"
        });
      }

      if (
        !isValidPaymentId(
          paymentId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment ID"
        });
      }

      const reference =
        normalizeReference(
          transactionReference
        );

      if (
        reference.length < 6 ||
        reference.length > 120
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid UTR / transaction reference"
        });
      }

      const order =
        await Order.findOne({
          _id: orderId,
          customer: req.user._id,
          paymentMethod:
            "seller_qr"
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Seller QR order not found"
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
            "Inventory reservation is not available for this order"
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
            "Payment window has expired"
        });
      }

      const payment =
        order.sellerPayments.find(
          (item) =>
            String(item._id) ===
            String(paymentId)
        );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Seller payment record not found"
        });
      }

      if (
        payment.status ===
        "paid"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This seller payment is already verified"
        });
      }

      payment.status =
        "submitted";

      payment.transactionReference =
        reference;

      payment.submittedAt =
        new Date();

      payment.rejectionReason =
        "";

      payment.verifiedAt =
        null;

      payment.verifiedBy =
        null;

      const allPaid =
        order.sellerPayments.every(
          (item) =>
            item.status ===
            "paid"
        );

      order.paymentStatus =
        allPaid
          ? "paid"
          : "partially_paid";

      await order.save();

      emitPaymentUpdate({
        req,
        order,
        payment
      });

      await notifyUser({
        userId:
          order.customer,
        type:
          "payment_submitted",
        title:
          "Seller payment submitted",
        message:
          `Payment reference submitted for order ${order.orderNumber}.`,
        data: {
          orderId:
            order._id,
          paymentId:
            payment._id,
          sellerId:
            payment.seller,
          transactionReference:
            reference
        }
      }).catch(() => {});

      await notifyUser({
        userId:
          payment.seller,
        type:
          "seller_payment_submitted",
        title:
          "New seller payment submitted",
        message:
          `A customer submitted payment for order ${order.orderNumber}.`,
        data: {
          orderId:
            order._id,
          paymentId:
            payment._id,
          sellerId:
            payment.seller,
          transactionReference:
            reference,
          amount:
            payment.amount
        }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message:
          "Payment reference submitted successfully",
        data: {
          orderId:
            order._id,
          paymentId:
            payment._id,
          sellerId:
            payment.seller,
          status:
            payment.status,
          transactionReference:
            payment.transactionReference,
          paymentStatus:
            order.paymentStatus,
          paymentExpiresAt:
            order.paymentExpiresAt
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| GET SELLER QR PAYMENTS
|--------------------------------------------------------------------------
|
| Seller gets payments belonging only to that seller.
|
*/

const getSellerQRPayments =
  asyncHandler(
    async (
      req,
      res
    ) => {
      if (
        req.user.role !==
        "seller"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only sellers can access seller QR payments"
        });
      }

      const orders =
        await Order.find({
          paymentMethod:
            "seller_qr",
          "sellerPayments.seller":
            req.user._id
        })
          .populate(
            "customer",
            "name email phone"
          )
          .populate(
            "items.product",
            "name images unit"
          )
          .sort({
            createdAt: -1
          });

      const data = [];

      for (
        const order of orders
      ) {
        const sellerPayments =
          order.sellerPayments.filter(
            (payment) =>
              String(
                payment.seller
              ) ===
              String(
                req.user._id
              )
          );

        for (
          const payment of sellerPayments
        ) {
          data.push({
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            customer:
              order.customer,

            paymentId:
              payment._id,

            sellerId:
              payment.seller,

            amount:
              payment.amount,

            paymentMethod:
              payment.paymentMethod,

            status:
              payment.status,

            transactionReference:
              payment.transactionReference,

            submittedAt:
              payment.submittedAt,

            verifiedAt:
              payment.verifiedAt,

            verifiedBy:
              payment.verifiedBy,

            rejectionReason:
              payment.rejectionReason,

            orderPaymentStatus:
              order.paymentStatus,

            orderStatus:
              order.orderStatus,

            paymentExpiresAt:
              order.paymentExpiresAt,

            createdAt:
              order.createdAt
          });
        }
      }

      return res.status(200).json({
        success: true,
        count:
          data.length,
        data
      });
    }
  );

/*
|--------------------------------------------------------------------------
| VERIFY SELLER QR PAYMENT
|--------------------------------------------------------------------------
|
| Seller verifies one specific seller payment.
|
*/

const verifySellerPayment =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const {
        orderId,
        paymentId
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID"
        });
      }

      if (
        !isValidPaymentId(
          paymentId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment ID"
        });
      }

      if (
        req.user.role !==
          "seller" &&
        req.user.role !==
          "admin"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to verify seller payments"
        });
      }

      const order =
        await Order.findOne({
          _id: orderId,
          paymentMethod:
            "seller_qr"
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Seller QR order not found"
        });
      }

      const payment =
        order.sellerPayments.find(
          (item) =>
            String(item._id) ===
            String(paymentId)
        );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Seller payment record not found"
        });
      }

      if (
        req.user.role ===
          "seller" &&
        String(
          payment.seller
        ) !==
          String(
            req.user._id
          )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only verify your own seller payment"
        });
      }

      if (
        payment.status !==
        "submitted"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only submitted payments can be verified"
        });
      }

      if (
        !payment.transactionReference
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction reference is missing"
        });
      }

      const session =
        await mongoose.startSession();

      let updatedOrder =
        null;

      try {
        await session.withTransaction(
          async () => {
            updatedOrder =
              await Order.findOne({
                _id: orderId,
                paymentMethod:
                  "seller_qr"
              }).session(
                session
              );

            if (!updatedOrder) {
              throw new Error(
                "ORDER_NOT_FOUND"
              );
            }

            const currentPayment =
              updatedOrder.sellerPayments.find(
                (item) =>
                  String(
                    item._id
                  ) ===
                  String(
                    paymentId
                  )
              );

            if (
              !currentPayment
            ) {
              throw new Error(
                "PAYMENT_NOT_FOUND"
              );
            }

            if (
              currentPayment.status !==
              "submitted"
            ) {
              throw new Error(
                "PAYMENT_NOT_SUBMITTED"
              );
            }

            if (
              req.user.role ===
                "seller" &&
              String(
                currentPayment.seller
              ) !==
                String(
                  req.user._id
                )
            ) {
              throw new Error(
                "SELLER_NOT_OWNER"
              );
            }

            currentPayment.status =
              "paid";

            currentPayment.verifiedAt =
              new Date();

            currentPayment.verifiedBy =
              req.user._id;

            currentPayment.rejectionReason =
              "";

            const allPaid =
              updatedOrder.sellerPayments.every(
                (item) =>
                  item.status ===
                  "paid"
              );

            if (
              allPaid
            ) {
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

              updatedOrder.paymentExpiresAt =
                null;

              await updatedOrder.save({
                session
              });
            } else {
              updatedOrder.paymentStatus =
                "partially_paid";

              await updatedOrder.save({
                session
              });
            }
          }
        );
      } catch (error) {
        if (
          error.message ===
          "ORDER_NOT_FOUND"
        ) {
          return res.status(404).json({
            success: false,
            message:
              "Order not found"
          });
        }

        if (
          error.message ===
          "PAYMENT_NOT_FOUND"
        ) {
          return res.status(404).json({
            success: false,
            message:
              "Seller payment record not found"
          });
        }

        if (
          error.message ===
          "PAYMENT_NOT_SUBMITTED"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "This payment is no longer awaiting verification"
          });
        }

        if (
          error.message ===
          "SELLER_NOT_OWNER"
        ) {
          return res.status(403).json({
            success: false,
            message:
              "You can only verify your own seller payment"
          });
        }

        throw error;
      } finally {
        await session.endSession();
      }

      const updatedPayment =
        updatedOrder.sellerPayments.find(
          (item) =>
            String(
              item._id
            ) ===
            String(
              paymentId
            )
        );

      emitPaymentUpdate({
        req,
        order:
          updatedOrder,
        payment:
          updatedPayment
      });

      if (
        updatedPayment
      ) {
        await notifyUser({
          userId:
            updatedOrder.customer,
          type:
            "seller_payment_verified",
          title:
            "Seller payment verified",
          message:
            `Your seller payment for order ${updatedOrder.orderNumber} has been verified.`,
          data: {
            orderId:
              updatedOrder._id,
            paymentId:
              updatedPayment._id,
            sellerId:
              updatedPayment.seller,
            paymentStatus:
              updatedOrder.paymentStatus,
            orderStatus:
              updatedOrder.orderStatus
          }
        }).catch(() => {});
      }

      if (
        updatedOrder.paymentStatus ===
        "paid"
      ) {
        await notifyUsers({
          userIds: [
            updatedOrder.customer
          ],
          type:
            "order_confirmed",
          title:
            "Order confirmed",
          message:
            `All seller payments for order ${updatedOrder.orderNumber} are verified. Your order is confirmed.`,
          data: {
            orderId:
              updatedOrder._id,
            orderNumber:
              updatedOrder.orderNumber,
            paymentStatus:
              updatedOrder.paymentStatus,
            orderStatus:
              updatedOrder.orderStatus
          }
        }).catch(() => {});
      }

      return res.status(200).json({
        success: true,
        message:
          "Seller payment verified successfully",
        data: {
          orderId:
            updatedOrder._id,

          paymentId:
            updatedPayment?._id,

          sellerId:
            updatedPayment?.seller,

          sellerPaymentStatus:
            updatedPayment?.status,

          transactionReference:
            updatedPayment?.transactionReference,

          paymentStatus:
            updatedOrder.paymentStatus,

          orderStatus:
            updatedOrder.orderStatus,

          inventoryStatus:
            updatedOrder.inventoryStatus,

          sellerPayments:
            updatedOrder.sellerPayments
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| REJECT SELLER QR PAYMENT
|--------------------------------------------------------------------------
|
| Seller rejects a submitted payment.
| Customer can submit a new reference afterwards.
|
*/

const rejectSellerPayment =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const {
        orderId,
        paymentId
      } = req.params;

      const {
        rejectionReason
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID"
        });
      }

      if (
        !isValidPaymentId(
          paymentId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment ID"
        });
      }

      if (
        req.user.role !==
        "seller"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only sellers can reject seller payments"
        });
      }

      const reason =
        String(
          rejectionReason ||
            ""
        ).trim();

      if (
        reason.length < 3
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a rejection reason"
        });
      }

      const order =
        await Order.findOne({
          _id: orderId,
          paymentMethod:
            "seller_qr"
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Seller QR order not found"
        });
      }

      const payment =
        order.sellerPayments.find(
          (item) =>
            String(item._id) ===
            String(paymentId)
        );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Seller payment record not found"
        });
      }

      if (
        String(
          payment.seller
        ) !==
        String(
          req.user._id
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only reject your own seller payment"
        });
      }

      if (
        payment.status !==
        "submitted"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only submitted payments can be rejected"
        });
      }

      payment.status =
        "pending";

      payment.rejectionReason =
        reason;

      payment.transactionReference =
        "";

      payment.submittedAt =
        null;

      payment.verifiedAt =
        null;

      payment.verifiedBy =
        null;

      const allPaid =
        order.sellerPayments.every(
          (item) =>
            item.status ===
            "paid"
        );

      order.paymentStatus =
        allPaid
          ? "paid"
          : "partially_paid";

      await order.save();

      emitPaymentUpdate({
        req,
        order,
        payment
      });

      await notifyUser({
        userId:
          order.customer,
        type:
          "seller_payment_rejected",
        title:
          "Seller payment rejected",
        message:
          `Your payment for order ${order.orderNumber} was rejected. Reason: ${reason}`,
        data: {
          orderId:
            order._id,
          paymentId:
            payment._id,
          sellerId:
            payment.seller,
          rejectionReason:
            reason
        }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message:
          "Seller payment rejected successfully",
        data: {
          orderId:
            order._id,
          paymentId:
            payment._id,
          sellerId:
            payment.seller,
          status:
            payment.status,
          rejectionReason:
            payment.rejectionReason,
          paymentStatus:
            order.paymentStatus
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  submitSellerPayment,
  getSellerQRPayments,
  verifySellerPayment,
  rejectSellerPayment
};