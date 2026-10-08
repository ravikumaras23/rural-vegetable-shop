const User = require("../models/User");

const {
  notifyUsers
} = require("../services/businessNotificationService");

const {
  notifyLowStock
} = require("../services/inventoryNotificationService");

const mongoose = require("mongoose");
const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");

const MAX_PRODUCT_IMAGES = 5;
/*
|--------------------------------------------------------------------------
| VILLAGE / LOCATION HELPERS
|--------------------------------------------------------------------------
| Location is used only for marketplace ranking/filtering.
| Sellers use sellerProfile.village/district/state.
| Customers may use customerProfile.village/district/state.
|--------------------------------------------------------------------------
*/

const normalizeLocationValue = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const getCustomerLocation = (user) => ({
  village:
    user?.customerProfile?.village ||
    user?.profile?.village ||
    user?.village ||
    user?.address?.village ||
    user?.shippingAddress?.village ||
    "",
  district:
    user?.customerProfile?.district ||
    user?.profile?.district ||
    user?.district ||
    user?.address?.district ||
    user?.shippingAddress?.district ||
    "",
  state:
    user?.customerProfile?.state ||
    user?.profile?.state ||
    user?.state ||
    user?.address?.state ||
    user?.shippingAddress?.state ||
    ""
});

const getSellerLocation = (seller) => ({
  village:
    seller?.sellerProfile?.village ||
    seller?.village ||
    "",
  district:
    seller?.sellerProfile?.district ||
    seller?.district ||
    "",
  state:
    seller?.sellerProfile?.state ||
    seller?.state ||
    ""
});

const sameVillage = (customer, seller) => {
  const customerVillage =
    normalizeLocationValue(customer?.village);
  const sellerVillage =
    normalizeLocationValue(seller?.village);

  return Boolean(
    customerVillage &&
    sellerVillage &&
    customerVillage === sellerVillage
  );
};

const sameDistrict = (customer, seller) => {
  const customerDistrict =
    normalizeLocationValue(customer?.district);
  const sellerDistrict =
    normalizeLocationValue(seller?.district);

  return Boolean(
    customerDistrict &&
    sellerDistrict &&
    customerDistrict === sellerDistrict
  );
};

const escapeRegex = (value) =>
  String(value || "")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


/*
|--------------------------------------------------------------------------
| Helper: create slug
|--------------------------------------------------------------------------
*/

const createSlug = (value) => {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/*
|--------------------------------------------------------------------------
| Helper: generate unique slug
|--------------------------------------------------------------------------
*/

const generateUniqueSlug = async (
  name,
  productId = null
) => {
  const baseSlug = createSlug(name);

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = {
      slug
    };

    if (productId) {
      query._id = {
        $ne: productId
      };
    }

    const existingProduct =
      await Product.findOne(query)
        .select("_id");

    if (!existingProduct) {
      return slug;
    }

    counter += 1;

    slug = `${baseSlug}-${counter}`;
  }
};

/*
|--------------------------------------------------------------------------
| Helper: delete Cloudinary image
|--------------------------------------------------------------------------
*/

const deleteCloudinaryImage = async (
  publicId
) => {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(
      publicId
    );
  } catch (error) {
    console.error(
      `Cloudinary delete failed for ${publicId}:`,
      error.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| Helper: emit Socket.IO event
|--------------------------------------------------------------------------
*/

const emitProductEvent = (
  req,
  eventName,
  data
) => {
  const io = req.app.get("io");

  if (!io) {
    return;
  }

  io.emit(eventName, data);
};

/*
|--------------------------------------------------------------------------
| Helper: emit seller-specific Socket.IO event
|--------------------------------------------------------------------------
|
| This is important for SellerProducts.jsx.
|
| The seller must receive product approval/status
| notifications in real time.
|
|--------------------------------------------------------------------------
*/

const emitSellerProductEvent = (
  req,
  sellerId,
  eventName,
  data
) => {
  const io = req.app.get("io");

  if (!io || !sellerId) {
    return;
  }

  io.to(
    `seller:${sellerId}`
  ).emit(
    eventName,
    data
  );
};

/*
|--------------------------------------------------------------------------
| CREATE PRODUCT
|--------------------------------------------------------------------------
| Seller only
|--------------------------------------------------------------------------
*/

const createProduct = async (
  req,
  res,
  next
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required"
      });
    }

    if (
      req.user.role !== "seller"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only sellers can create products"
      });
    }

    if (
      req.user.sellerProfile?.approvalStatus !==
      "approved"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Your seller account must be approved before adding products"
      });
    }

    const {
      name,
      description,
      category,
      price,
      unit,
      stockQuantity,
      lowStockThreshold,
      harvestDate,
      isOrganic
    } = req.body;

    if (
      !name ||
      !category ||
      price === undefined ||
      !unit ||
      stockQuantity === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, category, price, unit and stock quantity are required"
      });
    }

    if (
      !req.files ||
      req.files.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one vegetable image is required"
      });
    }

    if (
      req.files.length >
      MAX_PRODUCT_IMAGES
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Maximum ${MAX_PRODUCT_IMAGES} images are allowed`
      });
    }

    const numericPrice =
      Number(price);

    const numericStock =
      Number(stockQuantity);

    if (
      !Number.isFinite(
        numericPrice
      ) ||
      numericPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Price must be a valid non-negative number"
      });
    }

    if (
      !Number.isFinite(
        numericStock
      ) ||
      numericStock < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Stock quantity must be a valid non-negative number"
      });
    }

    const numericLowStockThreshold =
      lowStockThreshold ===
      undefined
        ? Number(
            process.env
              .LOW_STOCK_THRESHOLD
          ) || 10
        : Number(
            lowStockThreshold
          );

    if (
      !Number.isFinite(
        numericLowStockThreshold
      ) ||
      numericLowStockThreshold < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Low-stock threshold must be a valid non-negative number"
      });
    }

    const slug =
      await generateUniqueSlug(
        name
      );

    const images =
      req.files.map(
        (file) => ({
          url: file.path,
          publicId: file.filename
        })
      );

    let status = "pending";

    if (
      numericStock === 0
    ) {
      status =
        "out_of_stock";
    }

    const product =
      await Product.create({
        seller:
          req.user._id,

        name:
          name.trim(),

        slug,

        description:
          description?.trim() ||
          "",

        category:
          category.trim(),

        price:
          numericPrice,

        unit,

        stockQuantity:
          numericStock,

        lowStockThreshold:
          numericLowStockThreshold,

        harvestDate:
          harvestDate
            ? new Date(
                harvestDate
              )
            : undefined,

        isOrganic:
          isOrganic === true ||
          isOrganic === "true",

        images,

        status
      });

    const populatedProduct =
      await Product.findById(
        product._id
      ).populate(
        "seller",
        "name email phone sellerProfile"
      );

    /*
     * Notify all active administrators
     * about the new product.
     */

    try {
      const admins =
        await User.find({
          role: "admin",
          isActive: true
        }).select("_id");

      if (
        admins.length > 0
      ) {
        await notifyUsers({
          req,
          recipients:
            admins.map(
              (admin) =>
                admin._id
            ),
          type:
            "new_product",
          title:
            "New product submitted",
          message:
            `${product.name} has been submitted for moderation.`,
          data: {
            productId:
              product._id,
            productName:
              product.name,
            sellerId:
              product.seller
          }
        });
      }
    } catch (
      notificationError
    ) {
      console.error(
        "New product notification failed:",
        notificationError.message
      );
    }

    /*
     * Broadcast product creation.
     */

    emitProductEvent(
      req,
      "product:created",
      {
        product:
          populatedProduct
      }
    );

    /*
     * Also notify the seller's room.
     */

    emitSellerProductEvent(
      req,
      product.seller,
      "product:created",
      {
        product:
          populatedProduct
      }
    );

    return res.status(201).json({
      success: true,
      message:
        "Product created successfully and submitted for admin approval",
      product:
        populatedProduct
    });
  } catch (error) {
    /*
     * If database creation fails after
     * Cloudinary uploads, clean uploaded
     * images so orphaned files aren't
     * left behind.
     */

    if (
      req.files?.length
    ) {
      await Promise.all(
        req.files.map(
          (file) =>
            deleteCloudinaryImage(
              file.filename
            )
        )
      );
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL APPROVED PRODUCTS
|--------------------------------------------------------------------------
| Public/customer marketplace
|--------------------------------------------------------------------------
*/

const getProducts = async (
  req,
  res,
  next
) => {
  try {
    const {
      search,
      category,
      seller,
      minPrice,
      maxPrice,
      organic,
      page = 1,
      limit = 12,
      sort = "newest",
      village,
      district,
      villageMode = "prioritized"
    } = req.query;

    const pageNumber =
      Math.max(
        Number(page) || 1,
        1
      );

    const limitNumber =
      Math.min(
        Math.max(
          Number(limit) || 12,
          1
        ),
        50
      );

    const customerLocation =
      getCustomerLocation(
        req.user
      );

    /*
     * Explicit query location has priority over the logged-in
     * customer's location. This lets the marketplace explore
     * another village without changing the customer's profile.
     */
    const targetVillage =
      String(
        village ||
        customerLocation.village ||
        ""
      ).trim();

    const targetDistrict =
      String(
        district ||
        customerLocation.district ||
        ""
      ).trim();

    const filter = {
      status: "approved"
    };

    if (search?.trim()) {
      filter.$text = {
        $search:
          search.trim()
      };
    }

    if (category?.trim()) {
      filter.category =
        category.trim();
    }

    if (
      seller &&
      mongoose.Types.ObjectId.isValid(
        seller
      )
    ) {
      filter.seller =
        seller;
    }

    if (
      minPrice !== undefined ||
      maxPrice !== undefined
    ) {
      filter.price = {};

      if (
        minPrice !== undefined
      ) {
        const value =
          Number(minPrice);

        if (
          !Number.isFinite(
            value
          ) ||
          value < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid minimum price"
          });
        }

        filter.price.$gte =
          value;
      }

      if (
        maxPrice !== undefined
      ) {
        const value =
          Number(maxPrice);

        if (
          !Number.isFinite(
            value
          ) ||
          value < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid maximum price"
          });
        }

        filter.price.$lte =
          value;
      }
    }

    if (
      organic !== undefined
    ) {
      filter.isOrganic =
        organic === "true";
    }

    let sortOption = {
      createdAt: -1
    };

    switch (sort) {
      case "price-low":
        sortOption = {
          price: 1
        };
        break;

      case "price-high":
        sortOption = {
          price: -1
        };
        break;

      case "rating":
        sortOption = {
          ratingAverage: -1,
          ratingCount: -1
        };
        break;

      case "popular":
        sortOption = {
          totalSold: -1
        };
        break;

      case "newest":
      default:
        sortOption = {
          createdAt: -1
        };
        break;
    }

    /*
     * Public/all mode keeps the original product query.
     * For a customer with a village, prioritized mode returns
     * same-village products first and other-village products second.
     */
    const shouldPrioritizeVillage =
      !seller &&
      (
        villageMode === "prioritized" ||
        villageMode === "same" ||
        villageMode === "other" ||
        villageMode === "district"
      ) &&
      Boolean(
        targetVillage ||
        targetDistrict
      );

    let products = [];
    let total = 0;
    let sameVillageCount = 0;
    let otherVillageCount = 0;
    let sameDistrictCount = 0;

    const sellerSelect =
      "name email sellerProfile.businessName sellerProfile.farmName sellerProfile.village sellerProfile.district sellerProfile.state isActive sellerProfile.approvalStatus";

    if (
      shouldPrioritizeVillage
    ) {
      /*
       * Resolve seller IDs by location first. This is much cheaper
       * than loading every product and sorting thousands of records
       * in Node.js.
       */
      const sellerLocationQuery = {
        role: "seller",
        isActive: {
          $ne: false
        }
      };

      if (targetVillage) {
        sellerLocationQuery[
          "sellerProfile.village"
        ] = new RegExp(
          `^${escapeRegex(targetVillage)}$`,
          "i"
        );
      }

      if (
        villageMode === "district" &&
        targetDistrict
      ) {
        sellerLocationQuery[
          "sellerProfile.district"
        ] = new RegExp(
          `^${escapeRegex(targetDistrict)}$`,
          "i"
        );
      }

      const locationSellers =
        await User.find(
          sellerLocationQuery
        ).select(
          "_id sellerProfile.village sellerProfile.district sellerProfile.state"
        ).lean();

      const locationSellerIds =
        locationSellers.map(
          (item) => item._id
        );

      /*
       * For "same", only same-village products are returned.
       * For "other", products from the customer's village are
       * excluded.
       * For "district", products in the district are returned.
       * For "prioritized", same village comes before all others.
       */
      if (
        villageMode === "same"
      ) {
        if (
          locationSellerIds.length === 0
        ) {
          products = [];
          total = 0;
        } else {
          const sameFilter = {
            ...filter,
            seller: {
              $in: locationSellerIds
            }
          };

          products =
            await Product.find(
              sameFilter
            )
              .populate(
                "seller",
                sellerSelect
              )
              .sort(sortOption)
              .skip(
                (pageNumber - 1) *
                  limitNumber
              )
              .limit(limitNumber)
              .lean();

          total =
            await Product.countDocuments(
              sameFilter
            );
        }
      } else if (
        villageMode === "district"
      ) {
        if (
          locationSellerIds.length === 0
        ) {
          products = [];
          total = 0;
        } else {
          const districtFilter = {
            ...filter,
            seller: {
              $in: locationSellerIds
            }
          };

          products =
            await Product.find(
              districtFilter
            )
              .populate(
                "seller",
                sellerSelect
              )
              .sort(sortOption)
              .skip(
                (pageNumber - 1) *
                  limitNumber
              )
              .limit(limitNumber)
              .lean();

          total =
            await Product.countDocuments(
              districtFilter
            );
        }
      } else {
        const sameSellerIds =
          locationSellerIds;

        const sameFilter =
          sameSellerIds.length > 0
            ? {
                ...filter,
                seller: {
                  $in: sameSellerIds
                }
              }
            : {
                ...filter,
                _id: {
                  $exists: false
                }
              };

        const otherFilter =
          sameSellerIds.length > 0
            ? {
                ...filter,
                seller: {
                  $nin: sameSellerIds
                }
              }
            : {
                ...filter
              };

        sameVillageCount =
          await Product.countDocuments(
            sameFilter
          );

        otherVillageCount =
          await Product.countDocuments(
            otherFilter
          );

        total =
          sameVillageCount +
          otherVillageCount;

        if (
          villageMode === "other"
        ) {
          products =
            await Product.find(
              otherFilter
            )
              .populate(
                "seller",
                sellerSelect
              )
              .sort(sortOption)
              .skip(
                (pageNumber - 1) *
                  limitNumber
              )
              .limit(limitNumber)
              .lean();
        } else {
          const skip =
            (pageNumber - 1) *
            limitNumber;

          const sameSkip =
            Math.min(
              skip,
              sameVillageCount
            );

          const sameRemaining =
            Math.max(
              sameVillageCount -
                sameSkip,
              0
            );

          const sameLimit =
            Math.min(
              limitNumber,
              sameRemaining
            );

          const sameProducts =
            sameLimit > 0
              ? await Product.find(
                  sameFilter
                )
                  .populate(
                    "seller",
                    sellerSelect
                  )
                  .sort(sortOption)
                  .skip(sameSkip)
                  .limit(sameLimit)
                  .lean()
              : [];

          const remainingLimit =
            limitNumber -
            sameProducts.length;

          const otherSkip =
            Math.max(
              skip -
                sameVillageCount,
              0
            );

          const otherProducts =
            remainingLimit > 0
              ? await Product.find(
                  otherFilter
                )
                  .populate(
                    "seller",
                    sellerSelect
                  )
                  .sort(sortOption)
                  .skip(otherSkip)
                  .limit(
                    remainingLimit
                  )
                  .lean()
              : [];

          products = [
            ...sameProducts,
            ...otherProducts
          ];
        }
      }

      /*
       * District count is useful to the advanced marketplace UI.
       */
      if (
        targetDistrict &&
        villageMode === "prioritized"
      ) {
        const districtSellers =
          await User.find({
            role: "seller",
            isActive: {
              $ne: false
            },
            "sellerProfile.district":
              new RegExp(
                `^${escapeRegex(
                  targetDistrict
                )}$`,
                "i"
              )
          }).select("_id").lean();

        sameDistrictCount =
          await Product.countDocuments({
            ...filter,
            seller: {
              $in:
                districtSellers.map(
                  (item) =>
                    item._id
                )
            }
          });
      }
    } else {
      const queryFilter = {
        ...filter
      };

      products =
        await Product.find(
          queryFilter
        )
          .populate(
            "seller",
            sellerSelect
          )
          .sort(sortOption)
          .skip(
            (pageNumber - 1) *
              limitNumber
          )
          .limit(limitNumber)
          .lean();

      total =
        await Product.countDocuments(
          queryFilter
        );
    }

    /*
     * Attach a lightweight location classification to every product.
     * This allows the frontend to display:
     *   Same village
     *   Same district
     *   Other village
     */
    const classifiedProducts =
      products.map(
        (product) => {
          const sellerLocation =
            getSellerLocation(
              product.seller
            );

          const same =
            normalizeLocationValue(
              targetVillage
            ) ===
              normalizeLocationValue(
                sellerLocation.village
              ) &&
            Boolean(
              normalizeLocationValue(
                targetVillage
              )
            );

          const districtMatch =
            normalizeLocationValue(
              targetDistrict
            ) ===
              normalizeLocationValue(
                sellerLocation.district
              ) &&
            Boolean(
              normalizeLocationValue(
                targetDistrict
              )
            );

          return {
            ...product,

            marketplaceLocation: {
              sellerVillage:
                sellerLocation.village,
              sellerDistrict:
                sellerLocation.district,
              sellerState:
                sellerLocation.state,
              sameVillage: same,
              sameDistrict:
                districtMatch,
              group:
                same
                  ? "same_village"
                  : districtMatch
                    ? "same_district"
                    : "other_village"
            }
          };
        }
      );

    const pages =
      Math.ceil(
        total /
          limitNumber
      );

    return res.status(200).json({
      success: true,

      products:
        classifiedProducts,

      marketplace: {
        customerVillage:
          customerLocation.village ||
          null,

        customerDistrict:
          customerLocation.district ||
          null,

        selectedVillage:
          targetVillage ||
          null,

        selectedDistrict:
          targetDistrict ||
          null,

        mode:
          villageMode,

        sameVillageCount:
          sameVillageCount,

        sameDistrictCount:
          sameDistrictCount,

        otherVillageCount:
          otherVillageCount,

        locationAvailable:
          Boolean(
            customerLocation.village
          )
      },

      pagination: {
        page:
          pageNumber,

        limit:
          limitNumber,

        total,

        pages,

        hasNextPage:
          pageNumber <
          pages,

        hasPreviousPage:
          pageNumber > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE PRODUCT
|--------------------------------------------------------------------------
*/

const getProductById =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        id
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID"
        });
      }

      const product =
        await Product.findOne({
          _id: id,
          status:
            "approved"
        }).populate(
          "seller",
          "name email phone sellerProfile"
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found"
        });
      }

      return res.status(200).json({
        success: true,
        product
      });
    } catch (error) {
      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| GET SELLER PRODUCTS
|--------------------------------------------------------------------------
*/

const getMyProducts =
  async (
    req,
    res,
    next
  ) => {
    try {
      if (
        req.user.role !==
        "seller"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only sellers can access seller products"
        });
      }

      const {
        status,
        page = 1,
        limit = 20
      } = req.query;

      const pageNumber =
        Math.max(
          Number(page) || 1,
          1
        );

      const limitNumber =
        Math.min(
          Math.max(
            Number(limit) || 20,
            1
          ),
          100
        );

      const filter = {
        seller:
          req.user._id
      };

      if (status) {
        const allowedStatuses = [
          "pending",
          "approved",
          "rejected",
          "out_of_stock",
          "inactive"
        ];

        if (
          !allowedStatuses.includes(
            status
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid product status"
          });
        }

        filter.status =
          status;
      }

      const skip =
        (pageNumber - 1) *
        limitNumber;

      const [
        products,
        total
      ] = await Promise.all([
        Product.find(filter)
          .populate(
            "seller",
            "name email sellerProfile.businessName sellerProfile.farmName sellerProfile.village sellerProfile.district sellerProfile.state"
          )
          .sort({
            createdAt: -1
          })
          .skip(skip)
          .limit(limitNumber),

        Product.countDocuments(
          filter
        )
      ]);

      return res.status(200).json({
        success: true,
        products,

        pagination: {
          page:
            pageNumber,

          limit:
            limitNumber,

          total,

          pages:
            Math.ceil(
              total /
                limitNumber
            )
        }
      });
    } catch (error) {
      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| UPDATE PRODUCT
|--------------------------------------------------------------------------
| Seller can update only their own product.
|--------------------------------------------------------------------------
*/

const updateProduct =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        id
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID"
        });
      }

      if (
        req.user.role !==
        "seller"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only sellers can update products"
        });
      }

      const product =
        await Product.findOne({
          _id: id,
          seller:
            req.user._id
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found or you do not own this product"
        });
      }

      const {
        name,
        description,
        category,
        price,
        unit,
        stockQuantity,
        lowStockThreshold,
        harvestDate,
        isOrganic
      } = req.body;

      const oldStatus =
        product.status;

      const oldStock =
        product.stockQuantity;

      if (name !== undefined) {
        if (
          !name.trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Product name cannot be empty"
          });
        }

        product.name =
          name.trim();

        product.slug =
          await generateUniqueSlug(
            name,
            product._id
          );
      }

      if (
        description !==
        undefined
      ) {
        product.description =
          description.trim();
      }

      if (
        category !==
        undefined
      ) {
        if (
          !category.trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Category cannot be empty"
          });
        }

        product.category =
          category.trim();
      }

      if (price !== undefined) {
        const numericPrice =
          Number(price);

        if (
          !Number.isFinite(
            numericPrice
          ) ||
          numericPrice < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Price must be a valid non-negative number"
          });
        }

        product.price =
          numericPrice;
      }

      if (unit !== undefined) {
        const allowedUnits = [
          "kg",
          "gram",
          "piece",
          "bundle",
          "dozen",
          "litre"
        ];

        if (
          !allowedUnits.includes(
            unit
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid product unit"
          });
        }

        product.unit =
          unit;
      }

      if (
        stockQuantity !==
        undefined
      ) {
        const numericStock =
          Number(
            stockQuantity
          );

        if (
          !Number.isFinite(
            numericStock
          ) ||
          numericStock < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Stock must be a valid non-negative number"
          });
        }

        product.stockQuantity =
          numericStock;
      }

      if (
        lowStockThreshold !==
        undefined
      ) {
        const numericThreshold =
          Number(
            lowStockThreshold
          );

        if (
          !Number.isFinite(
            numericThreshold
          ) ||
          numericThreshold < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Low-stock threshold is invalid"
          });
        }

        product.lowStockThreshold =
          numericThreshold;
      }

      if (
        harvestDate !==
        undefined
      ) {
        const parsedDate =
          new Date(
            harvestDate
          );

        if (
          Number.isNaN(
            parsedDate.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid harvest date"
          });
        }

        product.harvestDate =
          parsedDate;
      }

      if (
        isOrganic !==
        undefined
      ) {
        product.isOrganic =
          isOrganic === true ||
          isOrganic ===
            "true";
      }

      /*
       * New images can be added during update.
       */

      if (
        req.files &&
        req.files.length > 0
      ) {
        const totalImages =
          product.images.length +
          req.files.length;

        if (
          totalImages >
          MAX_PRODUCT_IMAGES
        ) {
          await Promise.all(
            req.files.map(
              (file) =>
                deleteCloudinaryImage(
                  file.filename
                )
            )
          );

          return res.status(400).json({
            success: false,
            message:
              `A product can have maximum ${MAX_PRODUCT_IMAGES} images`
          });
        }

        const newImages =
          req.files.map(
            (file) => ({
              url:
                file.path,
              publicId:
                file.filename
            })
          );

        product.images.push(
          ...newImages
        );
      }

      /*
       * Never allow a product with no images.
       */

      if (
        !product.images ||
        product.images.length ===
          0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Product must contain at least one image"
        });
      }

      /*
       * Automatically maintain inventory status.
       */

      if (
        product.stockQuantity <=
        0
      ) {
        product.status =
          "out_of_stock";
      } else if (
        oldStatus ===
        "out_of_stock"
      ) {
        /*
         * Product returning from zero stock
         * must go through approval again.
         */

        product.status =
          "pending";
      }

      /*
       * Seller edits to an approved product
       * require admin review again.
       */

      const productInformationChanged =
        name !== undefined ||
        description !== undefined ||
        category !== undefined ||
        price !== undefined ||
        unit !== undefined ||
        harvestDate !== undefined ||
        isOrganic !== undefined ||
        (req.files &&
          req.files.length >
            0);

      if (
        productInformationChanged &&
        product.status ===
          "approved"
      ) {
        product.status =
          "pending";
      }

      const updatedProduct =
        await product.save();

      const populatedProduct =
        await Product.findById(
          updatedProduct._id
        ).populate(
          "seller",
          "name email phone sellerProfile"
        );

      /*
       * Notify clients about inventory changes.
       */

      if (
        oldStock !==
        updatedProduct.stockQuantity
      ) {
        emitProductEvent(
          req,
          "inventory:updated",
          {
            productId:
              updatedProduct._id,

            productName:
              updatedProduct.name,

            stockQuantity:
              updatedProduct.stockQuantity,

            status:
              updatedProduct.status,

            sellerId:
              updatedProduct.seller
          }
        );

        /*
         * Seller-specific inventory event.
         */

        emitSellerProductEvent(
          req,
          updatedProduct.seller,
          "inventory:updated",
          {
            productId:
              updatedProduct._id,

            productName:
              updatedProduct.name,

            stockQuantity:
              updatedProduct.stockQuantity,

            status:
              updatedProduct.status,

            sellerId:
              updatedProduct.seller,

            message:
              `${updatedProduct.name} inventory was updated.`
          }
        );

        if (
          updatedProduct.stockQuantity >
            0 &&
          updatedProduct.stockQuantity <=
            updatedProduct.lowStockThreshold
        ) {
          emitProductEvent(
            req,
            "product:low-stock",
            {
              productId:
                updatedProduct._id,

              productName:
                updatedProduct.name,

              stockQuantity:
                updatedProduct.stockQuantity,

              threshold:
                updatedProduct.lowStockThreshold,

              sellerId:
                updatedProduct.seller
            }
          );

          emitSellerProductEvent(
            req,
            updatedProduct.seller,
            "product:low-stock",
            {
              productId:
                updatedProduct._id,

              productName:
                updatedProduct.name,

              stockQuantity:
                updatedProduct.stockQuantity,

              threshold:
                updatedProduct.lowStockThreshold,

              sellerId:
                updatedProduct.seller,

              message:
                `${updatedProduct.name} is running low on stock.`
            }
          );
        }
      }

      /*
       * Product status changed.
       *
       * This event is sent directly to the
       * seller's Socket.IO room.
       */

      if (
        oldStatus !==
        updatedProduct.status
      ) {
        const statusMessage =
          updatedProduct.status ===
          "approved"
            ? `${updatedProduct.name} has been approved and is now available in the marketplace.`
            : updatedProduct.status ===
                "pending"
              ? `${updatedProduct.name} has been submitted for admin approval.`
              : updatedProduct.status ===
                  "rejected"
                ? `${updatedProduct.name} was rejected by the admin.`
                : updatedProduct.status ===
                    "out_of_stock"
                  ? `${updatedProduct.name} is now out of stock.`
                  : updatedProduct.status ===
                      "inactive"
                    ? `${updatedProduct.name} has been deactivated.`
                    : `${updatedProduct.name} status changed to ${updatedProduct.status}.`;

        emitProductEvent(
          req,
          "product:status-updated",
          {
            productId:
              updatedProduct._id,

            productName:
              updatedProduct.name,

            status:
              updatedProduct.status,

            sellerId:
              updatedProduct.seller,

            message:
              statusMessage
          }
        );

        emitSellerProductEvent(
          req,
          updatedProduct.seller,
          "product:status-updated",
          {
            productId:
              updatedProduct._id,

            productName:
              updatedProduct.name,

            status:
              updatedProduct.status,

            sellerId:
              updatedProduct.seller,

            message:
              statusMessage
          }
        );
      }

      /*
       * Product update event.
       */

      emitSellerProductEvent(
        req,
        updatedProduct.seller,
        "product:updated",
        {
          product:
            populatedProduct,

          productId:
            updatedProduct._id,

          productName:
            updatedProduct.name,

          status:
            updatedProduct.status
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Product updated successfully",
        product:
          populatedProduct
      });
    } catch (error) {
      if (
        req.files?.length
      ) {
        await Promise.all(
          req.files.map(
            (file) =>
              deleteCloudinaryImage(
                file.filename
              )
          )
        );
      }

      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| DELETE PRODUCT
|--------------------------------------------------------------------------
*/

const deleteProduct =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        id
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID"
        });
      }

      if (
        req.user.role !==
        "seller"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only sellers can delete products"
        });
      }

      const product =
        await Product.findOne({
          _id: id,
          seller:
            req.user._id
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found or you do not own this product"
        });
      }

      /*
       * Remove Cloudinary images.
       */

      await Promise.all(
        product.images.map(
          (image) =>
            deleteCloudinaryImage(
              image.publicId
            )
        )
      );

      await Product.deleteOne({
        _id:
          product._id
      });

      /*
       * Notify all clients.
       */

      emitProductEvent(
        req,
        "product:deleted",
        {
          productId:
            product._id,

          productName:
            product.name,

          sellerId:
            product.seller
        }
      );

      /*
       * Notify seller specifically.
       */

      emitSellerProductEvent(
        req,
        product.seller,
        "product:deleted",
        {
          productId:
            product._id,

          productName:
            product.name,

          sellerId:
            product.seller,

          message:
            `${product.name} was deleted successfully.`
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Product deleted successfully"
      });
    } catch (error) {
      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| UPDATE STOCK
|--------------------------------------------------------------------------
| This endpoint is for seller inventory management.
|
| Order-time stock deductions will use an atomic
| MongoDB operation in the Order module.
|--------------------------------------------------------------------------
*/

const updateStock =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        id
      } = req.params;

      const {
        stockQuantity
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID"
        });
      }

      const numericStock =
        Number(
          stockQuantity
        );

      if (
        !Number.isFinite(
          numericStock
        ) ||
        numericStock < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Stock quantity must be a valid non-negative number"
        });
      }

      /*
       * Ownership check.
       */

      const product =
        await Product.findOne({
          _id: id,
          seller:
            req.user._id
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found or you do not own this product"
        });
      }

      const oldStock =
        product.stockQuantity;

      const oldStatus =
        product.status;

      /*
       * Update only the stock field.
       */

      product.stockQuantity =
        numericStock;

      if (
        numericStock === 0
      ) {
        product.status =
          "out_of_stock";
      } else if (
        oldStatus ===
        "out_of_stock"
      ) {
        product.status =
          "pending";
      }

      await product.save();

      /*
       * Broadcast live inventory change.
       */

      emitProductEvent(
        req,
        "inventory:updated",
        {
          productId:
            product._id,

          productName:
            product.name,

          stockQuantity:
            product.stockQuantity,

          status:
            product.status,

          sellerId:
            product.seller
        }
      );

      /*
       * Seller-specific inventory event.
       */

      emitSellerProductEvent(
        req,
        product.seller,
        "inventory:updated",
        {
          productId:
            product._id,

          productName:
            product.name,

          stockQuantity:
            product.stockQuantity,

          status:
            product.status,

          sellerId:
            product.seller,

          message:
            `${product.name} inventory was updated.`
        }
      );

      /*
       * Low-stock event.
       */

      if (
        numericStock > 0 &&
        numericStock <=
          product.lowStockThreshold
      ) {
        emitProductEvent(
          req,
          "product:low-stock",
          {
            productId:
              product._id,

            productName:
              product.name,

            stockQuantity:
              numericStock,

            threshold:
              product.lowStockThreshold,

            sellerId:
              product.seller
          }
        );

        emitSellerProductEvent(
          req,
          product.seller,
          "product:low-stock",
          {
            productId:
              product._id,

            productName:
              product.name,

            stockQuantity:
              numericStock,

            threshold:
              product.lowStockThreshold,

            sellerId:
              product.seller,

            message:
              `${product.name} is running low on stock.`
          }
        );
      }

      /*
       * Out-of-stock event.
       */

      if (
        oldStock > 0 &&
        numericStock === 0
      ) {
        emitProductEvent(
          req,
          "product:out-of-stock",
          {
            productId:
              product._id,

            productName:
              product.name,

            sellerId:
              product.seller
          }
        );

        emitSellerProductEvent(
          req,
          product.seller,
          "product:out-of-stock",
          {
            productId:
              product._id,

            productName:
              product.name,

            sellerId:
              product.seller,

            message:
              `${product.name} is now out of stock.`
          }
        );
      }

      /*
       * Status changed because stock changed.
       */

      if (
        oldStatus !==
        product.status
      ) {
        const statusMessage =
          product.status ===
          "out_of_stock"
            ? `${product.name} is now out of stock.`
            : product.status ===
                "pending"
              ? `${product.name} has been returned to pending approval because stock was restored.`
              : `${product.name} status changed to ${product.status}.`;

        emitProductEvent(
          req,
          "product:status-updated",
          {
            productId:
              product._id,

            productName:
              product.name,

            status:
              product.status,

            sellerId:
              product.seller,

            message:
              statusMessage
          }
        );

        emitSellerProductEvent(
          req,
          product.seller,
          "product:status-updated",
          {
            productId:
              product._id,

            productName:
              product.name,

            status:
              product.status,

            sellerId:
              product.seller,

            message:
              statusMessage
          }
        );
      }

      return res.status(200).json({
        success: true,
        message:
          "Stock updated successfully",
        product
      });
    } catch (error) {
      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| REMOVE ONE PRODUCT IMAGE
|--------------------------------------------------------------------------
*/

const removeProductImage =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        id,
        publicId
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID"
        });
      }

      const product =
        await Product.findOne({
          _id: id,
          seller:
            req.user._id
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found or you do not own this product"
        });
      }

      if (
        product.images.length <=
        1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A product must have at least one image"
        });
      }

      const imageIndex =
        product.images.findIndex(
          (image) =>
            image.publicId ===
            publicId
        );

      if (
        imageIndex === -1
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Product image not found"
        });
      }

      const image =
        product.images[
          imageIndex
        ];

      await deleteCloudinaryImage(
        image.publicId
      );

      product.images.splice(
        imageIndex,
        1
      );

      /*
       * Image changes require admin approval.
       */

      if (
        product.status ===
        "approved"
      ) {
        product.status =
          "pending";
      }

      await product.save();

      /*
       * Broadcast generic update.
       */

      emitProductEvent(
        req,
        "product:updated",
        {
          productId:
            product._id,

          productName:
            product.name,

          sellerId:
            product.seller,

          status:
            product.status
        }
      );

      /*
       * Notify seller specifically.
       */

      emitSellerProductEvent(
        req,
        product.seller,
        "product:updated",
        {
          productId:
            product._id,

          productName:
            product.name,

          sellerId:
            product.seller,

          status:
            product.status,

          message:
            `${product.name} was updated.`
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Product image removed successfully",
        product
      });
    } catch (error) {
      next(error);
    }
  };

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getMyProducts,
  updateProduct,
  deleteProduct,
  updateStock,
  removeProductImage
};