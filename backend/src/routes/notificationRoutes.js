const express = require("express");

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require("../controllers/notificationController");

const {
  protect
} = require("../middleware/authMiddleware");

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| ALL NOTIFICATION ROUTES REQUIRE LOGIN
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| GET /api/notifications
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  getNotifications
);

/*
|--------------------------------------------------------------------------
| GET /api/notifications/unread-count
|--------------------------------------------------------------------------
*/

router.get(
  "/unread-count",
  getUnreadCount
);

/*
|--------------------------------------------------------------------------
| PATCH /api/notifications/mark-all-read
|--------------------------------------------------------------------------
*/

router.patch(
  "/mark-all-read",
  markAllAsRead
);

/*
|--------------------------------------------------------------------------
| PATCH /api/notifications/:id/read
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/read",
  markAsRead
);

/*
|--------------------------------------------------------------------------
| DELETE /api/notifications/:id
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  deleteNotification
);

module.exports = router;