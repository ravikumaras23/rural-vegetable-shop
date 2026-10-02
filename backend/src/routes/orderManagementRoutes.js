
const express = require("express");

const {
  getSellerOrders,
  getSellerOrderById,
  updateSellerOrderStatus,
  deleteSellerOrder,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  deleteAdminOrder
} = require("../controllers/orderManagementController");

const {
  protect
} = require("../middleware/authMiddleware");

const {
  authorize
} = require("../middleware/roleMiddleware");

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Seller routes
|--------------------------------------------------------------------------
*/

router.get(
  "/seller",
  protect,
  authorize("seller"),
  getSellerOrders
);

router.get(
  "/seller/:id",
  protect,
  authorize("seller"),
  getSellerOrderById
);

router.patch(
  "/seller/:id/status",
  protect,
  authorize("seller"),
  updateSellerOrderStatus
);

router.delete(
  "/seller/:id",
  protect,
  authorize("seller"),
  deleteSellerOrder
);

/*
|--------------------------------------------------------------------------
| Admin routes
|--------------------------------------------------------------------------
*/

router.get(
  "/admin",
  protect,
  authorize("admin"),
  getAdminOrders
);

router.get(
  "/admin/:id",
  protect,
  authorize("admin"),
  getAdminOrderById
);

router.patch(
  "/admin/:id/status",
  protect,
  authorize("admin"),
  updateAdminOrderStatus
);

router.delete(
  "/admin/:id",
  protect,
  authorize("admin"),
  deleteAdminOrder
);

module.exports = router;

