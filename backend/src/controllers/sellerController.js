const mongoose =
  require("mongoose");

const User =
  require("../models/User");

const SellerPaymentSettings =
  require(
    "../models/SellerPaymentSettings"
  );

const cloudinary =
  require(
    "../config/cloudinary"
  );

const asyncHandler =
  require("../utils/asyncHandler");

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isValidObjectId =
  (id) =>
    mongoose.Types.ObjectId.isValid(
      id
    );

const isValidUpiId =
  (value) => {
    const upiId =
      String(
        value || ""
      )
        .trim()
        .toLowerCase();

    if (!upiId) {
      return false;
    }

    if (
      upiId.length > 256
    ) {
      return false;
    }

    return /^[^\s@]+@[A-Za-z0-9._-]+$/.test(
      upiId
    );
  };

const normalizeSettings =
  (settings) => {
    if (!settings) {
      return {
        razorpayEnabled:
          true,

        qrEnabled:
          true,

        defaultMethod:
          "razorpay",

        upiId:
          "",

        qrCodeUrl:
          "",

        qrCodePublicId:
          "",

        razorpayKeyId:
          ""
      };
    }

    return {
      razorpayEnabled:
        settings.razorpayEnabled !==
        false,

      qrEnabled:
        settings.qrEnabled !==
        false,

      defaultMethod:
        settings.defaultMethod ===
        "seller_qr"
          ? "seller_qr"
          : "razorpay",

      upiId:
        String(
          settings.upiId ||
            ""
        )
          .trim()
          .toLowerCase(),

      qrCodeUrl:
        String(
          settings.qrCodeUrl ||
            ""
        ).trim(),

      qrCodePublicId:
        String(
          settings.qrCodePublicId ||
            ""
        ).trim(),

      razorpayKeyId:
        String(
          settings.razorpayKeyId ||
            ""
        ).trim()
    };
  };

/*
|--------------------------------------------------------------------------
| CLOUDINARY BUFFER UPLOAD
|--------------------------------------------------------------------------
*/

const uploadBufferToCloudinary =
  (
    buffer
  ) =>
    new Promise(
      (
        resolve,
        reject
      ) => {
        if (
          !buffer ||
          !Buffer.isBuffer(
            buffer
          )
        ) {
          return reject(
            new Error(
              "Invalid QR image buffer."
            )
          );
        }

        const uploadStream =
          cloudinary.uploader.upload_stream(
            {
              folder:
                "rural-vegetable-shop/seller-qr",

              resource_type:
                "image",

              transformation: [
                {
                  width:
                    1200,

                  height:
                    1200,

                  crop:
                    "limit",

                  quality:
                    "auto",

                  fetch_format:
                    "auto"
                }
              ]
            },
            (
              error,
              result
            ) => {
              if (
                error
              ) {
                return reject(
                  error
                );
              }

              if (
                !result
              ) {
                return reject(
                  new Error(
                    "Cloudinary did not return an upload result."
                  )
                );
              }

              resolve(
                result
              );
            }
          );

        uploadStream.end(
          buffer
        );
      }
    );

/*
|--------------------------------------------------------------------------
| GET SELLER PAYMENT SETTINGS
|--------------------------------------------------------------------------
|
| GET /api/seller/payment-settings
|--------------------------------------------------------------------------
*/

const getSellerPaymentSettings =
  asyncHandler(
    async (
      req,
      res
    ) => {
      if (
        String(
          req.user.role
        ) !==
        "seller"
      ) {
        return res.status(
          403
        ).json({
          success:
            false,

          message:
            "Seller access is required."
        });
      }

      const settings =
        await SellerPaymentSettings.findOne(
          {
            seller:
              req.user._id
          }
        ).lean();

      return res.status(
        200
      ).json({
        success:
          true,

        data:
          normalizeSettings(
            settings
          )
      });
    }
  );

/*
|--------------------------------------------------------------------------
| UPDATE SELLER PAYMENT SETTINGS
|--------------------------------------------------------------------------
|
| PUT /api/seller/payment-settings
|--------------------------------------------------------------------------
*/

const updateSellerPaymentSettings =
  asyncHandler(
    async (
      req,
      res
    ) => {
      if (
        String(
          req.user.role
        ) !==
        "seller"
      ) {
        return res.status(
          403
        ).json({
          success:
            false,

          message:
            "Seller access is required."
        });
      }

      if (
        req.user.isActive ===
        false
      ) {
        return res.status(
          403
        ).json({
          success:
            false,

          message:
            "Inactive sellers cannot update payment settings."
        });
      }

      const razorpayEnabled =
        typeof req.body
          ?.razorpayEnabled ===
        "boolean"
          ? req.body
              .razorpayEnabled
          : true;

      const qrEnabled =
        typeof req.body
          ?.qrEnabled ===
        "boolean"
          ? req.body
              .qrEnabled
          : true;

      const defaultMethod =
        String(
          req.body
            ?.defaultMethod ||
            "razorpay"
        )
          .trim()
          .toLowerCase();

      const upiId =
        String(
          req.body
            ?.upiId ||
            ""
        )
          .trim()
          .toLowerCase();

      const razorpayKeyId =
        String(
          req.body
            ?.razorpayKeyId ||
            ""
        ).trim();

      /*
       * No Razorpay secret is accepted,
       * stored or encrypted here.
       */

      if (
        ![
          "razorpay",
          "seller_qr"
        ].includes(
          defaultMethod
        )
      ) {
        return res.status(
          400
        ).json({
          success:
            false,

          message:
            "Default method must be razorpay or seller_qr."
        });
      }

      if (
        !razorpayEnabled &&
        !qrEnabled
      ) {
        return res.status(
          400
        ).json({
          success:
            false,

          message:
            "At least one payment method must be enabled."
        });
      }

      if (
        defaultMethod ===
          "seller_qr" &&
        !qrEnabled
      ) {
        return res.status(
          400
        ).json({
          success:
            false,

          message:
            "Seller QR must be enabled when it is the default payment method."
        });
      }

      if (
        defaultMethod ===
          "razorpay" &&
        !razorpayEnabled
      ) {
        return res.status(
          400
        ).json({
          success:
            false,

          message:
            "Razorpay must be enabled when it is the default payment method."
        });
      }

      if (
        qrEnabled &&
        upiId &&
        !isValidUpiId(
          upiId
        )
      ) {
        return res.status(
          400
        ).json({
          success:
            false,

          message:
            "Invalid UPI ID. Use the format name@bankhandle."
        });
      }

      let settings =
        await SellerPaymentSettings.findOne(
          {
            seller:
              req.user._id
          }
        );

      if (!settings) {
        settings =
          new SellerPaymentSettings({
            seller:
              req.user._id
          });
      }

      settings.razorpayEnabled =
        razorpayEnabled;

      settings.qrEnabled =
        qrEnabled;

      settings.defaultMethod =
        defaultMethod;

      settings.upiId =
        upiId;

      settings.razorpayKeyId =
        razorpayKeyId;

      /*
       * Existing QR information is preserved.
       *
       * Razorpay secret fields are deliberately
       * not modified.
       */

      await settings.save();

      return res.status(
        200
      ).json({
        success:
          true,

        message:
          "Payment settings saved successfully.",

        data:
          normalizeSettings(
            settings
          )
      });
    }
  );

/*
|--------------------------------------------------------------------------
| UPLOAD SELLER QR
|--------------------------------------------------------------------------
|
| POST /api/seller/payment-settings/qr
|--------------------------------------------------------------------------
*/

const uploadSellerQr =
  asyncHandler(
    async (
      req,
      res
    ) => {
      if (
        String(
          req.user.role
        ) !==
        "seller"
      ) {
        return res.status(
          403
        ).json({
          success:
            false,

          message:
            "Seller access is required."
        });
      }

      if (
        req.user.isActive ===
        false
      ) {
        return res.status(
          403
        ).json({
          success:
            false,

          message:
            "Inactive sellers cannot upload a QR code."
        });
      }

      if (
        !req.file
      ) {
        return res.status(
          400
        ).json({
          success:
            false,

          message:
            "Please select a QR image."
        });
      }

      if (
        !req.file.buffer
      ) {
        return res.status(
          400
        ).json({
          success:
            false,

          message:
            "QR image data is missing."
        });
      }

      let uploadResult;

      try {
        uploadResult =
          await uploadBufferToCloudinary(
            req.file.buffer
          );
      } catch (
        error
      ) {
        console.error(
          "Seller QR Cloudinary upload error:",
          error
        );

        return res.status(
          500
        ).json({
          success:
            false,

          message:
            "Failed to upload QR image."
        });
      }

      const qrCodeUrl =
        String(
          uploadResult
            ?.secure_url ||
            uploadResult
              ?.url ||
            ""
        ).trim();

      const qrCodePublicId =
        String(
          uploadResult
            ?.public_id ||
            ""
        ).trim();

      if (
        !qrCodeUrl
      ) {
        return res.status(
          500
        ).json({
          success:
            false,

          message:
            "QR image upload did not return a valid Cloudinary URL."
        });
      }

      let settings =
        await SellerPaymentSettings.findOne(
          {
            seller:
              req.user._id
          }
        );

      if (!settings) {
        settings =
          new SellerPaymentSettings({
            seller:
              req.user._id
          });
      }

      /*
       * Delete previous QR from Cloudinary
       * after a new upload succeeds.
       */

      const oldPublicId =
        String(
          settings.qrCodePublicId ||
            ""
        ).trim();

      settings.qrCodeUrl =
        qrCodeUrl;

      settings.qrCodePublicId =
        qrCodePublicId;

      settings.qrEnabled =
        true;

      await settings.save();

      if (
        oldPublicId &&
        oldPublicId !==
          qrCodePublicId
      ) {
        cloudinary.uploader.destroy(
          oldPublicId,
          {
            resource_type:
              "image"
          }
        ).catch(
          (
            error
          ) => {
            console.error(
              "Previous seller QR cleanup failed:",
              error
            );
          }
        );
      }

      return res.status(
        200
      ).json({
        success:
          true,

        message:
          "Seller QR uploaded successfully.",

        data:
          normalizeSettings(
            settings
          )
      });
    }
  );

/*
|--------------------------------------------------------------------------
| PUBLIC SELLER PAYMENT INFORMATION
|--------------------------------------------------------------------------
|
| GET /api/seller/:sellerId/payment-settings
|--------------------------------------------------------------------------
*/

const getSellerPublicPaymentSettings =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const {
        sellerId
      } = req.params;

      if (
        !isValidObjectId(
          sellerId
        )
      ) {
        return res.status(
          400
        ).json({
          success:
            false,

          message:
            "Invalid seller ID."
        });
      }

      const seller =
        await User.findOne({
          _id:
            sellerId,

          role:
            "seller",

          isActive:
            true
        }).select(
          "name sellerProfile.businessName sellerProfile.farmName"
        );

      if (!seller) {
        return res.status(
          404
        ).json({
          success:
            false,

          message:
            "Seller not found."
        });
      }

      const settings =
        await SellerPaymentSettings.findOne(
          {
            seller:
              seller._id
          }
        ).lean();

      const normalized =
        normalizeSettings(
          settings
        );

      const sellerName =
        seller.name ||
        seller.sellerProfile
          ?.businessName ||
        seller.sellerProfile
          ?.farmName ||
        "Seller";

      return res.status(
        200
      ).json({
        success:
          true,

        data: {
          sellerId:
            seller._id,

          sellerName,

          paymentSettings: {
            qrEnabled:
              normalized.qrEnabled,

            defaultMethod:
              normalized.defaultMethod,

            upiId:
              normalized.upiId,

            qrCodeUrl:
              normalized.qrCodeUrl
          }
        }
      });
    }
  );

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  getSellerPaymentSettings,
  updateSellerPaymentSettings,
  uploadSellerQr,
  getSellerPublicPaymentSettings
};