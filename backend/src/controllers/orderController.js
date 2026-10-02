

const mongoose = require("mongoose");

const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const Cart = require("../models/Cart");

const {
  reserveInventory,
  commitInventory,
  releaseInventory
} = require("../services/inventoryService");

const {
  notifyUser,
  notifyUsers
} = require("../services/notificationService");

const asyncHandler =
  require("../utils/asyncHandler");

/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
*/

const DELIVERY_FREE_THRESHOLD = 500;
const STANDARD_DELIVERY_CHARGE = 40;

const PAYMENT_TIMEOUT_MINUTES = Math.max(
  Number(
    process.env.RAZORPAY_PAYMENT_TIMEOUT_MINUTES
  ) || 15,
  1
);

/*
|--------------------------------------------------------------------------
| PAYMENT METHODS
|--------------------------------------------------------------------------
*/

const PAYMENT_METHODS = [
  "cod",
  "razorpay",
  "seller_qr"
];

/*
|--------------------------------------------------------------------------
| ORDER STATUS
|--------------------------------------------------------------------------
*/

const ORDER_STATUSES = [
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
| VALIDATE OBJECT ID
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

/*
|--------------------------------------------------------------------------
| GENERATE ORDER NUMBER
|--------------------------------------------------------------------------
*/

const generateOrderNumber = () => {
  const timestamp =
    Date.now()
      .toString(36)
      .toUpperCase();

  const random =
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

  return `RV-${timestamp}-${random}`;
};

/*
|--------------------------------------------------------------------------
| CALCULATE DELIVERY CHARGE
|--------------------------------------------------------------------------
*/

const calculateDeliveryCharge = (
  subtotal
) => {
  if (
    subtotal <= 0 ||
    subtotal >= DELIVERY_FREE_THRESHOLD
  ) {
    return 0;
  }

  return STANDARD_DELIVERY_CHARGE;
};

/*
|--------------------------------------------------------------------------
| VALIDATE SHIPPING ADDRESS
|--------------------------------------------------------------------------
*/

const validateShippingAddress = (
  address
) => {
  if (
    !address ||
    typeof address !== "object"
  ) {
    return "Shipping address is required";
  }

  const requiredFields = [
    "name",
    "phone",
    "addressLine1",
    "pincode"
  ];

  for (
    const field of requiredFields
  ) {
    if (
      !address[field] ||
      String(address[field]).trim() === ""
    ) {
      return `${field} is required`;
    }
  }

  if (
    !/^[6-9][0-9]{9}$/.test(
      String(address.phone).trim()
    )
  ) {
    return (
      "Phone must be a valid 10-digit Indian mobile number"
    );
  }

  if (
    !/^[0-9]{6}$/.test(
      String(address.pincode).trim()
    )
  ) {
    return (
      "Pincode must contain exactly 6 digits"
    );
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| NORMALIZE SHIPPING ADDRESS
|--------------------------------------------------------------------------
*/

const normalizeShippingAddress = (
  address
) => ({
  name:
    String(address.name).trim(),

  phone:
    String(address.phone).trim(),

  addressLine1:
    String(
      address.addressLine1
    ).trim(),

  addressLine2:
    address.addressLine2
      ? String(
          address.addressLine2
        ).trim()
      : "",

  village:
    address.village
      ? String(
          address.village
        ).trim()
      : "",

  district:
    address.district
      ? String(
          address.district
        ).trim()
      : "",

  state:
    address.state
      ? String(
          address.state
        ).trim()
      : "",

  pincode:
    String(
      address.pincode
    ).trim()
});

/*
|--------------------------------------------------------------------------
| UNIQUE SELLER IDS
|--------------------------------------------------------------------------
*/

const getUniqueSellerIds = (
  order
) => {
  return [
    ...new Set(
      (order.items || [])
        .map((item) =>
          String(item.seller)
        )
        .filter(Boolean)
    )
  ];
};

/*
|--------------------------------------------------------------------------
| SELLER PAYMENT SETTINGS
|--------------------------------------------------------------------------
|
| Expected seller profile structure:
|
| sellerProfile.paymentSettings = {
|   enabled: true,
|   method: "seller_qr",
|   upiId: "seller@upi",
|   qrCodeUrl: "https://..."
| }
|
| This function is defensive so older seller documents do not crash
| checkout.
|--------------------------------------------------------------------------
*/

const getSellerPaymentSettings = (
  seller
) => {
  const settings =
    seller?.sellerProfile
      ?.paymentSettings ||
    {};

  return {
    enabled:
      settings.enabled !== false,

    method:
      settings.method ||
      "seller_qr",

    upiId:
      String(
        settings.upiId || ""
      ).trim(),

    qrCodeUrl:
      String(
        settings.qrCodeUrl || ""
      ).trim()
  };
};

/*
|--------------------------------------------------------------------------
| BUILD SELLER QR PAYMENTS
|--------------------------------------------------------------------------
|
| Creates one payment record per seller.
|
| Example:
|
| Seller A -> ₹400
| Seller B -> ₹600
|
|--------------------------------------------------------------------------
*/

const buildSellerPayments = ({
  orderItems,
  sellersMap
}) => {
  const sellerTotals =
    new Map();

  for (
    const item of orderItems
  ) {
    const sellerId =
      String(item.seller);

    const current =
      Number(
        sellerTotals.get(
          sellerId
        ) || 0
      );

    sellerTotals.set(
      sellerId,
      Number(
        (
          current +
          Number(
            item.subtotal || 0
          )
        ).toFixed(2)
      )
    );
  }

  const sellerPayments = [];

  for (
    const [
      sellerId,
      amount
    ] of sellerTotals
  ) {
    const seller =
      sellersMap.get(
        sellerId
      );

    if (!seller) {
      throw new Error(
        "Seller information is unavailable"
      );
    }

    const settings =
      getSellerPaymentSettings(
        seller
      );

    if (!settings.enabled) {
      throw new Error(
        `${seller.name || "Seller"} has disabled QR payments`
      );
    }

    if (
      settings.method !==
      "seller_qr"
    ) {
      throw new Error(
        `${seller.name || "Seller"} is not configured for Seller QR payment`
      );
    }

    if (
      !settings.upiId &&
      !settings.qrCodeUrl
    ) {
      throw new Error(
        `${seller.name || "Seller"} has not configured a QR code or UPI ID`
      );
    }

    sellerPayments.push({
      seller:
        seller._id,

      amount,

      paymentMethod:
        "seller_qr",

      status:
        "pending",

      upiIdSnapshot:
        settings.upiId,

      qrImageSnapshot:
        settings.qrCodeUrl,

      transactionReference:
        "",

      submittedAt:
        null,

      verifiedAt:
        null,

      verifiedBy:
        null,

      rejectionReason:
        ""
    });
  }

  return sellerPayments;
};

/*
|--------------------------------------------------------------------------
| SOCKET - ORDER CREATED
|--------------------------------------------------------------------------
*/

const emitOrderCreatedEvents = (
  req,
  order
) => {
  const io =
    req.app.get("io");

  if (
    !io ||
    !order
  ) {
    return;
  }

  io.to(
    `user:${req.user._id}`
  ).emit(
    "order:created",
    {
      orderId:
        order._id,

      orderNumber:
        order.orderNumber,

      orderStatus:
        order.orderStatus,

      paymentStatus:
        order.paymentStatus,

      paymentMethod:
        order.paymentMethod,

      inventoryStatus:
        order.inventoryStatus,

      totalAmount:
        order.totalAmount
    }
  );

  for (
    const sellerId of
      getUniqueSellerIds(order)
  ) {
    io.to(
      `seller:${sellerId}`
    ).emit(
      "seller:order-created",
      {
        orderId:
          order._id,

        orderNumber:
          order.orderNumber,

        sellerId
      }
    );
  }

  io.to("admin").emit(
    "admin:order-created",
    {
      orderId:
        order._id,

      orderNumber:
        order.orderNumber,

      totalAmount:
        order.totalAmount,

      paymentMethod:
        order.paymentMethod
    }
  );
};

/*
|--------------------------------------------------------------------------
| SOCKET - ORDER CANCELLED
|--------------------------------------------------------------------------
*/

const emitOrderCancelledEvents = (
  req,
  order
) => {
  const io =
    req.app.get("io");

  if (
    !io ||
    !order
  ) {
    return;
  }

  io.to(
    `user:${req.user._id}`
  ).emit(
    "order:cancelled",
    {
      orderId:
        order._id,

      orderNumber:
        order.orderNumber,

      orderStatus:
        order.orderStatus,

      inventoryStatus:
        order.inventoryStatus,

      paymentStatus:
        order.paymentStatus
    }
  );

  for (
    const sellerId of
      getUniqueSellerIds(order)
  ) {
    io.to(
      `seller:${sellerId}`
    ).emit(
      "seller:order-cancelled",
      {
        orderId:
          order._id,

        orderNumber:
          order.orderNumber
      }
    );
  }

  io.to("admin").emit(
    "admin:order-cancelled",
    {
      orderId:
        order._id,

      orderNumber:
        order.orderNumber
    }
  );
};

/*
|--------------------------------------------------------------------------
| ORDER CREATED NOTIFICATIONS
|--------------------------------------------------------------------------
*/

const sendOrderCreatedNotifications =
  async (
    req,
    order
  ) => {
    if (!order) {
      return;
    }

    try {
      await notifyUser({
        req,

        recipient: order.customer,

        role: "customer",

        type: "ORDER_CREATED",

        title: "Order placed successfully",

        message:
          `Your order ${order.orderNumber} has been placed successfully.`,

        metadata: {
          orderId: String(order._id),

          orderNumber:
            order.orderNumber,

          totalAmount:
            order.totalAmount,

          paymentMethod:
            order.paymentMethod,

          paymentStatus:
            order.paymentStatus,

          inventoryStatus:
            order.inventoryStatus,

          action: "order_created"
        }
      });
    } catch (notificationError) {
      console.error(
        "Customer order notification failed:",
        notificationError.message
      );
    }

    const sellerIds = [
      ...new Set(
        order.items.map(
          (item) =>
            String(item.seller)
        )
      )
    ];

    if (sellerIds.length > 0) {
      try {
        await notifyUsers({
          req,

          recipients: sellerIds,

          role: "seller",

          type: "NEW_SELLER_ORDER",

          title: "New order received",

          message:
            `You have received products in order ${order.orderNumber}.`,

          metadata: {
            orderId:
              String(order._id),

            orderNumber:
              order.orderNumber,

            action:
              "new_seller_order"
          }
        });
      } catch (notificationError) {
        console.error(
          "Seller order notifications failed:",
          notificationError.message
        );
      }
    }
    try {
      const admins =
        await User.find({
          role: "admin",
          isActive: true
        }).select("_id");

      const adminIds =
        admins.map(
          (admin) =>
            admin._id
        );

      if (adminIds.length > 0) {
        await notifyUsers({
          req,

          recipients: adminIds,

          role: "admin",

          type: "ORDER_CREATED",

          title: "New order received",

          message:
            `A new order ${order.orderNumber} has been created.`,

          metadata: {
            orderId:
              String(order._id),

            orderNumber:
              order.orderNumber,

            totalAmount:
              order.totalAmount,

            paymentMethod:
              order.paymentMethod,

            action:
              "order_created"
          }
        });
      }
    } catch (notificationError) {
      console.error(
        "Admin order notifications failed:",
        notificationError.message
      );
    }

  };

/*
|--------------------------------------------------------------------------
| ORDER CANCELLED NOTIFICATIONS
|--------------------------------------------------------------------------
*/

const sendOrderCancelledNotifications =
  async (
    req,
    order
  ) => {
    if (!order) {
      return;
    }

    try {
      await notifyUser({
        req,

        recipient:
          order.customer,

        type:
          "ORDER_CANCELLED",

        title:
          "Order cancelled",

        message:
          `Your order ${order.orderNumber} has been cancelled.`,

        data: {
          orderId:
            order._id,

          orderNumber:
            order.orderNumber,

          cancellationReason:
            order.cancellationReason ||
            "",

          paymentStatus:
            order.paymentStatus,

          inventoryStatus:
            order.inventoryStatus
        }
      });
    } catch (error) {
      console.error(
        "Customer cancellation notification failed:",
        error.message
      );
    }

    const sellerIds =
      getUniqueSellerIds(
        order
      );

    if (
      sellerIds.length > 0
    ) {
      try {
        await notifyUsers({
          req,

          recipients:
            sellerIds,

          type:
            "order_cancelled",

          title:
            "Order cancelled",

          message:
            `Order ${order.orderNumber} has been cancelled by the customer.`,

          data: {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            cancellationReason:
              order.cancellationReason ||
              ""
          }
        });
      } catch (error) {
        console.error(
          "Seller cancellation notifications failed:",
          error.message
        );
      }
    }

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
            admin._id
        );

      if (
        adminIds.length > 0
      ) {
        await notifyUsers({
          req,

          recipients:
            adminIds,

          type:
            "order_cancelled",

          title:
            "Order cancelled",

          message:
            `Order ${order.orderNumber} has been cancelled.`,

          data: {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            cancellationReason:
              order.cancellationReason ||
              ""
          }
        });
      }
    } catch (error) {
      console.error(
        "Admin cancellation notifications failed:",
        error.message
      );
    }
  };

/*
|--------------------------------------------------------------------------
| CREATE ORDER / CHECKOUT
|--------------------------------------------------------------------------
|
| COD
|   -> stock committed immediately
|
| RAZORPAY
|   -> inventory reserved
|   -> payment pending
|
| SELLER QR
|   -> inventory reserved
|   -> per-seller payment records created
|   -> customer pays each seller separately
|
|--------------------------------------------------------------------------
*/

const createOrder =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const {
        shippingAddress,
        paymentMethod
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | Validate address
      |--------------------------------------------------------------------------
      */

      const addressError =
        validateShippingAddress(
          shippingAddress
        );

      if (addressError) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              addressError
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate payment method
      |--------------------------------------------------------------------------
      */

      if (
        !PAYMENT_METHODS.includes(
          paymentMethod
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Payment method must be cod, razorpay or seller_qr"
          });
      }

      const normalizedAddress =
        normalizeShippingAddress(
          shippingAddress
        );

      const session =
        await mongoose.startSession();

      let createdOrder =
        null;

      try {
        await session.withTransaction(
          async () => {
            /*
            |--------------------------------------------------------------------------
            | CART
            |--------------------------------------------------------------------------
            */

            const cart =
              await Cart.findOne({
                customer:
                  req.user._id
              })
                .session(
                  session
                );

            if (
              !cart ||
              !Array.isArray(
                cart.items
              ) ||
              cart.items.length === 0
            ) {
              throw new Error(
                "Your cart is empty"
              );
            }

            /*
            |--------------------------------------------------------------------------
            | PRODUCT IDS
            |--------------------------------------------------------------------------
            */

            const productIds =
              cart.items.map(
                (item) =>
                  item.product
              );

            /*
            |--------------------------------------------------------------------------
            | PRODUCTS + SELLERS
            |--------------------------------------------------------------------------
            */

            const products =
              await Product.find({
                _id: {
                  $in:
                    productIds
                }
              })
                .populate(
                  "seller",
                  "name email isActive sellerProfile"
                )
                .session(
                  session
                );

            if (
              products.length !==
              cart.items.length
            ) {
              throw new Error(
                "One or more products in your cart are no longer available"
              );
            }

            const productMap =
              new Map(
                products.map(
                  (product) => [
                    product._id.toString(),
                    product
                  ]
                )
              );

            /*
            |--------------------------------------------------------------------------
            | SELLER MAP
            |--------------------------------------------------------------------------
            */

            const sellersMap =
              new Map();

            for (
              const product of
                products
            ) {
              if (
                product.seller
              ) {
                sellersMap.set(
                  String(
                    product.seller._id
                  ),
                  product.seller
                );
              }
            }

            /*
            |--------------------------------------------------------------------------
            | BUILD ORDER ITEMS
            |--------------------------------------------------------------------------
            */

            const orderItems =
              [];

            let subtotal =
              0;

            for (
              const cartItem of
                cart.items
            ) {
              const product =
                productMap.get(
                  cartItem.product.toString()
                );

              if (!product) {
                throw new Error(
                  "A product in your cart no longer exists"
                );
              }

              /*
              |--------------------------------------------------------------------------
              | PRODUCT STATUS
              |--------------------------------------------------------------------------
              */

              if (
                product.status !==
                "approved"
              ) {
                throw new Error(
                  `"${product.name}" is no longer available`
                );
              }

              /*
              |--------------------------------------------------------------------------
              | SELLER
              |--------------------------------------------------------------------------
              */

              if (
                !product.seller
              ) {
                throw new Error(
                  `"${product.name}" seller is no longer available`
                );
              }

              if (
                !product.seller
                  .isActive
              ) {
                throw new Error(
                  `"${product.name}" seller account is inactive`
                );
              }

              if (
                product.seller
                  .sellerProfile
                  ?.approvalStatus !==
                "approved"
              ) {
                throw new Error(
                  `"${product.name}" seller is not approved`
                );
              }

              /*
              |--------------------------------------------------------------------------
              | QUANTITY
              |--------------------------------------------------------------------------
              */

              const quantity =
                Number(
                  cartItem.quantity
                );

              if (
                !Number.isInteger(
                  quantity
                ) ||
                quantity < 1
              ) {
                throw new Error(
                  `Invalid quantity for "${product.name}"`
                );
              }

              /*
              |--------------------------------------------------------------------------
              | AVAILABLE STOCK
              |--------------------------------------------------------------------------
              */

              const stock =
                Number(
                  product.stockQuantity ||
                    0
                );

              const reserved =
                Number(
                  product.reservedQuantity ||
                    0
                );

              const available =
                Math.max(
                  stock -
                    reserved,
                  0
                );

              if (
                available <
                quantity
              ) {
                throw new Error(
                  `Only ${available} ${product.unit} of "${product.name}" is currently available`
                );
              }

              /*
              |--------------------------------------------------------------------------
              | PRICE
              |--------------------------------------------------------------------------
              */

              const price =
                Number(
                  product.price
                );

              if (
                !Number.isFinite(
                  price
                ) ||
                price < 0
              ) {
                throw new Error(
                  `Invalid price for "${product.name}"`
                );
              }

              const itemSubtotal =
                Number(
                  (
                    price *
                    quantity
                  ).toFixed(2)
                );

              subtotal +=
                itemSubtotal;

              /*
              |--------------------------------------------------------------------------
              | ORDER SNAPSHOT
              |--------------------------------------------------------------------------
              */

              orderItems.push({
                product:
                  product._id,

                seller:
                  product.seller._id,

                productName:
                  product.name,

                productImage:
                  Array.isArray(
                    product.images
                  ) &&
                  product.images.length >
                    0
                    ? product
                        .images[0]
                        .url
                    : "",

                quantity,

                unit:
                  product.unit,

                priceAtPurchase:
                  price,

                subtotal:
                  itemSubtotal
              });
            }

            subtotal =
              Number(
                subtotal.toFixed(2)
              );

            /*
            |--------------------------------------------------------------------------
            | FINANCIALS
            |--------------------------------------------------------------------------
            */

            const discount =
              0;

            const deliveryCharge =
              calculateDeliveryCharge(
                subtotal
              );

            const totalAmount =
              Number(
                (
                  subtotal +
                  deliveryCharge -
                  discount
                ).toFixed(2)
              );

            if (
              !Number.isFinite(
                totalAmount
              ) ||
              totalAmount <= 0
            ) {
              throw new Error(
                "Invalid order total"
              );
            }

            /*
            |--------------------------------------------------------------------------
            | PAYMENT / INVENTORY STATE
            |--------------------------------------------------------------------------
            */

            const isRazorpay =
              paymentMethod ===
              "razorpay";

            const isSellerQR =
              paymentMethod ===
              "seller_qr";

            const requiresReservation =
              isRazorpay ||
              isSellerQR;

            const paymentExpiresAt =
              requiresReservation
                ? new Date(
                    Date.now() +
                      PAYMENT_TIMEOUT_MINUTES *
                        60 *
                        1000
                  )
                : null;

            /*
            |--------------------------------------------------------------------------
            | SELLER QR PAYMENTS
            |--------------------------------------------------------------------------
            */

            let sellerPayments =
              [];

            if (
              isSellerQR
            ) {
              sellerPayments =
                buildSellerPayments({
                  orderItems,

                  sellersMap
                });
            }

            /*
            |--------------------------------------------------------------------------
            | CREATE ORDER
            |--------------------------------------------------------------------------
            */

            const order =
              new Order({
                orderNumber:
                  generateOrderNumber(),

                customer:
                  req.user._id,

                items:
                  orderItems,

                shippingAddress:
                  normalizedAddress,

                subtotal,

                deliveryCharge,

                discount,

                totalAmount,

                paymentMethod,

                paymentStatus:
                  "pending",

                orderStatus:
                  requiresReservation
                    ? "pending"
                    : "confirmed",

                paymentExpiresAt,

                sellerPayments,

                inventoryStatus:
                  "pending",

                inventoryReserved:
                  false,

                inventoryReleased:
                  false,

                refundStatus:
                  "not_required"
              });

            await order.save({
              session
            });

            /*
            |--------------------------------------------------------------------------
            | RESERVE INVENTORY
            |--------------------------------------------------------------------------
            */

            if (
              requiresReservation
            ) {
              await reserveInventory({
                order,

                items:
                  order.items,

                session,

                expiresAt:
                  paymentExpiresAt
              });

              /*
              |--------------------------------------------------------------------------
              | IMPORTANT
              |--------------------------------------------------------------------------
              |
              | This is what the Razorpay endpoint checks.
              |
              */

              order.inventoryStatus =
                "reserved";

              order.inventoryReserved =
                true;

              order.inventoryReleased =
                false;

              await order.save({
                session
              });

              if (
                order.inventoryStatus !==
                "reserved"
              ) {
                throw new Error(
                  "Inventory reservation could not be persisted for this order"
                );
              }
            }

            /*
            |--------------------------------------------------------------------------
            | COD COMMIT
            |--------------------------------------------------------------------------
            */

            else {
              for (
                const item of
                  order.items
              ) {
                const updatedProduct =
                  await Product.findOneAndUpdate(
                    {
                      _id:
                        item.product,

                      status:
                        "approved",

                      $expr: {
                        $gte: [
                          {
                            $subtract:
                              [
                                "$stockQuantity",

                                {
                                  $ifNull:
                                    [
                                      "$reservedQuantity",
                                      0
                                    ]
                                }
                              ]
                          },

                          item.quantity
                        ]
                      }
                    },

                    {
                      $inc: {
                        stockQuantity:
                          -item.quantity,

                        totalSold:
                          item.quantity
                      }
                    },

                    {
                      new:
                        true,

                      session
                    }
                  );

                if (
                  !updatedProduct
                ) {
                  throw new Error(
                    `Stock changed while processing "${item.productName}". Please review your cart and try again.`
                  );
                }

                if (
                  updatedProduct.stockQuantity <=
                  0
                ) {
                  updatedProduct.stockQuantity =
                    0;

                  updatedProduct.status =
                    "out_of_stock";

                  await updatedProduct.save({
                    session
                  });
                }
              }

              order.inventoryStatus =
                "committed";

              order.inventoryReserved =
                false;

              order.inventoryReleased =
                false;

              await order.save({
                session
              });
            }

            /*
            |--------------------------------------------------------------------------
            | CLEAR CART
            |--------------------------------------------------------------------------
            */

            cart.items =
              [];

            await cart.save({
              session
            });

            createdOrder =
              order;
          }
        );
      } finally {
        await session.endSession();
      }

      /*
      |--------------------------------------------------------------------------
      | SOCKETS
      |--------------------------------------------------------------------------
      */

      emitOrderCreatedEvents(
        req,
        createdOrder
      );

      /*
      |--------------------------------------------------------------------------
      | NOTIFICATIONS
      |--------------------------------------------------------------------------
      */

      await sendOrderCreatedNotifications(
        req,
        createdOrder
      );

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      let message =
        "Order created successfully";

      if (
        paymentMethod ===
        "razorpay"
      ) {
        message =
          "Order created. Complete Razorpay payment to confirm your order.";
      }

      if (
        paymentMethod ===
        "seller_qr"
      ) {
        message =
          "Order created. Complete the required seller QR payments to confirm your order.";
      }

      return res
        .status(201)
        .json({
          success:
            true,

          message,

          data:
            createdOrder
        });
    }
  );

/*
|--------------------------------------------------------------------------
| GET MY ORDERS
|--------------------------------------------------------------------------
*/

const getMyOrders =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const {
        status,
        page = 1,
        limit = 10
      } = req.query;

      const currentPage =
        Math.max(
          Number(page) ||
            1,
          1
        );

      const currentLimit =
        Math.min(
          Math.max(
            Number(limit) ||
              10,
            1
          ),
          50
        );

      const query = {
        customer:
          req.user._id
      };

      if (
        status
      ) {
        if (
          !ORDER_STATUSES.includes(
            status
          )
        ) {
          return res
            .status(400)
            .json({
              success:
                false,

              message:
                "Invalid order status"
            });
        }

        query.orderStatus =
          status;
      }

      
      const skip =
        (currentPage - 1) * currentLimit;

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate(
            "items.product",
            "name slug images unit"
          )
          .populate(
            "items.seller",
            "name sellerProfile.businessName"
          )
          .populate(
            "sellerPayments.seller",
            "name sellerProfile.businessName"
          )
          .sort({
            createdAt: -1
          })
          .skip(skip)
          .limit(currentLimit)
          .lean(),

        Order.countDocuments(query)
      ]);

      const ordersWithSellerDetails = orders.map((order) => ({
        ...order,

        items: (order.items || []).map((item) => {
          const seller =
            item.seller && typeof item.seller === "object"
              ? item.seller
              : null;

          const sellerId = seller?._id
            ? String(seller._id)
            : item.seller
              ? String(item.seller)
              : "";

          const sellerName =
            seller?.name ||
            seller?.sellerProfile?.businessName ||
            "Unknown Seller";

          return {
            ...item,
            sellerId,
            sellerName,
          };
        }),
      }));
        

      return res
        .status(200)
        .json({
          success:
            true,

          data: ordersWithSellerDetails,

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
| GET SINGLE ORDER
|--------------------------------------------------------------------------
*/




const getOrderById =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const {
        id
      } = req.params;

      if (
        !isValidObjectId(
          id
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Invalid order ID"
          });
      }

      const order =
        await Order.findOne({
          _id:
            id,

          customer:
            req.user._id
        })
          .populate(
            "items.product",
            "name slug images unit"
          )
          .populate(
            "items.seller",
            "name sellerProfile.businessName"
          )
          .populate(
            "sellerPayments.seller",
            "name sellerProfile.businessName"
          )
          .populate(
            "sellerPayments.verifiedBy",
            "name email"
          );

      if (!order) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "Order not found"
          });
      }

      return res
        .status(200)
        .json({
          success:
            true,

          data:
            order
        });
    }
  );

/*
|--------------------------------------------------------------------------
| CANCEL ORDER
|--------------------------------------------------------------------------
*/

const cancelOrder =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const {
        id
      } = req.params;

      const {
        cancellationReason = ""
      } = req.body;

      if (
        !isValidObjectId(
          id
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Invalid order ID"
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
              await Order.findOne({
                _id:
                  id,

                customer:
                  req.user._id
              }).session(
                session
              );

            if (!order) {
              throw new Error(
                "Order not found"
              );
            }

            const cancellableStatuses =
              [
                "pending",
                "confirmed",
                "processing"
              ];

            if (
              !cancellableStatuses.includes(
                order.orderStatus
              )
            ) {
              throw new Error(
                "This order can no longer be cancelled"
              );
            }

            const inventoryStatus =
              order.inventoryStatus ||
              "pending";

            /*
            |--------------------------------------------------------------------------
            | RELEASE RESERVED INVENTORY
            |--------------------------------------------------------------------------
            */

            if (
              inventoryStatus ===
              "reserved"
            ) {
              await releaseInventory({
                order,

                session
              });

              order.inventoryStatus =
                "released";

              order.inventoryReserved =
                false;

              order.inventoryReleased =
                true;
            }

            /*
            |--------------------------------------------------------------------------
            | RESTORE COMMITTED INVENTORY
            |--------------------------------------------------------------------------
            */

            else if (
              inventoryStatus ===
              "committed"
            ) {
              for (
                const item of
                  order.items
              ) {
                const updatedProduct =
                  await Product.findByIdAndUpdate(
                    item.product,

                    {
                      $inc: {
                        stockQuantity:
                          Number(
                            item.quantity
                          ),

                        totalSold:
                          -Number(
                            item.quantity
                          )
                      }
                    },

                    {
                      new:
                        true,

                      session
                    }
                  );

                if (
                  updatedProduct &&
                  Number(
                    updatedProduct.stockQuantity
                  ) > 0 &&
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

              order.inventoryStatus =
                "released";

              order.inventoryReserved =
                false;

              order.inventoryReleased =
                true;
            }

            /*
            |--------------------------------------------------------------------------
            | PENDING
            |--------------------------------------------------------------------------
            */

            else if (
              inventoryStatus ===
              "pending"
            ) {
              order.inventoryStatus =
                "released";

              order.inventoryReserved =
                false;

              order.inventoryReleased =
                true;
            }

            else {
              throw new Error(
                `Unknown inventory status "${inventoryStatus}"`
              );
            }

            /*
            |--------------------------------------------------------------------------
            | SELLER QR PAYMENTS
            |--------------------------------------------------------------------------
            */

            if (
              Array.isArray(
                order.sellerPayments
              )
            ) {
              order.sellerPayments =
                order.sellerPayments.map(
                  (
                    payment
                  ) => {
                    if (
                      payment.status ===
                      "paid"
                    ) {
                      payment.status =
                        "refunded";
                    } else {
                      payment.status =
                        "failed";
                    }

                    return payment;
                  }
                );
            }

            /*
            |--------------------------------------------------------------------------
            | ORDER UPDATE
            |--------------------------------------------------------------------------
            */

            order.orderStatus =
              "cancelled";

            order.cancellationReason =
              String(
                cancellationReason ||
                  ""
              ).trim();

            order.cancelledAt =
              new Date();

            /*
            |--------------------------------------------------------------------------
            | PAYMENT
            |--------------------------------------------------------------------------
            */

            if (
              order.paymentStatus ===
              "paid"
            ) {
              order.paymentStatus =
                "refunded";
            } else if (
              order.paymentStatus ===
              "partially_paid"
            ) {
              order.paymentStatus =
                "refunded";
            }

            order.paymentExpiresAt =
              null;

            /*
            |--------------------------------------------------------------------------
            | REFUND STATE
            |--------------------------------------------------------------------------
            |
            | This marks local refund state.
            | Actual Razorpay refund execution should happen through
            | the Razorpay refund API.
            |
            */

            if (
              order.paymentMethod ===
                "razorpay" &&
              order.paymentStatus ===
                "refunded"
            ) {
              order.refundStatus =
                "pending";
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

      /*
      |--------------------------------------------------------------------------
      | SOCKET
      |--------------------------------------------------------------------------
      */

      emitOrderCancelledEvents(
        req,
        cancelledOrder
      );

      /*
      |--------------------------------------------------------------------------
      | NOTIFICATIONS
      |--------------------------------------------------------------------------
      */

      await sendOrderCancelledNotifications(
        req,
        cancelledOrder
      );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Order cancelled successfully",

          data:
            cancelledOrder
        });
    }
  );

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder
};
