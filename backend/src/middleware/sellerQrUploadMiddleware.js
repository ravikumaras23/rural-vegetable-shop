const multer = require("multer");

const {
  CloudinaryStorage
} = require(
  "multer-storage-cloudinary"
);

const cloudinary =
  require(
    "../config/cloudinary"
  );

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const storage =
  new CloudinaryStorage({
    cloudinary,

    params: async () => ({
      folder:
        "rural-vegetable-shop/seller-qr",

      resource_type:
        "image",

      allowed_formats: [
        "jpg",
        "jpeg",
        "png",
        "webp"
      ],

      transformation: [
        {
          width: 1200,
          height: 1200,
          crop: "limit",
          quality: "auto",
          fetch_format: "auto"
        }
      ]
    })
  });

const fileFilter =
  (req, file, cb) => {
    if (
      !allowedMimeTypes.includes(
        file.mimetype
      )
    ) {
      return cb(
        new Error(
          "Only JPG, JPEG, PNG and WEBP QR images are allowed."
        ),
        false
      );
    }

    cb(
      null,
      true
    );
  };

const upload =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        5 * 1024 * 1024,

      files: 1
    }
  });

const uploadSellerQrImage =
  upload.single("qr");

module.exports = {
  uploadSellerQrImage
};