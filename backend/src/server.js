
require("dotenv").config();

const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");
const User = require("./models/User");
const startPaymentExpiryJob = require("./jobs/startPaymentExpiryJob");

const PORT = process.env.PORT || 5000;

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/
const startServer = async () => {
  let httpServer;
  let io;
  let stopPaymentExpiryJob;

  try {
    /*
    |--------------------------------------------------------------------------
    | CONNECT TO MONGODB
    |--------------------------------------------------------------------------
    */
    await connectDB();

    /*
    |--------------------------------------------------------------------------
    | CREATE HTTP SERVER
    |--------------------------------------------------------------------------
    */
    httpServer = http.createServer(app);

    /*
    |--------------------------------------------------------------------------
    | SOCKET.IO CORS CONFIGURATION
    |--------------------------------------------------------------------------
    | Use the same allowed origins configured in src/app.js.
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

    const allowedOrigins =
      app.get("allowedOrigins") ||
      [
        ...new Set([
          ...defaultAllowedOrigins,
          ...configuredOrigins,
        ]),
      ];

    io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          // Allow non-browser/server-to-server requests without Origin.
          if (!origin) {
            return callback(null, true);
          }

          const normalizedOrigin = origin
            .trim()
            .replace(/\/+$/, "");

          if (allowedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
          }

          console.warn(
            `[Socket.IO CORS] Blocked origin: ${normalizedOrigin}`
          );

          return callback(
            new Error(
              `Socket.IO CORS blocked origin: ${normalizedOrigin}`
            )
          );
        },

        credentials: true,
        methods: ["GET", "POST"],
      },

      // WebSocket is preferred; polling remains available as fallback.
      transports: ["websocket", "polling"],
    });

    /*
    |--------------------------------------------------------------------------
    | MAKE SOCKET.IO AVAILABLE TO CONTROLLERS
    |--------------------------------------------------------------------------
    | Controllers can use: req.app.get("io")
    |--------------------------------------------------------------------------
    */
    app.set("io", io);

    console.log("[Socket.IO] Allowed frontend origins:", allowedOrigins);

    /*
    |--------------------------------------------------------------------------
    | SOCKET.IO JWT AUTHENTICATION
    |--------------------------------------------------------------------------
    | The frontend should pass its token using:
    | io(SOCKET_URL, { auth: { token } })
    |--------------------------------------------------------------------------
    */
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token) {
          return next(new Error("Authentication required"));
        }

        const jwtSecret =
          process.env.JWT_SECRET ||
          process.env.JWT_SECRET_KEY ||
          process.env.JWT_PRIVATE_KEY;

        if (!jwtSecret) {
          console.error(
            "SOCKET AUTH ERROR: JWT secret is not configured"
          );

          return next(new Error("JWT secret is not configured"));
        }

        const decoded = jwt.verify(token, jwtSecret);

        const userId =
          decoded?.id ||
          decoded?._id ||
          decoded?.userId ||
          decoded?.sub;

        if (!userId) {
          return next(
            new Error("Invalid authentication token: user ID missing")
          );
        }

        // Read the current user and role from MongoDB instead of trusting
        // a role supplied by the client.
        const user = await User.findById(userId)
          .select("_id role isActive")
          .lean();

        if (!user) {
          return next(new Error("User account not found"));
        }

        if (user.isActive === false) {
          return next(new Error("User account is inactive"));
        }

        socket.user = {
          id: String(user._id),
          role: String(user.role || "").toLowerCase(),
        };

        next();
      } catch (error) {
        console.error(
          "Socket authentication error:",
          error.message
        );

        return next(new Error("Invalid or expired token"));
      }
    });

    /*
    |--------------------------------------------------------------------------
    | SOCKET CONNECTIONS AND ROOMS
    |--------------------------------------------------------------------------
    */
    io.on("connection", (socket) => {
      const userId = String(socket.user.id);
      const role = String(socket.user.role || "").toLowerCase();

      console.log("SOCKET CONNECTED", {
        socketId: socket.id,
        userId,
        role,
      });

      /*
      |--------------------------------------------------------------------------
      | PERSONAL USER ROOM
      |--------------------------------------------------------------------------
      | Room format: user:<userId>
      |--------------------------------------------------------------------------
      */
      const userRoom = `user:${userId}`;
      socket.join(userRoom);

      /*
      |--------------------------------------------------------------------------
      | SELLER ROOM
      |--------------------------------------------------------------------------
      | Room format: seller:<sellerId>
      |--------------------------------------------------------------------------
      */
      let sellerRoom = null;

      if (role === "seller") {
        sellerRoom = `seller:${userId}`;
        socket.join(sellerRoom);
        console.log(`SELLER ROOM JOINED: ${sellerRoom}`);
      }

      /*
      |--------------------------------------------------------------------------
      | ADMIN ROOM
      |--------------------------------------------------------------------------
      | Room name: admin
      |--------------------------------------------------------------------------
      */
      let adminRoom = null;

      if (role === "admin") {
        adminRoom = "admin";
        socket.join(adminRoom);
        console.log("ADMIN ROOM JOINED: admin");
      }

      /*
      |--------------------------------------------------------------------------
      | SOCKET READY EVENT
      |--------------------------------------------------------------------------
      */
      socket.emit("socket:ready", {
        socketId: socket.id,
        userId,
        role,
        userRoom,
        sellerRoom,
        adminRoom,
      });

      /*
      |--------------------------------------------------------------------------
      | OPTIONAL PING / PONG EVENTS
      |--------------------------------------------------------------------------
      */
      socket.on("socket:ping", () => {
        socket.emit("socket:pong", {
          socketId: socket.id,
          userId,
          role,
          timestamp: new Date().toISOString(),
        });
      });

      /*
      |--------------------------------------------------------------------------
      | DISCONNECT EVENT
      |--------------------------------------------------------------------------
      */
      socket.on("disconnect", (reason) => {
        console.log("SOCKET DISCONNECTED", {
          socketId: socket.id,
          userId,
          role,
          reason,
        });
      });
    });

    /*
    |--------------------------------------------------------------------------
    | PAYMENT EXPIRY JOB
    |--------------------------------------------------------------------------
    */
    stopPaymentExpiryJob = startPaymentExpiryJob();

    /*
    |--------------------------------------------------------------------------
    | START HTTP SERVER
    |--------------------------------------------------------------------------
    */
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log("==============================================");
      console.log(`Server listening on port ${PORT}`);
      console.log("Socket.IO server is ready.");
      console.log("Payment expiry job started.");
      console.log("==============================================");
    });

    /*
    |--------------------------------------------------------------------------
    | GRACEFUL SHUTDOWN
    |--------------------------------------------------------------------------
    */
    let isShuttingDown = false;

    const shutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`${signal} received. Shutting down...`);

      if (typeof stopPaymentExpiryJob === "function") {
        try {
          stopPaymentExpiryJob();
          console.log("Payment expiry job stopped.");
        } catch (error) {
          console.error(
            "Error stopping payment expiry job:",
            error.message
          );
        }
      }

      if (io) {
        io.close();
        console.log("Socket.IO server closed.");
      }

      if (httpServer && httpServer.listening) {
        httpServer.close((error) => {
          if (error) {
            console.error("Error closing HTTP server:", error);
            process.exitCode = 1;
          } else {
            console.log("HTTP server closed.");
          }

          process.exit();
        });
      } else {
        process.exit();
      }
    };

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("==============================================");
    console.error(`Server startup failed: ${error.message}`);
    console.error(error);
    console.error("==============================================");

    if (typeof stopPaymentExpiryJob === "function") {
      try {
        stopPaymentExpiryJob();
      } catch (jobError) {
        console.error(
          "Error stopping payment expiry job:",
          jobError.message
        );
      }
    }

    if (io) {
      io.close();
    }

    if (httpServer && httpServer.listening) {
      httpServer.close(() => process.exit(1));
    } else {
      process.exit(1);
    }
  }
};

/*
|--------------------------------------------------------------------------
| START APPLICATION
|--------------------------------------------------------------------------
*/
startServer();