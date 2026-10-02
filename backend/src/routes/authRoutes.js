const express = require("express");

const {
  registerCustomer,
  registerSeller,
  login,
  getMe,
  updateProfile
} = require("../controllers/authController");

const {
  protect
} = require("../middleware/authMiddleware");

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| CUSTOMER REGISTRATION
|--------------------------------------------------------------------------
*/

router.post(
  "/register/customer",
  registerCustomer
);

/*
|--------------------------------------------------------------------------
| SELLER REGISTRATION
|--------------------------------------------------------------------------
*/

router.post(
  "/register/seller",
  registerSeller
);

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

router.post(
  "/login",
  login
);

/*
|--------------------------------------------------------------------------
| CURRENT USER
|--------------------------------------------------------------------------
|
| GET /api/auth/me
|
*/

router.get(
  "/me",
  protect,
  getMe
);

/*
|--------------------------------------------------------------------------
| UPDATE CURRENT USER PROFILE
|--------------------------------------------------------------------------
|
| PUT /api/auth/profile
|
| Customer:
| {
|   name,
|   phone
| }
|
| Seller:
| {
|   name,
|   phone,
|   sellerProfile: {
|     farmName,
|     farmDescription,
|     village,
|     district,
|     state
|   }
| }
|
*/

router.put(
  "/profile",
  protect,
  updateProfile
);

module.exports = router;