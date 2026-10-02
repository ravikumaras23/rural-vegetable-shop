const mongoose = require("mongoose");

const Notification = require("../models/Notification");

/*
|--------------------------------------------------------------------------
| GET NOTIFICATIONS
|--------------------------------------------------------------------------
|
| GET /api/notifications
|
|--------------------------------------------------------------------------
*/

const getNotifications = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required"
      });
    }

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      100
    );

    const skip =
      (page - 1) * limit;

    const filter = {
      recipient: userId,
      role: req.user.role
    };

    const [
      notifications,
      total,
      unreadCount
    ] = await Promise.all([
      Notification.find(filter)
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Notification.countDocuments(
        filter
      ),

      Notification.countDocuments({
        ...filter,
        isRead: false
      })
    ]);

    return res.status(200).json({
      success: true,

      data: notifications,

      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(
          total / limit
        )
      },

      unreadCount
    });
  } catch (error) {
    console.error(
      "Get notifications error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch notifications"
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET UNREAD COUNT
|--------------------------------------------------------------------------
|
| GET /api/notifications/unread-count
|
|--------------------------------------------------------------------------
*/

const getUnreadCount = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required"
      });
    }

    const unreadCount =
      await Notification.countDocuments({
        recipient: userId,
        role: req.user.role,
        isRead: false
      });

    return res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error(
      "Get unread count error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch unread count"
    });
  }
};

/*
|--------------------------------------------------------------------------
| MARK ONE AS READ
|--------------------------------------------------------------------------
|
| PATCH /api/notifications/:id/read
|
|--------------------------------------------------------------------------
*/

const markAsRead = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid notification ID"
      });
    }

    const notification =
      await Notification.findOneAndUpdate(
        {
          _id: id,
          recipient: req.user._id,
          role: req.user.role
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        },
        {
          new: true
        }
      ).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error(
      "Mark notification read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to mark notification as read"
    });
  }
};

/*
|--------------------------------------------------------------------------
| MARK ALL AS READ
|--------------------------------------------------------------------------
|
| PATCH /api/notifications/mark-all-read
|
|--------------------------------------------------------------------------
*/

const markAllAsRead = async (
  req,
  res
) => {
  try {
    const result =
      await Notification.updateMany(
        {
          recipient:
            req.user._id,

          role:
            req.user.role,

          isRead: false
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      );

    return res.status(200).json({
      success: true,

      message:
        "All notifications marked as read",

      modifiedCount:
        result.modifiedCount
    });
  } catch (error) {
    console.error(
      "Mark all notifications read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to mark notifications as read"
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE ONE
|--------------------------------------------------------------------------
|
| DELETE /api/notifications/:id
|
|--------------------------------------------------------------------------
*/

const deleteNotification = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid notification ID"
      });
    }

    const deleted =
      await Notification.findOneAndDelete({
        _id: id,
        recipient:
          req.user._id,
        role:
          req.user.role
      });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found"
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Notification deleted successfully"
    });
  } catch (error) {
    console.error(
      "Delete notification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete notification"
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};