const express = require("express");

const router = express.Router();

const {
  getLiveMarketplaceStats,
  getAdvancedVillageMarketplace
} = require("../controllers/marketplaceController");

// Keep your existing middleware import.
// Change this path/name only if your project uses a different auth middleware.
const { protect } = require("../middleware/authMiddleware");

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

/*
|--------------------------------------------------------------------------
| ADVANCED VILLAGE MARKETPLACE
|--------------------------------------------------------------------------
|
| GET /api/marketplace/village
|
| Shows:
| - Same-village products
| - Same-district products
| - Other-village products
| - Village explorer
| - Marketplace counts
|
*/

router.get(
  "/village",
  protect,
  getAdvancedVillageMarketplace
);

module.exports = router;