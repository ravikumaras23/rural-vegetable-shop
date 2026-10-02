const express =
  require("express");

const {
  getLiveMarketplaceStats
} =
  require(
    "../controllers/marketplaceController"
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