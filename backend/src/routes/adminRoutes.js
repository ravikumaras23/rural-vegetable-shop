const express = require("express");

const {
  getDashboardStats,
  getSellers,
  approveSeller,
  rejectSeller,
  updateSellerStatus,
  getProductsForModeration,
  approveProduct,
  rejectProduct,
  updateProductModerationStatus
} = require("../controllers/adminController");

const {
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus
} = require("../controllers/orderManagementController");

const {
  protect
} = require("../middleware/authMiddleware");

const {
  authorize
} = require("../middleware/roleMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| ADMIN DASHBOARD
|--------------------------------------------------------------------------
*/

router.get(
  "/dashboard",
  protect,
  authorize("admin"),
  getDashboardStats
);

/*
|--------------------------------------------------------------------------
| ADMIN ORDER MANAGEMENT
|--------------------------------------------------------------------------
*/

/*
 * Get all orders
 * GET /api/admin/orders
 */
router.get(
  "/orders",
  protect,
  authorize("admin"),
  getAdminOrders
);

/*
 * Get single order
 * GET /api/admin/orders/:id
 */
router.get(
  "/orders/:id",
  protect,
  authorize("admin"),
  getAdminOrderById
);

/*
 * Update order status
 * PATCH /api/admin/orders/:id/status
 */
router.patch(
  "/orders/:id/status",
  protect,
  authorize("admin"),
  updateAdminOrderStatus
);

/*
|--------------------------------------------------------------------------
| SELLER MANAGEMENT
|--------------------------------------------------------------------------
*/

/*
 * Get all sellers
 * GET /api/admin/sellers
 */
router.get(
  "/sellers",
  protect,
  authorize("admin"),
  getSellers
);

/*
 * Approve seller
 * PATCH /api/admin/sellers/:id/approve
 */
router.patch(
  "/sellers/:id/approve",
  protect,
  authorize("admin"),
  approveSeller
);

/*
 * Reject seller
 * PATCH /api/admin/sellers/:id/reject
 */
router.patch(
  "/sellers/:id/reject",
  protect,
  authorize("admin"),
  rejectSeller
);

/*
 * Activate / deactivate seller
 * PATCH /api/admin/sellers/:id/status
 *
 * Body:
 * {
 *   "isActive": true
 * }
 *
 * or
 *
 * {
 *   "isActive": false
 * }
 */
router.patch(
  "/sellers/:id/status",
  protect,
  authorize("admin"),
  updateSellerStatus
);

/*
|--------------------------------------------------------------------------
| PRODUCT MODERATION
|--------------------------------------------------------------------------
*/

/*
 * Get products for moderation
 * GET /api/admin/products
 */
router.get(
  "/products",
  protect,
  authorize("admin"),
  getProductsForModeration
);

/*
 * Approve product
 * PATCH /api/admin/products/:id/approve
 */
router.patch(
  "/products/:id/approve",
  protect,
  authorize("admin"),
  approveProduct
);

/*
 * Reject product
 * PATCH /api/admin/products/:id/reject
 */
router.patch(
  "/products/:id/reject",
  protect,
  authorize("admin"),
  rejectProduct
);

/*
 * Activate / deactivate product
 * PATCH /api/admin/products/:id/status
 */
router.patch(
  "/products/:id/status",
  protect,
  authorize("admin"),
  updateProductModerationStatus
);

/*
|--------------------------------------------------------------------------
| EXPORT ROUTER
|--------------------------------------------------------------------------
*/

module.exports = router;