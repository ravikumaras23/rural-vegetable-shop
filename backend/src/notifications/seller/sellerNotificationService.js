const {
  notifyUser
} = require("../../services/notificationService");

/*
|--------------------------------------------------------------------------
| SELLER PRODUCT NOTIFICATION SERVICE
|--------------------------------------------------------------------------
|
| Compatibility layer for adminController.js.
|
| The actual notification persistence and Socket.IO delivery are handled
| by the centralized notificationService.js.
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| HELPER
|--------------------------------------------------------------------------
*/

const notifySellerProduct = async ({
  req,
  sellerId,
  type,
  title,
  message,
  product,
  reason = ""
}) => {
  if (!sellerId) {
    throw new Error(
      "Seller ID is required for product notification"
    );
  }

  if (!product) {
    throw new Error(
      "Product is required for product notification"
    );
  }

  const metadata = {
    productId: String(product._id),
    productName: product.name || "",
    sellerId: String(sellerId),
    status: product.status || "",
    reason: reason || ""
  };

  return notifyUser({
    req,

    recipient: sellerId,

    role: "seller",

    type,

    title,

    message,

    metadata,

    data: metadata
  });
};


/*
|--------------------------------------------------------------------------
| PRODUCT ACTIVATED
|--------------------------------------------------------------------------
*/

const notifySellerProductActivated = async ({
  req,
  sellerId,
  product
}) => {
  return notifySellerProduct({
    req,

    sellerId,

    product,

    type: "PRODUCT_ACTIVATED",

    title: "Product activated",

    message:
      `${product.name || "Your product"} has been activated and is now available in the marketplace.`
  });
};


/*
|--------------------------------------------------------------------------
| PRODUCT APPROVED
|--------------------------------------------------------------------------
*/

const notifySellerProductApproved = async ({
  req,
  sellerId,
  product
}) => {
  return notifySellerProduct({
    req,

    sellerId,

    product,

    type: "PRODUCT_APPROVED",

    title: "Product approved",

    message:
      `${product.name || "Your product"} has been approved and is now available in the marketplace.`
  });
};


/*
|--------------------------------------------------------------------------
| PRODUCT REJECTED
|--------------------------------------------------------------------------
*/

const notifySellerProductRejected = async ({
  req,
  sellerId,
  product,
  reason = ""
}) => {
  const cleanReason = String(
    reason || ""
  ).trim();

  const message = cleanReason
    ? `${product.name || "Your product"} has been rejected by the admin. Reason: ${cleanReason}`
    : `${product.name || "Your product"} has been rejected by the admin.`;

  return notifySellerProduct({
    req,

    sellerId,

    product,

    type: "PRODUCT_REJECTED",

    title: "Product rejected",

    message,

    reason: cleanReason
  });
};


/*
|--------------------------------------------------------------------------
| PRODUCT DEACTIVATED
|--------------------------------------------------------------------------
*/

const notifySellerProductDeactivated = async ({
  req,
  sellerId,
  product
}) => {
  return notifySellerProduct({
    req,

    sellerId,

    product,

    type: "PRODUCT_DEACTIVATED",

    title: "Product deactivated",

    message:
      `${product.name || "Your product"} has been deactivated by the admin.`
  });
};


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  notifySellerProductActivated,
  notifySellerProductApproved,
  notifySellerProductRejected,
  notifySellerProductDeactivated
};