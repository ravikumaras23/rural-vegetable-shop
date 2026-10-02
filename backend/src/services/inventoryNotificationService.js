const User = require("../models/User");

const {
  notifyUser,
  notifyUsers
} = require("./businessNotificationService");

const notifyLowStock = async ({
  req,
  product
}) => {
  const threshold =
    product.lowStockThreshold ??
    Number(
      process.env.LOW_STOCK_THRESHOLD || 10
    );

  if (
    product.stockQuantity > threshold
  ) {
    return;
  }

  /*
   * Seller notification.
   */
  await notifyUser({
    req,
    recipient: product.seller,
    type: "low_stock",
    title: "Low stock alert",
    message:
      `${product.name} has only ${product.stockQuantity} units remaining.`,
    data: {
      productId: product._id,
      productName: product.name,
      stockQuantity:
        product.stockQuantity,
      threshold
    }
  });

  /*
   * Admin notification.
   */
  const admins = await User.find({
    role: "admin",
    isActive: true
  }).select("_id");

  await notifyUsers({
    req,
    recipients: admins.map(
      (admin) => admin._id
    ),
    type: "low_stock",
    title: "Low stock alert",
    message:
      `${product.name} is running low on stock.`,
    data: {
      productId: product._id,
      productName: product.name,
      sellerId: product.seller,
      stockQuantity:
        product.stockQuantity,
      threshold
    }
  });
};

module.exports = {
  notifyLowStock
};