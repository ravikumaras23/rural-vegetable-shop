const express = require("express");

const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook
} = require("../controllers/paymentController");

const {
  protect
} = require("../middleware/authMiddleware");

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| CREATE RAZORPAY ORDER
|--------------------------------------------------------------------------
*/

router.post(
  "/razorpay/order/:orderId",
  protect,
  createRazorpayOrder
);

/*
|--------------------------------------------------------------------------
| VERIFY RAZORPAY PAYMENT
|--------------------------------------------------------------------------
*/

router.post(
  "/razorpay/verify",
  protect,
  verifyRazorpayPayment
);

/*
|--------------------------------------------------------------------------
| RAZORPAY WEBHOOK
|--------------------------------------------------------------------------
*/

router.post(
  "/razorpay/webhook",
  handleRazorpayWebhook
);

module.exports = router;