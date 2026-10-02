const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

const errorHandler = (err, req, res, next) => {
  console.error(err);

  let statusCode = res.statusCode >= 400
    ? res.statusCode
    : 500;

  let message = err.message || "Internal server error";

  if (err.name === "ValidationError") {
    statusCode = 400;

    const errors = Object.values(err.errors).map(
      (error) => error.message
    );

    return res.status(statusCode).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  if (err.code === 11000) {
    statusCode = 409;

    const duplicateFields = Object.keys(err.keyPattern || {});

    return res.status(statusCode).json({
      success: false,
      message: `Duplicate value for: ${duplicateFields.join(", ")}`
    });
  }

  if (err.name === "CastError") {
    statusCode = 400;

    message = "Invalid resource identifier";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack
    })
  });
};

module.exports = {
  notFound,
  errorHandler
};