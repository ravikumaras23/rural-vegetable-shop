const express = require("express");

const {
  protect
} = require("../middleware/authMiddleware");

const {
  authorize
} = require("../middleware/roleMiddleware");

const {
  submitSellerPayment,
  getSellerQRPayments,
  verifySellerPayment,
  rejectSellerPayment
} = require("../controllers/sellerQRPaymentController");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| CUSTOMER
|--------------------------------------------------------------------------
| Customer submits UTR / transaction reference after paying seller.
|--------------------------------------------------------------------------
*/

router.post(
  "/orders/:orderId/seller-payments/:paymentId/submit",
  protect,
  authorize("customer"),
  submitSellerPayment
);

/*
|--------------------------------------------------------------------------
| SELLER
|--------------------------------------------------------------------------
| Seller sees pending/submitted QR payments.
|--------------------------------------------------------------------------
*/

router.get(
  "/seller/qr-payments",
  protect,
  authorize("seller"),
  getSellerQRPayments
);

/*
|--------------------------------------------------------------------------
| SELLER VERIFY PAYMENT
|--------------------------------------------------------------------------
*/

router.post(
  "/seller/qr-payments/:orderId/:paymentId/verify",
  protect,
  authorize("seller"),
  verifySellerPayment
);

/*
|--------------------------------------------------------------------------
| SELLER REJECT PAYMENT
|--------------------------------------------------------------------------
*/

router.post(
  "/seller/qr-payments/:orderId/:paymentId/reject",
  protect,
  authorize("seller"),
  rejectSellerPayment
);

module.exports = router;