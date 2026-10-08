const User =
  require("../models/User");

const Product =
  require("../models/Product");

const Order =
  require("../models/Order");

const asyncHandler =
  require("../utils/asyncHandler");
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
| VEGETABLE KEYWORDS
|--------------------------------------------------------------------------
*/

const VEGETABLE_KEYWORDS = [
  "vegetable",
  "vegetables",
  "veg",
  "green vegetable",
  "leafy",
  "leafy vegetable",
  "root vegetable",
  "tuber",
  "bulb",
  "gourds",
  "beans",
  "peas",
  "spinach",
  "palak",
  "coriander",
  "cilantro",
  "mint",
  "methi",
  "fenugreek",
  "lettuce",
  "kale",
  "broccoli",
  "cabbage",
  "cauliflower",
  "carrot",
  "beetroot",
  "radish",
  "turnip",
  "potato",
  "onion",
  "garlic",
  "tomato",
  "brinjal",
  "eggplant",
  "capsicum",
  "pepper",
  "chilli",
  "okra",
  "bhindi",
  "cucumber",
  "zucchini",
  "pumpkin",
  "bottle gourd",
  "ridge gourd",
  "snake gourd",
  "bitter gourd",
  "drumstick",
  "sweet corn",
  "corn"
];

/*
|--------------------------------------------------------------------------
| GREEN VEGETABLE KEYWORDS
|--------------------------------------------------------------------------
*/

const GREEN_VEGETABLE_KEYWORDS = [
  "green",
  "leafy",
  "spinach",
  "palak",
  "coriander",
  "cilantro",
  "mint",
  "methi",
  "fenugreek",
  "lettuce",
  "kale",
  "broccoli",
  "beans",
  "green bean",
  "peas",
  "green peas",
  "cabbage",
  "capsicum",
  "green capsicum",
  "chilli",
  "green chilli",
  "okra",
  "bhindi",
  "cucumber",
  "zucchini",
  "drumstick",
  "ridge gourd",
  "bottle gourd",
  "snake gourd"
];

/*
|--------------------------------------------------------------------------
| NORMALIZE TEXT
|--------------------------------------------------------------------------
*/

function normalizeText(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

/*
|--------------------------------------------------------------------------
| PRODUCT SEARCH TEXT
|--------------------------------------------------------------------------
*/

function getProductSearchText(
  product
) {
  const tags =
    Array.isArray(
      product?.tags
    )
      ? product.tags.join(" ")
      : "";

  return [
    product?.name,
    product?.category,
    product?.subCategory,
    tags
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}

/*
|--------------------------------------------------------------------------
| VEGETABLE CHECK
|--------------------------------------------------------------------------
*/

function isVegetable(
  product
) {
  const text =
    getProductSearchText(
      product
    );

  return VEGETABLE_KEYWORDS.some(
    (keyword) =>
      text.includes(
        keyword
      )
  );
}

/*
|--------------------------------------------------------------------------
| GREEN VEGETABLE CHECK
|--------------------------------------------------------------------------
*/

function isGreenVegetable(
  product
) {
  const text =
    getProductSearchText(
      product
    );

  return (
    isVegetable(
      product
    ) &&
    GREEN_VEGETABLE_KEYWORDS.some(
      (keyword) =>
        text.includes(
          keyword
        )
    )
  );
}

/*
|--------------------------------------------------------------------------
| INDIA DATE KEY
|--------------------------------------------------------------------------
*/

function getIndiaDateKey(
  date = new Date()
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Asia/Kolkata",

      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit"
    }
  ).format(
    date
  );
}

/*
|--------------------------------------------------------------------------
| DATE-ONLY KEY
|--------------------------------------------------------------------------
*/

function getDateKey(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return getIndiaDateKey(
    date
  );
}

/*
|--------------------------------------------------------------------------
| DAYS FROM TODAY
|--------------------------------------------------------------------------
*/

function getDaysFromToday(
  dateKey
) {
  if (!dateKey) {
    return null;
  }

  const todayKey =
    getIndiaDateKey();

  const [
    todayYear,
    todayMonth,
    todayDay
  ] =
    todayKey
      .split("-")
      .map(Number);

  const [
    targetYear,
    targetMonth,
    targetDay
  ] =
    dateKey
      .split("-")
      .map(Number);

  const today =
    Date.UTC(
      todayYear,
      todayMonth -
        1,
      todayDay
    );

  const target =
    Date.UTC(
      targetYear,
      targetMonth -
        1,
      targetDay
    );

  return Math.round(
    (
      target -
      today
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
}

/*
|--------------------------------------------------------------------------
| HARVEST LABEL
|--------------------------------------------------------------------------
*/

function getHarvestLabel(
  days
) {
  if (
    days ===
    0
  ) {
    return "Today";
  }

  if (
    days ===
    1
  ) {
    return "Tomorrow";
  }

  if (
    days > 1
  ) {
    return `In ${days} days`;
  }

  return "Passed";
}

/*
|--------------------------------------------------------------------------
| GET LIVE MARKETPLACE STATS
|--------------------------------------------------------------------------
|
| GET /api/marketplace/live
|
| This endpoint intentionally exposes aggregate marketplace statistics
| only. It does not expose customer/seller identities or secrets.
|
|--------------------------------------------------------------------------
*/

const getLiveMarketplaceStats =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const now =
        new Date();

      const last24Hours =
        new Date(
          now.getTime() -
            24 *
              60 *
              60 *
              1000
        );

      const previous24HoursStart =
        new Date(
          now.getTime() -
            48 *
              60 *
              60 *
              1000
        );

      /*
      |--------------------------------------------------------------------------
      | USER COUNTS
      |--------------------------------------------------------------------------
      */

      const userCounts =
        await User.aggregate([
          {
            $match: {
              role: {
                $in: [
                  "customer",
                  "seller",
                  "admin"
                ]
              }
            }
          },

          {
            $group: {
              _id:
                "$role",

              count: {
                $sum: 1
              }
            }
          }
        ]);

      const userMap =
        userCounts.reduce(
          (
            result,
            item
          ) => {
            result[
              item._id
            ] =
              item.count;

            return result;
          },
          {
            customer: 0,
            seller: 0,
            admin: 0
          }
        );

      /*
      |--------------------------------------------------------------------------
      | PRODUCT COUNTS
      |--------------------------------------------------------------------------
      */

      const [
        totalProducts,
        approvedProducts,
        outOfStockProducts,
        productDocuments
      ] =
        await Promise.all([
          Product.countDocuments(),

          Product.countDocuments({
            status:
              "approved"
          }),

          Product.countDocuments({
            $or: [
              {
                status:
                  "out_of_stock"
              },

              {
                stockQuantity:
                  {
                    $lte: 0
                  }
              }
            ]
          }),

          Product.find({
            status:
              "approved"
          })
            .select(
              "name category subCategory tags harvestDate stockQuantity"
            )
            .lean()
        ]);

      /*
      |--------------------------------------------------------------------------
      | VEGETABLE COUNTS
      |--------------------------------------------------------------------------
      */

      const vegetableProducts =
        productDocuments.filter(
          isVegetable
        );

      const greenVegetableProducts =
        productDocuments.filter(
          isGreenVegetable
        );

      /*
      |--------------------------------------------------------------------------
      | HARVEST INFORMATION
      |--------------------------------------------------------------------------
      */

      const todayHarvests =
        [];

      const next3DaysHarvests =
        [];

      const next7DaysHarvests =
        [];

      for (
        const product of productDocuments
      ) {
        const harvestDateKey =
          getDateKey(
            product.harvestDate
          );

        if (
          !harvestDateKey
        ) {
          continue;
        }

        const days =
          getDaysFromToday(
            harvestDateKey
          );

        if (
          days ===
          null
        ) {
          continue;
        }

        if (
          days >=
            0 &&
          days <=
            7
        ) {
          const harvestItem =
            {
              productId:
                product._id,

              name:
                product.name ||
                "Vegetable",

              category:
                product.category ||
                "",

              harvestDate:
                product.harvestDate,

              harvestDateKey,

              daysFromToday:
                days,

              label:
                getHarvestLabel(
                  days
                )
            };

          if (
            days ===
            0
          ) {
            todayHarvests.push(
              harvestItem
            );
          }

          if (
            days <=
            3
          ) {
            next3DaysHarvests.push(
              harvestItem
            );
          }

          next7DaysHarvests.push(
            harvestItem
          );
        }
      }

      const sortHarvests =
        (
          a,
          b
        ) =>
          a.daysFromToday -
          b.daysFromToday;

      todayHarvests.sort(
        sortHarvests
      );

      next3DaysHarvests.sort(
        sortHarvests
      );

      next7DaysHarvests.sort(
        sortHarvests
      );

      /*
      |--------------------------------------------------------------------------
      | ORDER ACTIVITY
      |--------------------------------------------------------------------------
      */

      const [
        ordersLast24Hours,
        ordersPrevious24Hours,
        completedOrders24Hours,
        liveOrders
      ] =
        await Promise.all([
          Order.countDocuments({
            createdAt:
              {
                $gte:
                  last24Hours
              },

            orderStatus:
              {
                $nin: [
                  "cancelled",
                  "returned"
                ]
              }
          }),

          Order.countDocuments({
            createdAt: {
              $gte:
                previous24HoursStart,

              $lt:
                last24Hours
            },

            orderStatus:
              {
                $nin: [
                  "cancelled",
                  "returned"
                ]
              }
          }),

          Order.countDocuments({
            updatedAt:
              {
                $gte:
                  last24Hours
              },

            orderStatus:
              "delivered",

            paymentStatus:
              "paid"
          }),

          Order.countDocuments({
            orderStatus: {
              $in: [
                "pending",
                "confirmed",
                "processing",
                "packed",
                "out_for_delivery"
              ]
            }
          })
        ]);

      /*
      |--------------------------------------------------------------------------
      | ORDER TREND
      |--------------------------------------------------------------------------
      */

      let orderTrendPercent =
        0;

      if (
        ordersPrevious24Hours >
        0
      ) {
        orderTrendPercent =
          (
            (
              ordersLast24Hours -
              ordersPrevious24Hours
            ) /
            ordersPrevious24Hours
          ) *
          100;
      } else if (
        ordersLast24Hours >
        0
      ) {
        orderTrendPercent =
          100;
      }

      /*
      |--------------------------------------------------------------------------
      | FRESH INVENTORY
      |--------------------------------------------------------------------------
      */

      const availableProducts =
        productDocuments.filter(
          (product) =>
            Number(
              product.stockQuantity ||
                0
            ) >
            0
        ).length;

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      return res.status(
        200
      ).json({
        success:
          true,

        data: {
          updatedAt:
            now.toISOString(),

          counts: {
            customers:
              userMap.customer,

            sellers:
              userMap.seller,

            admins:
              userMap.admin,

            totalProducts,

            approvedProducts,

            availableProducts,

            outOfStockProducts,

            vegetables:
              vegetableProducts.length,

            greenVegetables:
              greenVegetableProducts.length,

            liveOrders,

            completedOrders24Hours
          },

          orders: {
            last24Hours:
              ordersLast24Hours,

            previous24Hours:
              ordersPrevious24Hours,

            trendPercent:
              Number(
                orderTrendPercent.toFixed(
                  2
                )
              )
          },

          harvest: {
            today:
              todayHarvests.length,

            next3Days:
              next3DaysHarvests.length,

            next7Days:
              next7DaysHarvests.length,

            todayItems:
              todayHarvests.slice(
                0,
                8
              ),

            next3DaysItems:
              next3DaysHarvests.slice(
                0,
                10
              ),

            next7DaysItems:
              next7DaysHarvests.slice(
                0,
                15
              )
          }
        }
      });
    }
  );


/*
|--------------------------------------------------------------------------
| ADVANCED VILLAGE MARKETPLACE
|--------------------------------------------------------------------------
|
| GET /api/marketplace/village
|
| Customer experience:
|   1. Same-village products first.
|   2. Same-district products next.
|   3. Other-village products remain available.
|
| Query:
|   village       - optional village to explore
|   district      - optional district to explore
|   category      - vegetables / food / readymade / custom
|   search        - product search
|   mode          - prioritized / same / district / other / all
|   limit         - maximum products returned
|--------------------------------------------------------------------------
*/

const getAdvancedVillageMarketplace =
  asyncHandler(
    async (req, res) => {
      const {
        village,
        district,
        category,
        search,
        mode = "prioritized",
        limit = 60
      } = req.query;

      const customerLocation =
        getCustomerLocation(
          req.user
        );

      const selectedVillage =
        String(
          village ||
          customerLocation.village ||
          ""
        ).trim();

      const selectedDistrict =
        String(
          district ||
          customerLocation.district ||
          ""
        ).trim();

      const safeLimit =
        Math.min(
          Math.max(
            Number(limit) || 60,
            1
          ),
          200
        );

      const productFilter = {
        status: "approved"
      };

      if (category?.trim()) {
        productFilter.category =
          category.trim();
      }

      if (search?.trim()) {
        productFilter.$text = {
          $search:
            search.trim()
        };
      }

      const sellerSelect =
        "name email sellerProfile.businessName sellerProfile.farmName sellerProfile.village sellerProfile.district sellerProfile.state isActive sellerProfile.approvalStatus";

      /*
       * Find sellers in the selected village/district.
       */
      const sameVillageSellerQuery = {
        role: "seller",
        isActive: {
          $ne: false
        },
        "sellerProfile.approvalStatus":
          "approved"
      };

      if (selectedVillage) {
        sameVillageSellerQuery[
          "sellerProfile.village"
        ] = new RegExp(
          `^${escapeRegex(
            selectedVillage
          )}$`,
          "i"
        );
      }

      const sameVillageSellers =
        selectedVillage
          ? await User.find(
              sameVillageSellerQuery
            )
              .select(
                "_id name sellerProfile"
              )
              .lean()
          : [];

      const sameVillageSellerIds =
        sameVillageSellers.map(
          (seller) =>
            seller._id
        );

      const districtSellerQuery = {
        role: "seller",
        isActive: {
          $ne: false
        },
        "sellerProfile.approvalStatus":
          "approved"
      };

      if (selectedDistrict) {
        districtSellerQuery[
          "sellerProfile.district"
        ] = new RegExp(
          `^${escapeRegex(
            selectedDistrict
          )}$`,
          "i"
        );
      }

      const districtSellers =
        selectedDistrict
          ? await User.find(
              districtSellerQuery
            )
              .select(
                "_id name sellerProfile"
              )
              .lean()
          : [];

      const districtSellerIds =
        districtSellers.map(
          (seller) =>
            seller._id
        );

      const baseSameFilter = {
        ...productFilter,
        ...(sameVillageSellerIds.length
          ? {
              seller: {
                $in:
                  sameVillageSellerIds
              }
            }
          : {
              _id: {
                $exists: false
              }
            })
      };

      const baseDistrictFilter = {
        ...productFilter,
        ...(districtSellerIds.length
          ? {
              seller: {
                $in:
                  districtSellerIds
              }
            }
          : {
              _id: {
                $exists: false
              }
            })
      };

      const baseOtherFilter =
        sameVillageSellerIds.length
          ? {
              ...productFilter,
              seller: {
                $nin:
                  sameVillageSellerIds
              }
            }
          : {
              ...productFilter
            };

      const [
        sameVillageCount,
        sameDistrictCount,
        totalProducts
      ] =
        await Promise.all([
          Product.countDocuments(
            baseSameFilter
          ),

          Product.countDocuments(
            baseDistrictFilter
          ),

          Product.countDocuments(
            productFilter
          )
        ]);

      const sortOption = {
        createdAt: -1
      };

      let sameVillageProducts = [];
      let sameDistrictProducts = [];
      let otherVillageProducts = [];

      if (
        mode === "same"
      ) {
        sameVillageProducts =
          await Product.find(
            baseSameFilter
          )
            .populate(
              "seller",
              sellerSelect
            )
            .sort(sortOption)
            .limit(safeLimit)
            .lean();
      } else if (
        mode === "district"
      ) {
        sameDistrictProducts =
          await Product.find(
            baseDistrictFilter
          )
            .populate(
              "seller",
              sellerSelect
            )
            .sort(sortOption)
            .limit(safeLimit)
            .lean();
      } else if (
        mode === "other"
      ) {
        otherVillageProducts =
          await Product.find(
            baseOtherFilter
          )
            .populate(
              "seller",
              sellerSelect
            )
            .sort(sortOption)
            .limit(safeLimit)
            .lean();
      } else if (
        mode === "all"
      ) {
        otherVillageProducts =
          await Product.find(
            productFilter
          )
            .populate(
              "seller",
              sellerSelect
            )
            .sort(sortOption)
            .limit(safeLimit)
            .lean();
      } else {
        /*
         * Prioritized marketplace:
         * same village -> same district -> other village.
         */
        sameVillageProducts =
          await Product.find(
            baseSameFilter
          )
            .populate(
              "seller",
              sellerSelect
            )
            .sort(sortOption)
            .limit(safeLimit)
            .lean();

        const remainingAfterVillage =
          Math.max(
            safeLimit -
              sameVillageProducts.length,
            0
          );

        if (
          remainingAfterVillage >
          0
        ) {
          const districtOnlyFilter =
            selectedDistrict
              ? {
                  ...baseDistrictFilter,
                  seller:
                    districtSellerIds.filter(
                      (sellerId) =>
                        !sameVillageSellerIds.some(
                          (sameId) =>
                            String(
                              sameId
                            ) ===
                            String(
                              sellerId
                            )
                        )
                    )
                }
              : {
                  _id: {
                    $exists: false
                  }
                };

          sameDistrictProducts =
            await Product.find(
              districtOnlyFilter
            )
              .populate(
                "seller",
                sellerSelect
              )
              .sort(sortOption)
              .limit(
                remainingAfterVillage
              )
              .lean();
        }

        const remainingAfterDistrict =
          Math.max(
            safeLimit -
              sameVillageProducts.length -
              sameDistrictProducts.length,
            0
          );

        if (
          remainingAfterDistrict >
          0
        ) {
          otherVillageProducts =
            await Product.find(
              baseOtherFilter
            )
              .populate(
                "seller",
                sellerSelect
              )
              .sort(sortOption)
              .limit(
                remainingAfterDistrict
              )
              .lean();
        }
      }

      const classify = (
        product
      ) => {
        const sellerLocation =
          getSellerLocation(
            product.seller
          );

        const same =
          normalizeLocationValue(
            selectedVillage
          ) ===
            normalizeLocationValue(
              sellerLocation.village
            ) &&
          Boolean(
            normalizeLocationValue(
              selectedVillage
            )
          );

        const districtMatch =
          normalizeLocationValue(
            selectedDistrict
          ) ===
            normalizeLocationValue(
              sellerLocation.district
            ) &&
          Boolean(
            normalizeLocationValue(
              selectedDistrict
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
            sameVillage:
              same,
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
      };

      const responseSameVillage =
        sameVillageProducts.map(
          classify
        );

      const responseSameDistrict =
        sameDistrictProducts.map(
          classify
        );

      const responseOtherVillages =
        otherVillageProducts.map(
          classify
        );

      /*
       * Village explorer data for the customer.
       */
      const villageGroups =
        await User.aggregate([
          {
            $match: {
              role: "seller",
              isActive: {
                $ne: false
              },
              "sellerProfile.approvalStatus":
                "approved",
              "sellerProfile.village": {
                $exists: true,
                $nin: [
                  null,
                  ""
                ]
              }
            }
          },
          {
            $group: {
              _id: {
                village:
                  "$sellerProfile.village",
                district:
                  "$sellerProfile.district",
                state:
                  "$sellerProfile.state"
              },
              sellers: {
                $sum: 1
              },
              sellerIds: {
                $push: "$_id"
              }
            }
          },
          {
            $sort: {
              sellers: -1,
              "_id.village": 1
            }
          },
          {
            $limit: 100
          }
        ]);

      const villageExplorer =
        [];

      for (
        const group of villageGroups
      ) {
        const productCount =
          await Product.countDocuments({
            status: "approved",
            seller: {
              $in:
                group.sellerIds
            }
          });

        villageExplorer.push({
          village:
            group._id.village,
          district:
            group._id.district ||
            "",
          state:
            group._id.state ||
            "",
          sellers:
            group.sellers,
          products:
            productCount,
          sameVillage:
            normalizeLocationValue(
              group._id.village
            ) ===
            normalizeLocationValue(
              selectedVillage
            )
        });
      }

      return res.status(200).json({
        success: true,

        data: {
          location: {
            customerVillage:
              customerLocation.village ||
              null,
            customerDistrict:
              customerLocation.district ||
              null,
            customerState:
              customerLocation.state ||
              null,
            selectedVillage:
              selectedVillage ||
              null,
            selectedDistrict:
              selectedDistrict ||
              null
          },

          groups: {
            sameVillage:
              responseSameVillage,
            sameDistrict:
              responseSameDistrict,
            otherVillages:
              responseOtherVillages
          },

          counts: {
            sameVillage:
              sameVillageCount,
            sameDistrict:
              sameDistrictCount,
            allProducts:
              totalProducts
          },

          categories: [
            "Vegetables",
            "Food",
            "Readymade"
          ],

          villageExplorer
        }
      });
    }
  );

module.exports = {
  getLiveMarketplaceStats,
  getAdvancedVillageMarketplace
};