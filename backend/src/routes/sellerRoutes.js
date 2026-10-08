const express = require("express");

const {
  protect
} = require(
  "../middleware/authMiddleware"
);

const {
  authorize
} = require(
  "../middleware/roleMiddleware"
);

const {
  uploadSellerQrImage
} = require(
  "../middleware/sellerQrUploadMiddleware"
);



const {
  getSellerMarketplaceProfile
} = require("../controllers/sellerController");



router.get(
  "/marketplace-profile",
  protect,
  authorizeRoles("seller"),
  getSellerMarketplaceProfile
);




const {
  getSellerPaymentSettings,
  updateSellerPaymentSettings,
  uploadSellerQr,
  getSellerPublicPaymentSettings
} = require(
  "../controllers/sellerController"
);

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| SELLER PAYMENT SETTINGS
|--------------------------------------------------------------------------
*/

router.get(
  "/payment-settings",
  protect,
  authorize("seller"),
  getSellerPaymentSettings
);

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

module.exports =
  router;