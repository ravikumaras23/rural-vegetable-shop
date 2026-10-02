const multer =
  require("multer");

const storage =
  multer.memoryStorage();

const fileFilter =
  (
    req,
    file,
    cb
  ) => {
    const allowed =
      [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

    if (
      allowed.includes(
        file.mimetype
      )
    ) {
      cb(
        null,
        true
      );
    } else {
      cb(
        new Error(
          "Only JPG, PNG and WEBP QR images are allowed"
        ),
        false
      );
    }
  };

const qrUpload =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        5 * 1024 * 1024
    }
  });

module.exports =
  qrUpload;