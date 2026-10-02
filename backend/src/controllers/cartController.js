const mongoose = require("mongoose");

const Cart = require("../models/Cart");
const Product = require("../models/Product");

const asyncHandler = require("../utils/asyncHandler");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/*
|--------------------------------------------------------------------------
| GET CART
|--------------------------------------------------------------------------
*/

const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({
    customer: req.user._id
  }).populate({
    path: "items.product",
    populate: {
      path: "seller",
      select:
        "name email sellerProfile.businessName isActive sellerProfile.approvalStatus"
    }
  });

  if (!cart) {
    return res.status(200).json({
      success: true,
      data: {
        _id: null,
        customer: req.user._id,
        items: []
      }
    });
  }

  res.status(200).json({
    success: true,
    data: cart
  });
});

/*
|--------------------------------------------------------------------------
| ADD ITEM TO CART
|--------------------------------------------------------------------------
*/

const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return res.status(400).json({
      success: false,
      message: "Product ID is required"
    });
  }

  if (!isValidObjectId(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID"
    });
  }

  const parsedQuantity = Number(quantity);

  if (
    !Number.isInteger(parsedQuantity) ||
    parsedQuantity < 1
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Quantity must be a positive integer"
    });
  }

  const product = await Product.findOne({
    _id: productId,
    status: "approved"
  }).populate(
    "seller",
    "isActive sellerProfile.approvalStatus"
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      message:
        "Product is not available"
    });
  }

  if (!product.seller) {
    return res.status(400).json({
      success: false,
      message:
        "Product seller no longer exists"
    });
  }

  if (
    !product.seller.isActive ||
    product.seller.sellerProfile
      .approvalStatus !== "approved"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Seller is currently unavailable"
    });
  }

  if (product.stockQuantity <= 0) {
    return res.status(400).json({
      success: false,
      message: "Product is out of stock"
    });
  }

  let cart = await Cart.findOne({
    customer: req.user._id
  });

  if (!cart) {
    cart = new Cart({
      customer: req.user._id,
      items: [
        {
          product: product._id,
          quantity: parsedQuantity
        }
      ]
    });
  } else {
    const existingItem =
      cart.items.find(
        (item) =>
          item.product.toString() ===
          product._id.toString()
      );

    if (existingItem) {
      const newQuantity =
        existingItem.quantity +
        parsedQuantity;

      if (
        newQuantity >
        product.stockQuantity
      ) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stockQuantity} ${product.unit} available`
        });
      }

      existingItem.quantity =
        newQuantity;
    } else {
      if (
        parsedQuantity >
        product.stockQuantity
      ) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stockQuantity} ${product.unit} available`
        });
      }

      cart.items.push({
        product: product._id,
        quantity: parsedQuantity
      });
    }
  }

  await cart.save();

  await cart.populate({
    path: "items.product",
    populate: {
      path: "seller",
      select:
        "name email sellerProfile.businessName isActive sellerProfile.approvalStatus"
    }
  });

  res.status(200).json({
    success: true,
    message: "Product added to cart",
    data: cart
  });
});

/*
|--------------------------------------------------------------------------
| UPDATE CART ITEM
|--------------------------------------------------------------------------
*/

const updateCartItem = asyncHandler(
  async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const parsedQuantity = Number(quantity);

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a positive integer"
      });
    }

    const product = await Product.findOne({
      _id: productId,
      status: "approved"
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product is no longer available"
      });
    }

    if (
      parsedQuantity >
      product.stockQuantity
    ) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stockQuantity} ${product.unit} available`
      });
    }

    const cart = await Cart.findOne({
      customer: req.user._id
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    const item = cart.items.find(
      (cartItem) =>
        cartItem.product.toString() ===
        productId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message:
          "Product is not in your cart"
      });
    }

    item.quantity = parsedQuantity;

    await cart.save();

    await cart.populate({
      path: "items.product",
      populate: {
        path: "seller",
        select:
          "name email sellerProfile.businessName isActive sellerProfile.approvalStatus"
      }
    });

    res.status(200).json({
      success: true,
      message: "Cart updated",
      data: cart
    });
  }
);

/*
|--------------------------------------------------------------------------
| REMOVE CART ITEM
|--------------------------------------------------------------------------
*/

const removeFromCart = asyncHandler(
  async (req, res) => {
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const cart = await Cart.findOne({
      customer: req.user._id
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    const originalLength =
      cart.items.length;

    cart.items =
      cart.items.filter(
        (item) =>
          item.product.toString() !==
          productId
      );

    if (
      cart.items.length ===
      originalLength
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Product is not in your cart"
      });
    }

    await cart.save();

    await cart.populate({
      path: "items.product",
      populate: {
        path: "seller",
        select:
          "name email sellerProfile.businessName isActive sellerProfile.approvalStatus"
      }
    });

    res.status(200).json({
      success: true,
      message:
        "Product removed from cart",
      data: cart
    });
  }
);

/*
|--------------------------------------------------------------------------
| CLEAR CART
|--------------------------------------------------------------------------
*/

const clearCart = asyncHandler(
  async (req, res) => {
    const cart = await Cart.findOne({
      customer: req.user._id
    });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is already empty",
        data: {
          customer: req.user._id,
          items: []
        }
      });
    }

    cart.items = [];

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared",
      data: cart
    });
  }
);

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};