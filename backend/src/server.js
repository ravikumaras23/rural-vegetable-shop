require("dotenv").config();

const http = require("http");
const jwt = require("jsonwebtoken");

const {
  Server,
} = require("socket.io");

const app = require("./app");

const connectDB =
  require("./config/db");

const User =
  require("./models/User");

const startPaymentExpiryJob =
  require("./jobs/startPaymentExpiryJob");

const PORT =
  process.env.PORT || 5000;

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const startServer = async () => {
  try {
    /*
    |--------------------------------------------------------------------------
    | CONNECT DATABASE
    |--------------------------------------------------------------------------
    */

    await connectDB();

    /*
    |--------------------------------------------------------------------------
    | CREATE HTTP SERVER
    |--------------------------------------------------------------------------
    */

    const httpServer =
      http.createServer(app);

    /*
    |--------------------------------------------------------------------------
    | CREATE SOCKET.IO SERVER
    |--------------------------------------------------------------------------
    */

    const clientUrl =
      process.env.CLIENT_URL ||
      "http://localhost:5173";

    const io =
      new Server(
        httpServer,
        {
          cors: {
            origin: clientUrl,
            credentials: true,
          },

          /*
           * Allow websocket first and
           * polling as fallback.
           */
          transports: [
            "websocket",
            "polling",
          ],
        }
      );

    /*
    |--------------------------------------------------------------------------
    | MAKE SOCKET.IO AVAILABLE TO EXPRESS
    |--------------------------------------------------------------------------
    |
    | Controllers can access it using:
    |
    | const io = req.app.get("io");
    |
    */

    app.set("io", io);

    console.log(
      "Socket.IO configured with CLIENT_URL:",
      clientUrl
    );

    /*
    |--------------------------------------------------------------------------
    | SOCKET AUTHENTICATION
    |--------------------------------------------------------------------------
    |
    | Frontend sends:
    |
    | io(SOCKET_URL, {
    |   auth: {
    |     token
    |   }
    | });
    |
    |--------------------------------------------------------------------------
    */

    io.use(
      async (socket, next) => {
        try {
          /*
           * Get token from Socket.IO
           * handshake.
           */
          const token =
            socket.handshake.auth
              ?.token;

          if (!token) {
            console.error(
              "SOCKET AUTH ERROR: Token missing"
            );

            return next(
              new Error(
                "Authentication required"
              )
            );
          }

          /*
           * JWT secret.
           *
           * Supports the project's common
           * environment variable names.
           */
          const jwtSecret =
            process.env.JWT_SECRET ||
            process.env.JWT_SECRET_KEY ||
            process.env.JWT_PRIVATE_KEY;

          if (!jwtSecret) {
            console.error(
              "SOCKET AUTH ERROR: JWT secret is not configured"
            );

            return next(
              new Error(
                "JWT secret is not configured"
              )
            );
          }

          /*
           * Verify JWT.
           */
          const decoded =
            jwt.verify(
              token,
              jwtSecret
            );

          /*
           * Support multiple possible
           * JWT user ID field names.
           */
          const userId =
            decoded?.id ||
            decoded?._id ||
            decoded?.userId ||
            decoded?.sub;

          if (!userId) {
            console.error(
              "SOCKET AUTH ERROR: User ID missing from JWT"
            );

            return next(
              new Error(
                "Invalid authentication token: user ID missing"
              )
            );
          }

          /*
           * IMPORTANT:
           *
           * Do not trust the role only from
           * the JWT.
           *
           * Read the current user from MongoDB.
           */
          const user =
            await User.findById(
              userId
            )
              .select(
                "_id role isActive"
              )
              .lean();

          if (!user) {
            console.error(
              "SOCKET AUTH ERROR: User not found:",
              String(userId)
            );

            return next(
              new Error(
                "User account not found"
              )
            );
          }

          /*
           * Check whether account is active.
           */
          if (
            user.isActive === false
          ) {
            console.error(
              "SOCKET AUTH ERROR: User inactive:",
              String(user._id)
            );

            return next(
              new Error(
                "User account is inactive"
              )
            );
          }

          /*
           * Normalize role.
           */
          const role =
            String(
              user.role || ""
            ).toLowerCase();

          /*
           * Store verified user information
           * on socket.
           */
          socket.user = {
            id: String(
              user._id
            ),

            role,
          };

          console.log(
            "SOCKET AUTH SUCCESS:",
            {
              userId: String(
                user._id
              ),

              role,
            }
          );

          next();
        } catch (error) {
          console.error(
            "Socket authentication error:",
            error.message
          );

          return next(
            new Error(
              "Invalid or expired token"
            )
          );
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | SOCKET CONNECTION
    |--------------------------------------------------------------------------
    */

    io.on(
      "connection",
      (socket) => {
        /*
         * User information was already
         * authenticated in io.use().
         */
        const userId =
          String(
            socket.user.id
          );

        const role =
          String(
            socket.user.role ||
              ""
          ).toLowerCase();

        console.log(
          "================================================"
        );

        console.log(
          "SOCKET CONNECTED"
        );

        console.log({
          socketId:
            socket.id,

          userId,

          role,
        });

        console.log(
          "================================================"
        );

        /*
        |--------------------------------------------------------------------------
        | PERSONAL USER ROOM
        |--------------------------------------------------------------------------
        |
        | Every authenticated user gets:
        |
        | user:<userId>
        |
        */

        const userRoom =
          `user:${userId}`;

        socket.join(
          userRoom
        );

        console.log(
          `USER ROOM JOINED: ${userRoom}`
        );

        /*
        |--------------------------------------------------------------------------
        | SELLER ROOM
        |--------------------------------------------------------------------------
        |
        | Seller ID:
        |
        | 123
        |
        | joins:
        |
        | seller:123
        |
        | This MUST match:
        |
        | io.to(`seller:${sellerId}`)
        |
        */

        let sellerRoom =
          null;

        if (
          role === "seller"
        ) {
          sellerRoom =
            `seller:${userId}`;

          socket.join(
            sellerRoom
          );

          console.log(
            `SELLER ROOM JOINED: ${sellerRoom}`
          );
        }

        /*
        |--------------------------------------------------------------------------
        | ADMIN ROOM
        |--------------------------------------------------------------------------
        |
        | Admin joins:
        |
        | admin
        |
        | This MUST match:
        |
        | io.to("admin")
        |
        */

        let adminRoom =
          null;

        if (
          role === "admin"
        ) {
          adminRoom =
            "admin";

          socket.join(
            adminRoom
          );

          console.log(
            "ADMIN ROOM JOINED: admin"
          );
        }

        /*
        |--------------------------------------------------------------------------
        | SOCKET READY
        |--------------------------------------------------------------------------
        |
        | Frontend can listen for:
        |
        | socket.on("socket:ready", ...)
        |
        */

        socket.emit(
          "socket:ready",
          {
            socketId:
              socket.id,

            userId,

            role,

            userRoom,

            sellerRoom,

            adminRoom,
          }
        );

        console.log(
          "SOCKET READY SENT:",
          {
            socketId:
              socket.id,

            userId,

            role,

            userRoom,

            sellerRoom,

            adminRoom,
          }
        );

        /*
        |--------------------------------------------------------------------------
        | SOCKET PING
        |--------------------------------------------------------------------------
        |
        | Optional debugging event.
        */

        socket.on(
          "socket:ping",
          () => {
            socket.emit(
              "socket:pong",
              {
                socketId:
                  socket.id,

                userId,

                role,

                timestamp:
                  new Date().toISOString(),
              }
            );
          }
        );

        /*
        |--------------------------------------------------------------------------
        | DISCONNECT
        |--------------------------------------------------------------------------
        */

        socket.on(
          "disconnect",
          (reason) => {
            console.log(
              "================================================"
            );

            console.log(
              "SOCKET DISCONNECTED"
            );

            console.log({
              socketId:
                socket.id,

              userId,

              role,

              reason,
            });

            console.log(
              "================================================"
            );
          }
        );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | PAYMENT EXPIRY JOB
    |--------------------------------------------------------------------------
    */

    const stopPaymentExpiryJob =
      startPaymentExpiryJob();

    /*
    |--------------------------------------------------------------------------
    | START HTTP SERVER
    |--------------------------------------------------------------------------
    */

    httpServer.listen(
      PORT,
      () => {
        console.log(
          "================================================"
        );

        console.log(
          `Server running on http://localhost:${PORT}`
        );

        console.log(
          "Socket.IO server is ready."
        );

        console.log(
          "Payment expiry job started."
        );

        console.log(
          "================================================"
        );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | GRACEFUL SHUTDOWN
    |--------------------------------------------------------------------------
    */

    const shutdown =
      async (signal) => {
        console.log(
          `${signal} received. Shutting down...`
        );

        /*
         * Stop payment expiry job.
         */
        if (
          typeof stopPaymentExpiryJob ===
          "function"
        ) {
          stopPaymentExpiryJob();

          console.log(
            "Payment expiry job stopped."
          );
        }

        /*
         * Close Socket.IO.
         */
        io.close(
          () => {
            console.log(
              "Socket.IO server closed."
            );
          }
        );

        /*
         * Close HTTP server.
         */
        httpServer.close(
          () => {
            console.log(
              "HTTP server closed."
            );

            process.exit(0);
          }
        );
      };

    /*
    |--------------------------------------------------------------------------
    | PROCESS SIGNALS
    |--------------------------------------------------------------------------
    */

    process.on(
      "SIGTERM",
      () =>
        shutdown("SIGTERM")
    );

    process.on(
      "SIGINT",
      () =>
        shutdown("SIGINT")
    );
  } catch (error) {
    console.error(
      "================================================"
    );

    console.error(
      `Server startup failed: ${error.message}`
    );

    console.error(error);

    console.error(
      "================================================"
    );

    process.exit(1);
  }
};

/*
|--------------------------------------------------------------------------
| START APPLICATION
|--------------------------------------------------------------------------
*/

startServer();