const Product =
  require("../models/Product");

/*
|--------------------------------------------------------------------------
| RESERVE INVENTORY
|--------------------------------------------------------------------------
*/

const reserveInventory =
  async ({
    order,
    items,
    session,
    expiresAt
  }) => {
    if (
      !order ||
      !order._id
    ) {
      throw new Error(
        "Order is required for inventory reservation"
      );
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      throw new Error(
        "Order items are required for inventory reservation"
      );
    }

    for (
      const item of items
    ) {
      const quantity =
        Number(
          item.quantity
        );

      if (
        !Number.isFinite(
          quantity
        ) ||
        quantity <= 0
      ) {
        throw new Error(
          `Invalid inventory quantity for "${item.productName}"`
        );
      }

      const updatedProduct =
        await Product.findOneAndUpdate(
          {
            _id:
              item.product,

            status:
              "approved",

            $expr: {
              $lte: [
                {
                  $add: [
                    {
                      $ifNull: [
                        "$reservedQuantity",
                        0
                      ]
                    },

                    quantity
                  ]
                },

                "$stockQuantity"
              ]
            }
          },

          {
            $inc: {
              reservedQuantity:
                quantity
            },

            $push: {
              reservations: {
                order:
                  order._id,

                quantity,

                expiresAt
              }
            }
          },

          {
            new: true,
            session
          }
        );

      if (
        !updatedProduct
      ) {
        throw new Error(
          `Insufficient available stock for "${item.productName}"`
        );
      }
    }
  };

/*
|--------------------------------------------------------------------------
| COMMIT INVENTORY
|--------------------------------------------------------------------------
*/

const commitInventory =
  async ({
    order,
    session
  }) => {
    if (
      !order ||
      !order._id
    ) {
      throw new Error(
        "Order is required for inventory commit"
      );
    }

    const products =
      await Product.find({
        "reservations.order":
          order._id
      }).session(
        session
      );

    if (
      products.length === 0
    ) {
      throw new Error(
        "Inventory reservation records were not found for this order"
      );
    }

    for (
      const product of products
    ) {
      const reservation =
        product.reservations.find(
          (
            reservationItem
          ) =>
            String(
              reservationItem.order
            ) ===
            String(
              order._id
            )
        );

      if (
        !reservation
      ) {
        continue;
      }

      const quantity =
        Number(
          reservation.quantity
        );

      if (
        !Number.isFinite(
          quantity
        ) ||
        quantity <= 0
      ) {
        throw new Error(
          `Invalid reservation quantity for "${product.name}"`
        );
      }

      if (
        Number(
          product.stockQuantity
        ) <
        quantity
      ) {
        throw new Error(
          `Unable to finalize inventory for "${product.name}"`
        );
      }

      product.stockQuantity =
        Number(
          product.stockQuantity
        ) -
        quantity;

      product.reservedQuantity =
        Math.max(
          0,
          Number(
            product.reservedQuantity ||
              0
          ) -
            quantity
        );

      product.totalSold =
        Number(
          product.totalSold ||
            0
        ) +
        quantity;

      product.reservations =
        product.reservations.filter(
          (
            reservationItem
          ) =>
            String(
              reservationItem.order
            ) !==
            String(
              order._id
            )
        );

      if (
        product.stockQuantity <=
        0
      ) {
        product.stockQuantity =
          0;

        product.status =
          "out_of_stock";
      }

      await product.save({
        session
      });
    }
  };

/*
|--------------------------------------------------------------------------
| RELEASE INVENTORY
|--------------------------------------------------------------------------
*/

const releaseInventory =
  async ({
    order,
    session
  }) => {
    if (
      !order ||
      !order._id
    ) {
      throw new Error(
        "Order is required for inventory release"
      );
    }

    const products =
      await Product.find({
        "reservations.order":
          order._id
      }).session(
        session
      );

    for (
      const product of products
    ) {
      const reservation =
        product.reservations.find(
          (
            reservationItem
          ) =>
            String(
              reservationItem.order
            ) ===
            String(
              order._id
            )
        );

      if (
        !reservation
      ) {
        continue;
      }

      const quantity =
        Number(
          reservation.quantity
        );

      product.reservedQuantity =
        Math.max(
          0,
          Number(
            product.reservedQuantity ||
              0
          ) -
            quantity
        );

      product.reservations =
        product.reservations.filter(
          (
            reservationItem
          ) =>
            String(
              reservationItem.order
            ) !==
            String(
              order._id
            )
        );

      if (
        product.status ===
          "out_of_stock" &&
        Number(
          product.stockQuantity
        ) >
          0
      ) {
        product.status =
          "approved";
      }

      await product.save({
        session
      });
    }
  };

module.exports = {
  reserveInventory,
  commitInventory,
  releaseInventory
};