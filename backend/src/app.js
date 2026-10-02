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
  errorHandler
} = require("./middleware/errorMiddleware");

/*
|--------------------------------------------------------------------------
| CREATE EXPRESS APPLICATION
|--------------------------------------------------------------------------
|
| IMPORTANT:
| app MUST be initialized before any app.use(), app.get(), etc.
|
|--------------------------------------------------------------------------
*/

const app = express();

/*
|--------------------------------------------------------------------------
| SECURITY HEADERS
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    }
  })
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
|
| Development:
|   http://localhost:5173
|   http://127.0.0.1:5173
|
| Production:
|   Add CLIENT_URL to .env
|
| Multiple origins can be supplied:
|
| CLIENT_URL=https://example.com,https://www.example.com
|
|--------------------------------------------------------------------------
*/

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

const configuredOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => origin.replace(/\/$/, ""))
  : [];

const allowedOrigins = [
  ...new Set([
    ...defaultAllowedOrigins,
    ...configuredOrigins
  ])
];

app.use(
  cors({
    origin: (origin, callback) => {
      /*
       * Requests such as Postman/server-to-server requests
       * may have no Origin header.
       */
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin
        .trim()
        .replace(/\/$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(
        new Error(
          `CORS blocked origin: ${origin}`
        )
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]
  })
);

/*
|--------------------------------------------------------------------------
| RAZORPAY WEBHOOK RAW BODY SUPPORT
|--------------------------------------------------------------------------
|
| Razorpay webhook signature verification requires
| the exact raw request body.
|
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    verify: (req, res, buf) => {
      if (
        req.originalUrl.includes(
          "/api/payments/razorpay/webhook"
        )
      ) {
        req.rawBody = Buffer.from(buf);
      }
    },

    limit: "2mb"
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
    limit: "2mb"
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
| LOGGING
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

  skip: (req) => {
    /*
     * Never rate-limit CORS preflight.
     */
    return req.method === "OPTIONS";
  },

  message: {
    success: false,
    message:
      "Too many requests. Please try again later."
  }
});

app.use(
  "/api",
  apiLimiter
);

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get(
  "/api/health",
  (req, res) => {
    return res.status(200).json({
      success: true,
      message:
        "Rural Vegetable Shop API is running",
      environment:
        process.env.NODE_ENV ||
        "development"
    });
  }
);

/*
|--------------------------------------------------------------------------
| API ROUTES
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
|
| /api/auth/*
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

/*
|--------------------------------------------------------------------------
| PRODUCTS
|--------------------------------------------------------------------------
|
| /api/products/*
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/products",
  productRoutes
);

/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
|
| /api/admin/*
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/admin",
  adminRoutes
);

/*
|--------------------------------------------------------------------------
| CART
|--------------------------------------------------------------------------
|
| /api/cart/*
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/cart",
  cartRoutes
);

/*
|--------------------------------------------------------------------------
| CUSTOMER ORDERS
|--------------------------------------------------------------------------
|
| /api/orders/*
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/orders",
  orderRoutes
);

/*
|--------------------------------------------------------------------------
| SELLER / ADMIN ORDER MANAGEMENT
|--------------------------------------------------------------------------
|
| /api/order-management/*
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/order-management",
  orderManagementRoutes
);

/*
|--------------------------------------------------------------------------
| GENERAL PAYMENT ROUTES
|--------------------------------------------------------------------------
|
| /api/payments/*
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/payments",
  paymentRoutes
);

/*
|--------------------------------------------------------------------------
| DEDICATED RAZORPAY ROUTES
|--------------------------------------------------------------------------
|
| /api/payments/razorpay/*
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/payments/razorpay",
  razorpayRoutes
);

/*
|--------------------------------------------------------------------------
| SELLER QR PAYMENT ROUTES
|--------------------------------------------------------------------------
|
| /api/payments/qr/*
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/payments/qr",
  qrPaymentRoutes
);

/*
|--------------------------------------------------------------------------
| SELLER ROUTES
|--------------------------------------------------------------------------
|
| /api/seller/*
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/seller",
  sellerRoutes
);

/*
|--------------------------------------------------------------------------
| SELLER PAYMENT / QR TRANSACTION ROUTES
|--------------------------------------------------------------------------
|
| sellerPaymentRoutes contains routes such as:
|
| POST /api/orders/:orderId/seller-payments/:paymentId/submit
| GET  /api/seller/qr-payments
| POST /api/seller/qr-payments/:orderId/:paymentId/verify
| POST /api/seller/qr-payments/:orderId/:paymentId/reject
|
| Therefore this router is mounted at /api.
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api",
  sellerPaymentRoutes
);

/*
|--------------------------------------------------------------------------
| MARKETPLACE
|--------------------------------------------------------------------------
|
| /api/marketplace/*
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/marketplace",
  marketplaceRoutes
);

/*
|--------------------------------------------------------------------------
| NOTIFICATIONS
|--------------------------------------------------------------------------
|
| /api/notifications/*
|
| Unified notification API.
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/notifications",
  notificationRoutes
);

/*
|--------------------------------------------------------------------------
| 404 HANDLER
|--------------------------------------------------------------------------
|
| Must come AFTER all application routes.
|
|--------------------------------------------------------------------------
*/

app.use(
  notFound
);

/*
|--------------------------------------------------------------------------
| GLOBAL ERROR HANDLER
|--------------------------------------------------------------------------
|
| Must be the LAST middleware.
|
|--------------------------------------------------------------------------
*/

app.use(
  errorHandler
);

/*
|--------------------------------------------------------------------------
| EXPORT APPLICATION
|--------------------------------------------------------------------------
*/

module.exports = app;