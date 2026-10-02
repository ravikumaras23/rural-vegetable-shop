const mongoose = require("mongoose");

const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

const asyncHandler = require("../utils/asyncHandler");

const { notifyUser } = require("../notifications/seller/sellerNotificationService");

/*
|--------------------------------------------------------------------------
| NEW SELLER NOTIFICATION SYSTEM
|--------------------------------------------------------------------------
|
| All seller product notifications are handled by:
|
| src/notifications/seller/sellerNotificationService.js
|
| DO NOT use:
|
| ../services/businessNotificationService
|
| Seller product notifications must not be created directly
| inside this controller.
|
| Admin notifications are different:
|
| When an admin performs a seller action, this controller creates
| a notification for the currently logged-in admin using:
|
| ../services/notificationService
|
|--------------------------------------------------------------------------
*/

const {
  notifySellerProductActivated,
  notifySellerProductApproved,
  notifySellerProductRejected,
  notifySellerProductDeactivated
} = require("../notifications/seller/sellerNotificationService");

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/*
|--------------------------------------------------------------------------
| ADMIN NOTIFICATION RECIPIENT HELPER
|--------------------------------------------------------------------------
|
| Returns the currently authenticated admin's ID.
|
| authMiddleware normally provides req.user as the User document.
| The fallback to req.user.id makes this compatible with JWT
| middleware implementations that expose "id" instead of "_id".
|
|--------------------------------------------------------------------------
*/

const getAdminRecipientId = (req) => {
  return req?.user?._id || req?.user?.id || null;
};

/*
|--------------------------------------------------------------------------
| SOCKET HELPER
|--------------------------------------------------------------------------
|
| This is ONLY for updating the seller's product UI in real time.
|
| It does NOT create a notification.
|
| The notification itself is handled by:
|
| sellerNotificationService.js
|
|--------------------------------------------------------------------------
*/

const emitSellerProductUpdate = (req, sellerId, payload) => {
  const io = req.app.get("io");

  if (!io || !sellerId) {
    console.warn(
      "Seller product socket update skipped: io or sellerId missing"
    );

    return;
  }

  const sellerRoom = `seller:${String(sellerId)}`;

  const socketPayload = {
    ...payload,
    sellerId: String(sellerId)
  };

  console.log("ADMIN -> SELLER PRODUCT SOCKET UPDATE", {
    room: sellerRoom,
    event: "product:status-updated",
    productId: String(payload?.productId || ""),
    sellerId: String(sellerId),
    status: payload?.status
  });

  /*
   * IMPORTANT:
   *
   * Only the product-status event is emitted here.
   *
   * The old:
   *
   * seller:product-notification
   *
   * event has been removed.
   *
   * This prevents duplicate notifications.
   */

  io.to(sellerRoom).emit(
    "product:status-updated",
    socketPayload
  );
};

/*
|--------------------------------------------------------------------------
| ADMIN PRODUCT SOCKET UPDATE
|--------------------------------------------------------------------------
|
| This is a UI update only.
|
| It does NOT create a notification.
|
|--------------------------------------------------------------------------
*/

const emitAdminProductUpdate = (req, payload) => {
  const io = req.app.get("io");

  if (!io) {
    return;
  }

  io.to("admin").emit(
    "product:status-updated",
    payload
  );
};

/*
|--------------------------------------------------------------------------
| ADMIN DASHBOARD
|--------------------------------------------------------------------------
*/

const getDashboardStats = asyncHandler(
  async (req, res) => {
    const [
      totalUsers,
      totalCustomers,
      totalSellers,
      pendingSellers,
      approvedSellers,
      totalProducts,
      pendingProducts,
      approvedProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      revenueResult
    ] = await Promise.all([
      User.countDocuments(),

      User.countDocuments({
        role: "customer"
      }),

      User.countDocuments({
        role: "seller"
      }),

      User.countDocuments({
        role: "seller",
        "sellerProfile.approvalStatus": "pending"
      }),

      User.countDocuments({
        role: "seller",
        "sellerProfile.approvalStatus": "approved"
      }),

      Product.countDocuments(),

      Product.countDocuments({
        status: "pending"
      }),

      Product.countDocuments({
        status: "approved"
      }),

      Product.countDocuments({
        status: "out_of_stock"
      }),

      Order.countDocuments(),

      Order.countDocuments({
        orderStatus: {
          $in: [
            "placed",
            "confirmed",
            "processing",
            "shipped"
          ]
        }
      }),

      Order.countDocuments({
        orderStatus: "delivered"
      }),

      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid"
          }
        },

        {
          $group: {
            _id: null,

            revenue: {
              $sum: "$totalAmount"
            }
          }
        }
      ])
    ]);

    const revenue =
      revenueResult.length > 0
        ? revenueResult[0].revenue
        : 0;

    return res.status(200).json({
      success: true,

      data: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          sellers: totalSellers
        },

        sellers: {
          pending: pendingSellers,
          approved: approvedSellers
        },

        products: {
          total: totalProducts,
          pending: pendingProducts,
          approved: approvedProducts,
          outOfStock: outOfStockProducts
        },

        orders: {
          total: totalOrders,
          active: pendingOrders,
          delivered: deliveredOrders
        },

        revenue
      }
    });
  }
);

/*
|--------------------------------------------------------------------------
| GET SELLERS
|--------------------------------------------------------------------------
*/

const getSellers = asyncHandler(
  async (req, res) => {
    const {
      status,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const currentLimit = Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      100
    );

    const query = {
      role: "seller"
    };

    /*
     * Seller approval status filter
     */

    if (status) {
      const allowedStatuses = [
        "pending",
        "approved",
        "rejected"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid seller approval status"
        });
      }

      query["sellerProfile.approvalStatus"] = status;
    }

    /*
     * Seller search
     */

    if (search && search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchRegex = new RegExp(
        escapedSearch,
        "i"
      );

      query.$or = [
        {
          name: searchRegex
        },

        {
          email: searchRegex
        },

        {
          "sellerProfile.businessName":
            searchRegex
        }
      ];
    }

    const skip =
      (currentPage - 1) *
      currentLimit;

    const [
      sellers,
      total
    ] = await Promise.all([
      User.find(query)
        .select(
          "-password -passwordResetToken -passwordResetExpires"
        )
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(currentLimit)
        .lean(),

      User.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,

      data: sellers,

      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        pages: Math.ceil(
          total / currentLimit
        )
      }
    });
  }
);

/*
|--------------------------------------------------------------------------
| APPROVE SELLER
|--------------------------------------------------------------------------
|
| Admin action:
|
| 1. Approve seller in database.
| 2. Create persistent notification for admin.
| 3. Emit seller approval UI event.
|
|--------------------------------------------------------------------------
*/

const approveSeller = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seller ID"
      });
    }

    const seller = await User.findOne({
      _id: id,
      role: "seller"
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    seller.sellerProfile =
      seller.sellerProfile || {};

    seller.sellerProfile.approvalStatus =
      "approved";

    seller.isActive = true;

    await seller.save();

    /*
     * --------------------------------------------------------------
     * ADMIN NOTIFICATION
     * --------------------------------------------------------------
     *
     * This is the important change for the admin notification bell.
     *
     * The notification is stored in MongoDB and emitted through
     * notificationService.js to:
     *
     * user:${adminId}
     *
     * The frontend NotificationBell listens to:
     *
     * notification:new
     *
     * --------------------------------------------------------------
     */

    const adminId = getAdminRecipientId(req);

    if (adminId) {
      await notifyUser({
        req,

        recipient: adminId,

        type: "seller_approved",

        title: "Seller approved",

        message:
          `${seller.name || "Seller"} has been approved successfully.`,

        data: {
          sellerId: String(seller._id),
          sellerName: seller.name || "",
          sellerEmail: seller.email || "",
          action: "approved"
        }
      });
    } else {
      console.warn(
        "ADMIN NOTIFICATION: Admin recipient ID missing while approving seller."
      );
    }

    /*
     * Business/UI update only.
     */

    const io = req.app.get("io");

    if (io) {
      io.to(
        `user:${String(seller._id)}`
      ).emit(
        "seller:approval-updated",
        {
          sellerId: String(
            seller._id
          ),

          approvalStatus: "approved"
        }
      );

      io.to("admin").emit(
        "seller:approval-updated",
        {
          sellerId: String(
            seller._id
          ),

          approvalStatus: "approved"
        }
      );
    }

    return res.status(200).json({
      success: true,

      message:
        "Seller approved successfully",

      data: {
        sellerId: seller._id,

        approvalStatus:
          seller.sellerProfile
            .approvalStatus,

        isActive:
          seller.isActive
      }
    });
  }
);

/*
|--------------------------------------------------------------------------
| REJECT SELLER
|--------------------------------------------------------------------------
|
| Admin action:
|
| 1. Reject seller in database.
| 2. Create persistent notification for admin.
| 3. Emit seller rejection UI event.
|
|--------------------------------------------------------------------------
*/

const rejectSeller = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    const {
      reason = ""
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seller ID"
      });
    }

    const seller = await User.findOne({
      _id: id,
      role: "seller"
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    seller.sellerProfile =
      seller.sellerProfile || {};

    seller.sellerProfile.approvalStatus =
      "rejected";

    seller.isActive = false;

    await seller.save();

    const cleanReason =
      String(reason || "").trim();

    const sellerMessage =
      cleanReason
        ? `Your seller application has been rejected. Reason: ${cleanReason}`
        : "Your seller application has been rejected.";

    /*
     * --------------------------------------------------------------
     * ADMIN NOTIFICATION
     * --------------------------------------------------------------
     */

    const adminId = getAdminRecipientId(req);

    if (adminId) {
      await notifyUser({
        req,

        recipient: adminId,

        type: "seller_rejected",

        title: "Seller rejected",

        message:
          cleanReason
            ? `${seller.name || "Seller"} has been rejected. Reason: ${cleanReason}`
            : `${seller.name || "Seller"} has been rejected.`,

        data: {
          sellerId: String(seller._id),
          sellerName: seller.name || "",
          sellerEmail: seller.email || "",
          reason: cleanReason,
          action: "rejected"
        }
      });
    } else {
      console.warn(
        "ADMIN NOTIFICATION: Admin recipient ID missing while rejecting seller."
      );
    }

    /*
     * --------------------------------------------------------------
     * REAL-TIME SELLER UI UPDATE
     * --------------------------------------------------------------
     */

    const io = req.app.get("io");

    if (io) {
      io.to(
        `user:${String(seller._id)}`
      ).emit(
        "seller:approval-updated",
        {
          sellerId: String(
            seller._id
          ),

          approvalStatus: "rejected",

          reason: cleanReason,

          message: sellerMessage
        }
      );

      io.to("admin").emit(
        "seller:approval-updated",
        {
          sellerId: String(
            seller._id
          ),

          approvalStatus: "rejected"
        }
      );
    }

    return res.status(200).json({
      success: true,

      message:
        "Seller rejected successfully",

      data: {
        sellerId:
          seller._id,

        approvalStatus:
          seller.sellerProfile
            .approvalStatus,

        isActive:
          seller.isActive,

        reason:
          cleanReason
      }
    });
  }
);

/*
|--------------------------------------------------------------------------
| ACTIVATE / DEACTIVATE SELLER
|--------------------------------------------------------------------------
|
| Admin action:
|
| 1. Change seller active status.
| 2. Create persistent notification for admin.
| 3. Emit seller status UI event.
|
|--------------------------------------------------------------------------
*/

const updateSellerStatus =
  asyncHandler(
    async (req, res) => {
      const { id } =
        req.params;

      const {
        isActive
      } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid seller ID"
        });
      }

      if (
        typeof isActive !==
        "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isActive must be a boolean value"
        });
      }

      const seller =
        await User.findOne({
          _id: id,
          role: "seller"
        });

      if (!seller) {
        return res.status(404).json({
          success: false,
          message:
            "Seller not found"
        });
      }

      if (
        isActive &&
        seller.sellerProfile
          ?.approvalStatus !==
          "approved"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only approved sellers can be activated"
        });
      }

      seller.isActive =
        isActive;

      await seller.save();

      /*
       * --------------------------------------------------------------
       * ADMIN NOTIFICATION
       * --------------------------------------------------------------
       */

      const adminId =
        getAdminRecipientId(req);

      if (adminId) {
        await notifyUser({
          req,

          recipient: adminId,

          type: isActive
            ? "seller_activated"
            : "seller_deactivated",

          title: isActive
            ? "Seller activated"
            : "Seller deactivated",

          message: isActive
            ? `${seller.name || "Seller"} has been activated successfully.`
            : `${seller.name || "Seller"} has been deactivated.`,

          data: {
            sellerId: String(
              seller._id
            ),

            sellerName:
              seller.name || "",

            sellerEmail:
              seller.email || "",

            action: isActive
              ? "activated"
              : "deactivated"
          }
        });
      } else {
        console.warn(
          "ADMIN NOTIFICATION: Admin recipient ID missing while updating seller status."
        );
      }

      /*
       * --------------------------------------------------------------
       * REAL-TIME SELLER UI UPDATE
       * --------------------------------------------------------------
       */

      const io =
        req.app.get("io");

      if (io) {
        io.to(
          `user:${String(
            seller._id
          )}`
        ).emit(
          "seller:status-updated",
          {
            sellerId:
              String(
                seller._id
              ),

            isActive
          }
        );

        io.to("admin").emit(
          "seller:status-updated",
          {
            sellerId:
              String(
                seller._id
              ),

            isActive
          }
        );
      }

      return res.status(200).json({
        success: true,

        message: isActive
          ? "Seller activated successfully"
          : "Seller deactivated successfully",

        data: {
          sellerId:
            seller._id,

          isActive:
            seller.isActive
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| GET PRODUCTS FOR ADMIN MODERATION
|--------------------------------------------------------------------------
*/

const getProductsForModeration =
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
          Number(page) || 1,
          1
        );

      const currentLimit =
        Math.min(
          Math.max(
            Number(limit) || 20,
            1
          ),
          100
        );

      const query = {};

      /*
       * Product status filter
       */

      if (status) {
        const allowedStatuses = [
          "pending",
          "approved",
          "rejected",
          "out_of_stock",
          "inactive"
        ];

        if (
          !allowedStatuses.includes(
            status
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid product status"
          });
        }

        query.status =
          status;
      }

      /*
       * Product search
       */

      if (
        search &&
        search.trim()
      ) {
        const escapedSearch =
          search
            .trim()
            .replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            );

        const searchRegex =
          new RegExp(
            escapedSearch,
            "i"
          );

        query.$or = [
          {
            name: searchRegex
          },

          {
            category: searchRegex
          }
        ];
      }

      const skip =
        (currentPage - 1) *
        currentLimit;

      const [
        products,
        total
      ] = await Promise.all([
        Product.find(query)
          .populate(
            "seller",
            "name email sellerProfile.businessName isActive sellerProfile.approvalStatus"
          )
          .sort({
            createdAt: -1
          })
          .skip(skip)
          .limit(currentLimit)
          .lean(),

        Product.countDocuments(
          query
        )
      ]);

      return res.status(200).json({
        success: true,

        data: products,

        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,

          pages: Math.ceil(
            total /
              currentLimit
          )
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| APPROVE PRODUCT
|--------------------------------------------------------------------------
|
| PATCH /api/admin/products/:id/approve
|
|--------------------------------------------------------------------------
*/

const approveProduct =
  asyncHandler(
    async (req, res) => {
      const { id } =
        req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID"
        });
      }

      const product =
        await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found"
        });
      }

      /*
       * Find the exact seller
       * who owns this product.
       */

      const seller =
        await User.findOne({
          _id: product.seller,
          role: "seller"
        });

      if (!seller) {
        return res.status(400).json({
          success: false,
          message:
            "Product seller no longer exists"
        });
      }

      /*
       * Seller must be approved.
       */

      if (
        seller.sellerProfile
          ?.approvalStatus !==
        "approved"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Seller must be approved before approving the product"
        });
      }

      /*
       * Seller must be active.
       */

      if (!seller.isActive) {
        return res.status(400).json({
          success: false,
          message:
            "Seller account is inactive"
        });
      }

      /*
       * Product status.
       */

      if (
        Number(
          product.stockQuantity
        ) <= 0
      ) {
        product.status =
          "out_of_stock";
      } else {
        product.status =
          "approved";
      }

      await product.save();

      /*
       * Notification information.
       */

      const isApproved =
        product.status ===
        "approved";

      const notificationType =
        isApproved
          ? "product_approved"
          : "product_out_of_stock";

      const notificationTitle =
        isApproved
          ? "Product approved"
          : "Product processed";

      const notificationMessage =
        isApproved
          ? `${product.name} has been approved by the admin and is now available in the marketplace.`
          : `${product.name} was approved by the admin but is currently out of stock.`;

      /*
       * NEW NOTIFICATION SYSTEM
       *
       * Notification is created by:
       *
       * sellerNotificationService.js
       *
       * Only the exact product owner receives it.
       */

      if (isApproved) {
        await notifySellerProductApproved({
          req,
          sellerId: seller._id,
          product
        });
      }

      /*
       * REAL-TIME PRODUCT UI UPDATE
       */

      emitSellerProductUpdate(
        req,
        seller._id,
        {
          productId:
            String(
              product._id
            ),

          productName:
            product.name,

          sellerId:
            String(
              seller._id
            ),

          status:
            product.status,

          type:
            notificationType,

          title:
            notificationTitle,

          message:
            notificationMessage,

          createdAt:
            new Date().toISOString()
        }
      );

      /*
       * Admin live product update.
       */

      emitAdminProductUpdate(
        req,
        {
          productId:
            String(
              product._id
            ),

          productName:
            product.name,

          sellerId:
            String(
              seller._id
            ),

          status:
            product.status
        }
      );

      return res.status(200).json({
        success: true,

        message:
          isApproved
            ? "Product approved successfully"
            : "Product marked out of stock",

        data: {
          productId:
            product._id,

          productName:
            product.name,

          sellerId:
            seller._id,

          status:
            product.status
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| REJECT PRODUCT
|--------------------------------------------------------------------------
|
| PATCH /api/admin/products/:id/reject
|
|--------------------------------------------------------------------------
*/

const rejectProduct =
  asyncHandler(
    async (req, res) => {
      const { id } =
        req.params;

      const {
        reason = ""
      } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID"
        });
      }

      const product =
        await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found"
        });
      }

      /*
       * Exact product owner.
       */

      const seller =
        await User.findOne({
          _id: product.seller,
          role: "seller"
        });

      if (!seller) {
        return res.status(400).json({
          success: false,
          message:
            "Product seller no longer exists"
        });
      }

      product.status =
        "rejected";

      await product.save();

      const cleanReason =
        String(
          reason || ""
        ).trim();

      const message =
        cleanReason
          ? `${product.name} has been rejected by the admin. Reason: ${cleanReason}`
          : `${product.name} has been rejected by the admin.`;

      /*
       * NEW SELLER NOTIFICATION SYSTEM
       */

      await notifySellerProductRejected({
        req,

        sellerId:
          seller._id,

        product,

        reason:
          cleanReason
      });

      /*
       * REAL-TIME PRODUCT UI UPDATE
       */

      emitSellerProductUpdate(
        req,
        seller._id,
        {
          productId:
            String(
              product._id
            ),

          productName:
            product.name,

          sellerId:
            String(
              seller._id
            ),

          status:
            "rejected",

          type:
            "product_rejected",

          title:
            "Product rejected",

          reason:
            cleanReason,

          message,

          createdAt:
            new Date().toISOString()
        }
      );

      /*
       * ADMIN LIVE UPDATE
       */

      emitAdminProductUpdate(
        req,
        {
          productId:
            String(
              product._id
            ),

          productName:
            product.name,

          sellerId:
            String(
              seller._id
            ),

          status:
            "rejected"
        }
      );

      return res.status(200).json({
        success: true,

        message:
          "Product rejected successfully",

        data: {
          productId:
            product._id,

          productName:
            product.name,

          sellerId:
            seller._id,

          status:
            product.status,

          reason:
            cleanReason
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| CHANGE PRODUCT STATUS
|--------------------------------------------------------------------------
|
| PATCH /api/admin/products/:id/status
|
| Supported:
|
| approved
| rejected
| inactive
|
|--------------------------------------------------------------------------
*/

const updateProductModerationStatus =
  asyncHandler(
    async (req, res) => {
      const { id } =
        req.params;

      const {
        status
      } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID"
        });
      }

      const allowedStatuses = [
        "approved",
        "rejected",
        "inactive"
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid moderation status"
        });
      }

      const product =
        await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found"
        });
      }

      /*
       * Find exact seller.
       */

      const seller =
        await User.findOne({
          _id: product.seller,
          role: "seller"
        });

      if (!seller) {
        return res.status(400).json({
          success: false,
          message:
            "Product seller no longer exists"
        });
      }

      /*
       * Approved product requires
       * approved + active seller.
       */

      if (
        status === "approved"
      ) {
        if (
          seller.sellerProfile
            ?.approvalStatus !==
          "approved"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Seller must be approved before activating the product"
          });
        }

        if (!seller.isActive) {
          return res.status(400).json({
            success: false,
            message:
              "Seller account is inactive"
          });
        }
      }

      /*
       * If admin chooses approved but
       * stock is zero, actual status becomes
       * out_of_stock.
       */

      if (
        status === "approved" &&
        Number(
          product.stockQuantity
        ) <= 0
      ) {
        product.status =
          "out_of_stock";
      } else {
        product.status =
          status;
      }

      await product.save();

      /*
       * Handle notification according
       * to FINAL product status.
       */

      if (
        product.status ===
        "approved"
      ) {
        await notifySellerProductApproved({
          req,

          sellerId:
            seller._id,

          product
        });
      } else if (
        product.status ===
        "rejected"
      ) {
        await notifySellerProductRejected({
          req,

          sellerId:
            seller._id,

          product
        });
      } else if (
        product.status ===
        "inactive"
      ) {
        await notifySellerProductDeactivated({
          req,

          sellerId:
            seller._id,

          product
        });
      }

      /*
       * Out-of-stock notification is intentionally
       * not generated through the old notification
       * system.
       *
       * Add a dedicated function to
       * sellerNotificationService.js if you want
       * persistent out-of-stock notifications.
       */

      /*
       * REAL-TIME PRODUCT UI UPDATE
       */

      emitSellerProductUpdate(
        req,
        seller._id,
        {
          productId:
            String(
              product._id
            ),

          productName:
            product.name,

          sellerId:
            String(
              seller._id
            ),

          status:
            product.status,

          createdAt:
            new Date().toISOString()
        }
      );

      /*
       * ADMIN LIVE UPDATE
       */

      emitAdminProductUpdate(
        req,
        {
          productId:
            String(
              product._id
            ),

          productName:
            product.name,

          sellerId:
            String(
              seller._id
            ),

          status:
            product.status
        }
      );

      return res.status(200).json({
        success: true,

        message:
          "Product moderation status updated",

        data: {
          productId:
            product._id,

          productName:
            product.name,

          sellerId:
            seller._id,

          status:
            product.status
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  getDashboardStats,
  getSellers,
  approveSeller,
  rejectSeller,
  updateSellerStatus,
  getProductsForModeration,
  approveProduct,
  rejectProduct,
  updateProductModerationStatus
};