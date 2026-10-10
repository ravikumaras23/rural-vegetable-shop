
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

/*
|--------------------------------------------------------------------------
| ROUTES
|--------------------------------------------------------------------------
*/
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const adminRoutes = require("./routes/adminRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderManagementRoutes = require("./routes/orderManagementRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const razorpayRoutes = require("./routes/razorpayRoutes");
const qrPaymentRoutes = require("./routes/sellerQRPaymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const sellerPaymentRoutes = require("./routes/sellerPaymentRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");

/*
|--------------------------------------------------------------------------
| ERROR MIDDLEWARE
|--------------------------------------------------------------------------
*/
const {
  notFound,
  errorHandler,
} = require("./middleware/errorMiddleware");

/*
|--------------------------------------------------------------------------
| CREATE EXPRESS APPLICATION
|--------------------------------------------------------------------------
*/
const app = express();

/*
|--------------------------------------------------------------------------
| CORS CONFIGURATION
|--------------------------------------------------------------------------
| CLIENT_URL can contain comma-separated frontend origins.
| Example:
| CLIENT_URL=https://your-app.vercel.app,http://localhost:5173
|--------------------------------------------------------------------------
*/

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "https://rural-vegetable-shop-k20uu1mht-ravi-6a21.vercel.app",
];

const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  ...new Set([
    ...defaultAllowedOrigins,
    ...configuredOrigins,
  ]),
];

app.set("allowedOrigins", allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header, such as server-to-server requests.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.trim().replace(/\/+$/, "");

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn(`[Express CORS] Blocked origin: ${normalizedOrigin}`);

    return callback(
      new Error(`CORS blocked origin: ${normalizedOrigin}`)
    );
  },

  credentials: true,

  methods: [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],

  optionsSuccessStatus: 204,
};

// Register CORS before routes and other middleware that may handle API requests.
app.use(cors(corsOptions));

// Explicitly handle browser preflight requests.
app.options(/.*/, cors(corsOptions));

/*
|--------------------------------------------------------------------------
| SECURITY HEADERS
|--------------------------------------------------------------------------
*/
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

/*
|--------------------------------------------------------------------------
| RAZORPAY WEBHOOK RAW BODY SUPPORT
|--------------------------------------------------------------------------
| Preserve the raw body for Razorpay webhook signature verification.
|--------------------------------------------------------------------------
*/
app.use(
  express.json({
    verify: (req, res, buf) => {
      if (
        req.originalUrl.includes("/api/payments/razorpay/webhook")
      ) {
        req.rawBody = Buffer.from(buf);
      }
    },
    limit: "2mb",
  })
);

/*
|--------------------------------------------------------------------------
| URL ENCODED BODY
|--------------------------------------------------------------------------
*/
app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  })
);

/*
|--------------------------------------------------------------------------
| COOKIE PARSER
|--------------------------------------------------------------------------
*/
app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| REQUEST LOGGING
|--------------------------------------------------------------------------
*/
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

/*
|--------------------------------------------------------------------------
| API RATE LIMITER
|--------------------------------------------------------------------------
*/
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,

  // Do not rate-limit CORS preflight requests.
  skip: (req) => req.method === "OPTIONS",

  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

/*
|--------------------------------------------------------------------------
| ROOT AND HEALTH CHECK
|--------------------------------------------------------------------------
*/
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Rural Vegetable Shop API is running",
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Rural Vegetable Shop API is running",
    environment: process.env.NODE_ENV || "development",
  });
});

/*
|--------------------------------------------------------------------------
| AUTHENTICATION ROUTES
|--------------------------------------------------------------------------
| /api/auth/*
|--------------------------------------------------------------------------
*/
app.use("/api/auth", authRoutes);

/*
|--------------------------------------------------------------------------
| PRODUCT ROUTES
|--------------------------------------------------------------------------
| /api/products/*
|--------------------------------------------------------------------------
*/
app.use("/api/products", productRoutes);

/*
|--------------------------------------------------------------------------
| ADMIN ROUTES
|--------------------------------------------------------------------------
| /api/admin/*
|--------------------------------------------------------------------------
*/
app.use("/api/admin", adminRoutes);

/*
|--------------------------------------------------------------------------
| CART ROUTES
|--------------------------------------------------------------------------
| /api/cart/*
|--------------------------------------------------------------------------
*/
app.use("/api/cart", cartRoutes);

/*
|--------------------------------------------------------------------------
| CUSTOMER ORDER ROUTES
|--------------------------------------------------------------------------
| /api/orders/*
|--------------------------------------------------------------------------
*/
app.use("/api/orders", orderRoutes);

/*
|--------------------------------------------------------------------------
| SELLER / ADMIN ORDER MANAGEMENT
|--------------------------------------------------------------------------
| /api/order-management/*
|--------------------------------------------------------------------------
*/
app.use("/api/order-management", orderManagementRoutes);

/*
|--------------------------------------------------------------------------
| GENERAL PAYMENT ROUTES
|--------------------------------------------------------------------------
| /api/payments/*
|--------------------------------------------------------------------------
*/
app.use("/api/payments", paymentRoutes);

/*
|--------------------------------------------------------------------------
| RAZORPAY ROUTES
|--------------------------------------------------------------------------
| /api/payments/razorpay/*
|--------------------------------------------------------------------------
*/
app.use("/api/payments/razorpay", razorpayRoutes);

/*
|--------------------------------------------------------------------------
| SELLER QR PAYMENT ROUTES
|--------------------------------------------------------------------------
| /api/payments/qr/*
|--------------------------------------------------------------------------
*/
app.use("/api/payments/qr", qrPaymentRoutes);

/*
|--------------------------------------------------------------------------
| SELLER ROUTES
|--------------------------------------------------------------------------
| /api/seller/*
|--------------------------------------------------------------------------
*/
app.use("/api/seller", sellerRoutes);

/*
|--------------------------------------------------------------------------
| SELLER PAYMENT / QR TRANSACTION ROUTES
|--------------------------------------------------------------------------
| These routes include endpoints mounted under /api.
|--------------------------------------------------------------------------
*/
app.use("/api", sellerPaymentRoutes);

/*
|--------------------------------------------------------------------------
| MARKETPLACE ROUTES
|--------------------------------------------------------------------------
| /api/marketplace/*
|--------------------------------------------------------------------------
*/
app.use("/api/marketplace", marketplaceRoutes);

/*
|--------------------------------------------------------------------------
| NOTIFICATION ROUTES
|--------------------------------------------------------------------------
| /api/notifications/*
|--------------------------------------------------------------------------
*/
app.use("/api/notifications", notificationRoutes);

/*
|--------------------------------------------------------------------------
| 404 HANDLER
|--------------------------------------------------------------------------
| Must come after all application routes.
|--------------------------------------------------------------------------
*/
app.use(notFound);

/*
|--------------------------------------------------------------------------
| GLOBAL ERROR HANDLER
|--------------------------------------------------------------------------
| Must be the last middleware.
|--------------------------------------------------------------------------
*/
app.use(errorHandler);

/*
|--------------------------------------------------------------------------
| EXPORT APPLICATION
|--------------------------------------------------------------------------
*/
module.exports = app;