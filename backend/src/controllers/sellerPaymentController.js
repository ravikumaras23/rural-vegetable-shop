const mongoose = require("mongoose");

const Order =
  require("../models/Order");

const {
  commitInventory
} =
  require("../services/inventoryService");

const {
  notifyUsers
} =
  require("../services/businessNotificationService");

const getIO = (req) =>
  req.app.get("io");

const emitPaymentUpdate = (
  req,
  order,
  payment,
  extra = {}
) => {
  const io =
    getIO(req);

  if (
    !io ||
    !order ||
    !payment
  ) {
    return;
  }

  io.to(
    `user:${order.customer}`
  ).emit(
    "seller-payment:updated",
    {
      orderId:
        String(
          order._id
        ),

      paymentId:
        String(
          payment._id ||
            payment.paymentId ||
            ""
        ),

      sellerId:
        String(
          payment.seller
        ),

      status:
        payment.status,

      orderPaymentStatus:
        order.paymentStatus,

      orderStatus:
        order.orderStatus,

      ...extra
    }
  );

  io.to(
    `seller:${payment.seller}`
  ).emit(
    "seller-payment:updated",
    {
      orderId:
        String(
          order._id
        ),

      paymentId:
        String(
          payment._id ||
            payment.paymentId ||
            ""
        ),

      sellerId:
        String(
          payment.seller
        ),

      status:
        payment.status,

      orderPaymentStatus:
        order.paymentStatus,

      orderStatus:
        order.orderStatus,

      ...extra
    }
  );
};

const emitOrderPaid =
  async (
    req,
    order
  ) => {
    const io =
      getIO(req);

    if (
      !io ||
      !order
    ) {
      return;
    }

    const sellerIds =
      [
        ...new Set(
          (
            order.items ||
            []
          ).map(
            (
              item
            ) =>
              String(
                item.seller
              )
          )
        )
      ];

    io.to(
      `user:${order.customer}`
    ).emit(
      "order:payment-paid",
      {
        orderId:
          String(
            order._id
          ),

        orderNumber:
          order.orderNumber,

        paymentStatus:
          order.paymentStatus,

        orderStatus:
          order.orderStatus
      }
    );

    for (
      const sellerId of
        sellerIds
    ) {
      io.to(
        `seller:${sellerId}`
      ).emit(
        "seller:order-paid",
        {
          orderId:
            String(
              order._id
            ),

          orderNumber:
            order.orderNumber,

          sellerId
        }
      );
    }

    io.to("admin").emit(
      "admin:order-paid",
      {
        orderId:
          String(
            order._id
          ),

        orderNumber:
          order.orderNumber,

        totalAmount:
          order.totalAmount
      }
    );

    try {
      if (
        sellerIds.length >
        0
      ) {
        await notifyUsers({
          req,

          recipients:
            sellerIds,

          type:
            "order_paid",

          title:
            "Order payment verified",

          message:
            `Order ${order.orderNumber} has been fully paid and is ready for seller processing.`,

          data: {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            totalAmount:
              order.totalAmount
          }
        });
      }
    } catch (error) {
      console.error(
        "Seller paid-order notification failed:",
        error.message
      );
    }
  };

const ensureValidIds =
  (
    orderId,
    paymentId
  ) => {
    return (
      mongoose.Types.ObjectId.isValid(
        orderId
      ) &&
      mongoose.Types.ObjectId.isValid(
        paymentId
      )
    );
  };

/*
|--------------------------------------------------------------------------
| CUSTOMER: SUBMIT UTR
|--------------------------------------------------------------------------
*/

const submitSellerPayment =
  async (
    req,
    res
  ) => {
    const {
      orderId,
      paymentId
    } = req.params;

    if (
      !ensureValidIds(
        orderId,
        paymentId
      )
    ) {
      return res.status(400).json({
        success:
          false,

        message:
          "Invalid order or seller payment ID"
      });
    }

    const transactionReference =
      String(
        req.body
          ?.transactionReference ||
          ""
      ).trim();

    if (
      transactionReference.length <
        6 ||
      transactionReference.length >
        120
    ) {
      return res.status(400).json({
        success:
          false,

        message:
          "Transaction reference must contain between 6 and 120 characters"
      });
    }

    const order =
      await Order.findOne({
        _id:
          orderId,

        customer:
          req.user._id,

        paymentMethod:
          "seller_qr"
      });

    if (!order) {
      return res.status(404).json({
        success:
          false,

        message:
          "Seller QR order not found"
      });
    }

    if (
      order.orderStatus ===
      "cancelled"
    ) {
      return res.status(400).json({
        success:
          false,

        message:
          "Cancelled orders cannot receive payment references"
      });
    }

    const payment =
      order.sellerPayments.id(
        paymentId
      );

    if (!payment) {
      return res.status(404).json({
        success:
          false,

        message:
          "Seller payment record not found"
      });
    }

    if (
      payment.status ===
      "paid"
    ) {
      return res.status(409).json({
        success:
          false,

        message:
          "This seller payment is already verified"
      });
    }

    if (
      payment.status ===
      "refunded"
    ) {
      return res.status(409).json({
        success:
          false,

        message:
          "This seller payment has been refunded"
      });
    }

    payment.transactionReference =
      transactionReference;

    payment.submittedAt =
      new Date();

    payment.status =
      "submitted";

    payment.rejectionReason =
      "";

    await order.save();

    emitPaymentUpdate(
      req,
      order,
      payment
    );

    return res.status(200).json({
      success:
        true,

      message:
        "Payment reference submitted for seller verification",

      data: {
        orderId:
          order._id,

        paymentId:
          payment._id,

        status:
          payment.status,

        orderPaymentStatus:
          order.paymentStatus
      }
    });
  };

/*
|--------------------------------------------------------------------------
| SELLER: GET QR PAYMENTS
|--------------------------------------------------------------------------
*/

const getSellerQRPayments =
  async (
    req,
    res
  ) => {
    const orders =
      await Order.find({
        paymentMethod:
          "seller_qr",

        sellerPayments: {
          $elemMatch: {
            seller:
              req.user._id,

            status: {
              $in: [
                "submitted",
                "pending"
              ]
            }
          }
        },

        orderStatus: {
          $nin: [
            "cancelled",
            "returned"
          ]
        }
      })
        .sort({
          createdAt:
            -1
        })
        .limit(100)
        .lean();

    const data =
      [];

    for (
      const order of
        orders
    ) {
      for (
        const payment of
          order.sellerPayments ||
          []
      ) {
        if (
          String(
            payment.seller
          ) !==
          String(
            req.user._id
          )
        ) {
          continue;
        }

        if (
          ![
            "submitted",
            "pending"
          ].includes(
            payment.status
          )
        ) {
          continue;
        }

        data.push({
          orderId:
            order._id,

          orderNumber:
            order.orderNumber,

          customerId:
            order.customer,

          totalAmount:
            order.totalAmount,

          orderStatus:
            order.orderStatus,

          paymentStatus:
            order.paymentStatus,

          sellerPayment:
            payment
        });
      }
    }

    return res.status(200).json({
      success:
        true,

      data
    });
  };

/*
|--------------------------------------------------------------------------
| SELLER: VERIFY PAYMENT
|--------------------------------------------------------------------------
*/

const verifySellerPayment =
  async (
    req,
    res
  ) => {
    const {
      orderId,
      paymentId
    } = req.params;

    if (
      !ensureValidIds(
        orderId,
        paymentId
      )
    ) {
      return res.status(400).json({
        success:
          false,

        message:
          "Invalid order or seller payment ID"
      });
    }

    const session =
      await mongoose.startSession();

    let savedOrder =
      null;

    let verifiedPayment =
      null;

    let becameFullyPaid =
      false;

    try {
      await session.withTransaction(
        async () => {
          const order =
            await Order.findOne({
              _id:
                orderId,

              paymentMethod:
                "seller_qr"
            }).session(
              session
            );

          if (!order) {
            throw new Error(
              "Seller QR order not found"
            );
          }

          const payment =
            order.sellerPayments.id(
              paymentId
            );

          if (!payment) {
            throw new Error(
              "Seller payment record not found"
            );
          }

          if (
            String(
              payment.seller
            ) !==
            String(
              req.user._id
            )
          ) {
            throw new Error(
              "You are not authorized to verify this seller payment"
            );
          }

          if (
            payment.status !==
            "submitted"
          ) {
            throw new Error(
              `Only submitted payments can be verified. Current status: ${payment.status}`
            );
          }

          if (
            !payment.transactionReference
          ) {
            throw new Error(
              "Customer has not submitted a transaction reference"
            );
          }

          payment.status =
            "paid";

          payment.verifiedAt =
            new Date();

          payment.verifiedBy =
            req.user._id;

          payment.rejectionReason =
            "";

          const allPaid =
            order.sellerPayments.length >
              0 &&
            order.sellerPayments.every(
              (
                sellerPayment
              ) =>
                sellerPayment.status ===
                "paid"
            );

          if (
            allPaid
          ) {
            await commitInventory({
              order,

              items:
                order.items,

              session
            });

            order.paymentStatus =
              "paid";

            order.orderStatus =
              "confirmed";

            order.paymentExpiresAt =
              null;

            order.inventoryStatus =
              "committed";

            order.inventoryReserved =
              false;

            order.inventoryReleased =
              false;

            becameFullyPaid =
              true;
          } else {
            order.paymentStatus =
              "partially_paid";
          }

          await order.save({
            session
          });

          savedOrder =
            order;

          verifiedPayment =
            payment;
        }
      );
    } finally {
      await session.endSession();
    }

    emitPaymentUpdate(
      req,
      savedOrder,
      verifiedPayment
    );

    if (
      becameFullyPaid
    ) {
      await emitOrderPaid(
        req,
        savedOrder
      );
    }

    return res.status(200).json({
      success:
        true,

      message:
        becameFullyPaid
          ? "Seller payment verified. Order is fully paid and confirmed."
          : "Seller payment verified. Waiting for the remaining seller payments.",

      data: {
        order:
          savedOrder,

        payment:
          verifiedPayment
      }
    });
  };

/*
|--------------------------------------------------------------------------
| SELLER: REJECT PAYMENT
|--------------------------------------------------------------------------
*/

const rejectSellerPayment =
  async (
    req,
    res
  ) => {
    const {
      orderId,
      paymentId
    } = req.params;

    if (
      !ensureValidIds(
        orderId,
        paymentId
      )
    ) {
      return res.status(400).json({
        success:
          false,

        message:
          "Invalid order or seller payment ID"
      });
    }

    const rejectionReason =
      String(
        req.body
          ?.rejectionReason ||
          ""
      ).trim();

    if (
      !rejectionReason
    ) {
      return res.status(400).json({
        success:
          false,

        message:
          "Rejection reason is required"
      });
    }

    if (
      rejectionReason.length >
      500
    ) {
      return res.status(400).json({
        success:
          false,

        message:
          "Rejection reason must not exceed 500 characters"
      });
    }

    const order =
      await Order.findOne({
        _id:
          orderId,

        paymentMethod:
          "seller_qr"
      });

    if (!order) {
      return res.status(404).json({
        success:
          false,

        message:
          "Seller QR order not found"
      });
    }

    const payment =
      order.sellerPayments.id(
        paymentId
      );

    if (!payment) {
      return res.status(404).json({
        success:
          false,

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
        success:
          false,

        message:
          "You are not authorized to reject this seller payment"
      });
    }

    if (
      payment.status !==
      "submitted"
    ) {
      return res.status(409).json({
        success:
          false,

        message:
          "Only submitted payments can be rejected"
      });
    }

    payment.status =
      "failed";

    payment.rejectionReason =
      rejectionReason;

    payment.verifiedAt =
      null;

    payment.verifiedBy =
      req.user._id;

    if (
      order.paymentStatus !==
      "paid"
    ) {
      order.paymentStatus =
        order.sellerPayments.some(
          (
            sellerPayment
          ) =>
            sellerPayment.status ===
            "paid"
        )
          ? "partially_paid"
          : "pending";
    }

    await order.save();

    emitPaymentUpdate(
      req,
      order,
      payment,
      {
        rejectionReason
      }
    );

    return res.status(200).json({
      success:
        true,

      message:
        "Seller payment rejected",

      data: {
        order,
        payment
      }
    });
  };

module.exports = {
  submitSellerPayment,
  getSellerQRPayments,
  verifySellerPayment,
  rejectSellerPayment
};