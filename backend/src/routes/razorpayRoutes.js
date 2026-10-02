const express =
  require("express");

const {
  createRazorpayOrder,
  verifyRazorpayPayment
} =
  require("../controllers/razorpayController");

const {
  protect
} =
  require("../middleware/authMiddleware");

const {
  authorize
} =
  require("../middleware/roleMiddleware");

const router =
  express.Router();

router.post(
  "/order/:orderId",
  protect,
  authorize("customer"),
  createRazorpayOrder
);

router.post(
  "/verify",
  protect,
  authorize("customer"),
  verifyRazorpayPayment
);

module.exports =
  router;