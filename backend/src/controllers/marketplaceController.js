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

module.exports = {
  getLiveMarketplaceStats
};