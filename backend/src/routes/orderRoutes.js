const express = require("express");

const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder
} = require("../controllers/orderController");

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
| CUSTOMER ORDERS
|--------------------------------------------------------------------------
*/

/*
 * POST /api/orders
 *
 * The backend builds the order from the
 * authenticated customer's cart.
 */
router.post(
  "/",
  protect,
  authorize("customer"),
  createOrder
);

/*
 * GET /api/orders/my-orders
 */
router.get(
  "/my-orders",
  protect,
  authorize("customer"),
  getMyOrders
);

/*
 * GET /api/orders/:id
 *
 * getOrderById additionally verifies
 * customer ownership.
 */
router.get(
  "/:id",
  protect,
  authorize("customer"),
  getOrderById
);

/*
 * PATCH /api/orders/:id/cancel
 */
router.patch(
  "/:id/cancel",
  protect,
  authorize("customer"),
  cancelOrder
);

module.exports = router;