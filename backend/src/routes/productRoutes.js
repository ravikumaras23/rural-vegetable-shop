const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  getMyProducts,
  updateProduct,
  deleteProduct,
  updateStock,
  removeProductImage
} = require("../controllers/productController");

const {
  protect
} = require("../middleware/authMiddleware");

const {
  authorize
} = require("../middleware/roleMiddleware");
const {
  uploadProductImages
} = require("../middleware/uploadMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| PUBLIC MARKETPLACE
|--------------------------------------------------------------------------
*/

/*
 * GET /api/products
 *
 * Customers can browse approved products.
 */
router.get(
  "/",
  getProducts
);

/*
 * GET /api/products/:id
 *
 * Customers can view an approved product.
 */
router.get(
  "/:id",
  getProductById
);

/*
|--------------------------------------------------------------------------
| SELLER ROUTES
|--------------------------------------------------------------------------
*/

/*
 * GET /api/products/seller/my-products
 */
router.get(
  "/seller/my-products",
  protect,
  authorize("seller"),
  getMyProducts
);

/*
 * POST /api/products
 *
 * Content-Type:
 * multipart/form-data
 *
 * images = actual vegetable images
 */
router.post(
  "/",
  protect,
  authorize("seller"),
  uploadProductImages,
  createProduct
);

/*
 * PUT /api/products/:id
 *
 * Allows seller to modify their own product.
 *
 * New images can also be uploaded.
 */
router.put(
  "/:id",
  protect,
  authorize("seller"),
  uploadProductImages,
  updateProduct
);

/*
 * PATCH /api/products/:id/stock
 *
 * Seller inventory update.
 */
router.patch(
  "/:id/stock",
  protect,
  authorize("seller"),
  updateStock
);

/*
 * DELETE /api/products/:id/images/:publicId
 *
 * Remove a single image.
 */
router.delete(
  "/:id/images/:publicId",
  protect,
  authorize("seller"),
  removeProductImage
);

/*
 * DELETE /api/products/:id
 */
router.delete(
  "/:id",
  protect,
  authorize("seller"),
  deleteProduct
);

module.exports = router;