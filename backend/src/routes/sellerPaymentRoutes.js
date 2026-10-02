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

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| CUSTOMER
|--------------------------------------------------------------------------
*/

/*
 * POST
 * /api/orders/:orderId/seller-payments/:paymentId/submit
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
*/

/*
 * GET /api/seller/qr-payments
 */
router.get(
  "/seller/qr-payments",
  protect,
  authorize("seller"),
  getSellerQRPayments
);

/*
 * POST
 * /api/seller/qr-payments/:orderId/:paymentId/verify
 */
router.post(
  "/seller/qr-payments/:orderId/:paymentId/verify",
  protect,
  authorize("seller"),
  verifySellerPayment
);

/*
 * POST
 * /api/seller/qr-payments/:orderId/:paymentId/reject
 */
router.post(
  "/seller/qr-payments/:orderId/:paymentId/reject",
  protect,
  authorize("seller"),
  rejectSellerPayment
);

module.exports = router;