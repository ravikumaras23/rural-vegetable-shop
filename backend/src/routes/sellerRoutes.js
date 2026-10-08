const express = require("express");

const {
  protect
} = require("../middleware/authMiddleware");

const {
  authorize
} = require("../middleware/roleMiddleware");

const {
  uploadSellerQrImage
} = require("../middleware/sellerQrUploadMiddleware");

const {
  getSellerMarketplaceProfile,
  getSellerPaymentSettings,
  updateSellerPaymentSettings,
  uploadSellerQr,
  getSellerPublicPaymentSettings
} = require("../controllers/sellerController");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| SELLER MARKETPLACE PROFILE
|--------------------------------------------------------------------------
|
| GET /api/seller/marketplace-profile
|
| Returns:
| - Seller village
| - Seller district
| - Seller state
| - Product statistics
| - Seller marketplace information
|
*/

router.get(
  "/marketplace-profile",
  protect,
  authorize("seller"),
  getSellerMarketplaceProfile
);

/*
|--------------------------------------------------------------------------
| SELLER PAYMENT SETTINGS
|--------------------------------------------------------------------------
*/

/*
 * Get seller payment settings
 *
 * GET /api/seller/payment-settings
 */
router.get(
  "/payment-settings",
  protect,
  authorize("seller"),
  getSellerPaymentSettings
);

/*
 * Update seller payment settings
 *
 * PUT /api/seller/payment-settings
 */
router.put(
  "/payment-settings",
  protect,
  authorize("seller"),
  updateSellerPaymentSettings
);

/*
|--------------------------------------------------------------------------
| SELLER QR IMAGE
|--------------------------------------------------------------------------
*/

/*
 * Upload seller QR image
 *
 * POST /api/seller/payment-settings/qr
 */
router.post(
  "/payment-settings/qr",
  protect,
  authorize("seller"),
  uploadSellerQrImage,
  uploadSellerQr
);

/*
|--------------------------------------------------------------------------
| PUBLIC SELLER PAYMENT SETTINGS
|--------------------------------------------------------------------------
*/

/*
 * Get seller public payment settings
 *
 * GET /api/seller/:sellerId/payment-settings
 *
 * Accessible by:
 * - customer
 * - seller
 * - admin
 */
router.get(
  "/:sellerId/payment-settings",
  protect,
  authorize(
    "customer",
    "seller",
    "admin"
  ),
  getSellerPublicPaymentSettings
);

/*
|--------------------------------------------------------------------------
| EXPORT ROUTER
|--------------------------------------------------------------------------
*/

module.exports = router;