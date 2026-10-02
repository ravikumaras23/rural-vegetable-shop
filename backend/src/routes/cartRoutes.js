const express = require("express");

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require("../controllers/cartController");

const {
  protect
} = require("../middleware/authMiddleware");

const {
  authorize
} = require("../middleware/roleMiddleware");
const router = express.Router();

router.use(
  protect,
  authorize("customer")
);

router.get(
  "/",
  getCart
);

router.post(
  "/items",
  addToCart
);

router.patch(
  "/items/:productId",
  updateCartItem
);

router.delete(
  "/items/:productId",
  removeFromCart
);

router.delete(
  "/",
  clearCart
);

module.exports = router;