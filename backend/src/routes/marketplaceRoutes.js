const express =
  require("express");

const {
  getLiveMarketplaceStats
} =
  require(
    "../controllers/marketplaceController"
  );


const {
  getAdvancedVillageMarketplace
} = require("../controllers/marketplaceController");

// Before module.exports:
router.get(
  "/village",
  protect,
  getAdvancedVillageMarketplace
);


// adminRoutes.js
const {
  getCustomersByVillage,
  getVillageOverview
} = require("../controllers/adminController");

// Before module.exports:
router.get(
  "/customers",
  protect,
  authorizeRoles("admin"),
  getCustomersByVillage
);

router.get(
  "/villages",
  protect,
  authorizeRoles("admin"),
  getVillageOverview
);


// sellerRoutes.js
const {
  getSellerMarketplaceProfile
} = require("../controllers/sellerController");

// Before module.exports:
router.get(
  "/marketplace-profile",
  protect,
  authorizeRoles("seller"),
  getSellerMarketplaceProfile
);

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| LIVE MARKETPLACE ANALYTICS
|--------------------------------------------------------------------------
|
| GET /api/marketplace/live
|
*/

router.get(
  "/live",
  getLiveMarketplaceStats
);

module.exports =
  router;