const SellerPayment =
  require("../models/SellerPayment");

const buildSellerPayments =
  async ({
    orderItems,
    paymentMethod
  }) => {
    const sellerMap =
      new Map();

    for (const item of orderItems) {
      const sellerId =
        String(item.seller);

      const current =
        sellerMap.get(
          sellerId
        ) || {
          seller:
            item.seller,

          amount: 0
        };

      current.amount +=
        Number(
          item.subtotal || 0
        );

      sellerMap.set(
        sellerId,
        current
      );
    }

    const sellerIds = [
      ...sellerMap.keys()
    ];

    const settings =
      await SellerPayment.find({
        seller: {
          $in:
            sellerIds
        }
      }).lean();

    const settingsMap =
      new Map(
        settings.map(
          (setting) => [
            String(
              setting.seller
            ),
            setting
          ]
        )
      );

    const result = [];

    for (
      const sellerEntry of
        sellerMap.values()
    ) {
      const setting =
        settingsMap.get(
          String(
            sellerEntry.seller
          )
        );

      if (
        paymentMethod ===
        "seller_qr"
      ) {
        if (
          !setting?.qrEnabled ||
          !setting?.upiId ||
          !setting?.qrImage?.url
        ) {
          throw new Error(
            "One or more sellers do not have Seller QR payment configured"
          );
        }
      }

      result.push({
        seller:
          sellerEntry.seller,

        amount:
          Number(
            sellerEntry.amount.toFixed(
              2
            )
          ),

        paymentMethod,

        status:
          "pending",

        upiIdSnapshot:
          paymentMethod ===
          "seller_qr"
            ? setting.upiId
            : "",

        qrImageSnapshot:
          paymentMethod ===
          "seller_qr"
            ? setting.qrImage.url
            : ""
      });
    }

    return result;
  };

module.exports = {
  buildSellerPayments
};