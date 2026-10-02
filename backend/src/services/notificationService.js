const mongoose = require("mongoose");

const Notification =
  require("../models/Notification");

const User =
  require("../models/User");

/*
|--------------------------------------------------------------------------
| NOTIFICATION TYPE MAP
|--------------------------------------------------------------------------
*/

const TYPE_MAP = {
  order_created:
    "ORDER_CREATED",

  ORDER_CREATED:
    "ORDER_CREATED",

  new_seller_order:
    "NEW_SELLER_ORDER",

  NEW_SELLER_ORDER:
    "NEW_SELLER_ORDER",

  order_status_updated:
    "ORDER_STATUS_UPDATED",

  ORDER_STATUS_UPDATED:
    "ORDER_STATUS_UPDATED",

  order_cancelled:
    "ORDER_CANCELLED",

  ORDER_CANCELLED:
    "ORDER_CANCELLED",

  payment_submitted:
    "PAYMENT_SUBMITTED",

  PAYMENT_SUBMITTED:
    "PAYMENT_SUBMITTED",

  payment_successful:
    "PAYMENT_VERIFIED",

  payment_verified:
    "PAYMENT_VERIFIED",

  PAYMENT_VERIFIED:
    "PAYMENT_VERIFIED",

  payment_failed:
    "PAYMENT_REJECTED",

  payment_rejected:
    "PAYMENT_REJECTED",

  PAYMENT_REJECTED:
    "PAYMENT_REJECTED",

  seller_approved:
    "SELLER_APPROVED",

  SELLER_APPROVED:
    "SELLER_APPROVED",

  seller_rejected:
    "SELLER_REJECTED",

  SELLER_REJECTED:
    "SELLER_REJECTED",

  seller_activated:
    "SELLER_ACTIVATED",

  SELLER_ACTIVATED:
    "SELLER_ACTIVATED",

  seller_deactivated:
    "SELLER_DEACTIVATED",

  SELLER_DEACTIVATED:
    "SELLER_DEACTIVATED",

  seller_account_activated:
    "SELLER_ACCOUNT_ACTIVATED",

  SELLER_ACCOUNT_ACTIVATED:
    "SELLER_ACCOUNT_ACTIVATED",

  seller_account_deactivated:
    "SELLER_ACCOUNT_DEACTIVATED",

  SELLER_ACCOUNT_DEACTIVATED:
    "SELLER_ACCOUNT_DEACTIVATED",

  new_seller:
    "SELLER_REGISTERED",

  seller_registered:
    "SELLER_REGISTERED",

  SELLER_REGISTERED:
    "SELLER_REGISTERED",

  low_stock:
    "LOW_STOCK",

  LOW_STOCK:
    "LOW_STOCK",

  delivery_code:
    "DELIVERY_CODE",

  DELIVERY_CODE:
    "DELIVERY_CODE",

  product_activated:
    "PRODUCT_ACTIVATED",

  PRODUCT_ACTIVATED:
    "PRODUCT_ACTIVATED",

  product_approved:
    "PRODUCT_APPROVED",

  PRODUCT_APPROVED:
    "PRODUCT_APPROVED",

  product_rejected:
    "PRODUCT_REJECTED",

  PRODUCT_REJECTED:
    "PRODUCT_REJECTED",

  product_deactivated:
    "PRODUCT_DEACTIVATED",

  PRODUCT_DEACTIVATED:
    "PRODUCT_DEACTIVATED"
};

/*
|--------------------------------------------------------------------------
| NORMALIZE TYPE
|--------------------------------------------------------------------------
*/

const normalizeType = (
  type
) => {
  const value =
    String(type || "")
      .trim();

  if (!value) {
    throw new Error(
      "Notification type is required"
    );
  }

  return (
    TYPE_MAP[value] ||
    TYPE_MAP[
      value.toLowerCase()
    ] ||
    value.toUpperCase()
  );
};

/*
|--------------------------------------------------------------------------
| NORMALIZE ROLE
|--------------------------------------------------------------------------
*/

const normalizeRole = (
  role
) => {
  const value =
    String(role || "")
      .trim()
      .toLowerCase();

  if (
    ![
      "customer",
      "seller",
      "admin"
    ].includes(value)
  ) {
    return null;
  }

  return value;
};

/*
|--------------------------------------------------------------------------
| NORMALIZE RECIPIENT
|--------------------------------------------------------------------------
*/

const normalizeRecipient = (
  recipient
) => {
  if (
    recipient &&
    recipient._id
  ) {
    return recipient._id;
  }

  return recipient;
};

/*
|--------------------------------------------------------------------------
| CREATE ONE NOTIFICATION
|--------------------------------------------------------------------------
*/

const createNotification =
  async ({
    recipient,
    role,
    type,
    title,
    message,
    metadata = {},
    data = {},
    io = null
  }) => {

    recipient =
      normalizeRecipient(
        recipient
      );

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!recipient) {
      throw new Error(
        "Notification recipient is required"
      );
    }

    if (!title) {
      throw new Error(
        "Notification title is required"
      );
    }

    if (!message) {
      throw new Error(
        "Notification message is required"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | FIND ROLE
    |--------------------------------------------------------------------------
    |
    | If caller supplied role, use it.
    | Otherwise find the recipient's actual role.
    |
    */

    let normalizedRole =
      normalizeRole(role);

    if (!normalizedRole) {

      const user =
        await User.findById(
          recipient
        )
          .select("role")
          .lean();

      normalizedRole =
        normalizeRole(
          user?.role
        );
    }

    if (!normalizedRole) {
      throw new Error(
        "Notification recipient role is required"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE TYPE
    |--------------------------------------------------------------------------
    */

    const normalizedType =
      normalizeType(type);

    /*
    |--------------------------------------------------------------------------
    | METADATA
    |--------------------------------------------------------------------------
    */

    const finalMetadata =
      metadata &&
      typeof metadata ===
        "object" &&
      Object.keys(
        metadata
      ).length > 0
        ? metadata
        : data || {};

    /*
    |--------------------------------------------------------------------------
    | SAVE TO MONGODB
    |--------------------------------------------------------------------------
    */

    const notification =
      await Notification.create({
        recipient,

        role:
          normalizedRole,

        type:
          normalizedType,

        title,

        message,

        metadata:
          finalMetadata
      });

    /*
    |--------------------------------------------------------------------------
    | SOCKET.IO
    |--------------------------------------------------------------------------
    */

    if (io) {

      const notificationPayload =
        {
          id:
            String(
              notification._id
            ),

          _id:
            String(
              notification._id
            ),

          recipient:
            String(
              notification.recipient
            ),

          role:
            notification.role,

          recipientRole:
            notification.role,

          type:
            notification.type,

          title:
            notification.title,

          message:
            notification.message,

          metadata:
            notification.metadata ||
            {},

          data:
            notification.metadata ||
            {},

          isRead:
            Boolean(
              notification.isRead
            ),

          createdAt:
            notification.createdAt
              ? notification.createdAt.toISOString()
              : new Date().toISOString()
        };

      const recipientRoom =
        `user:${String(
          recipient
        )}`;

      console.log(
        "NOTIFICATION SOCKET EMIT:",
        {
          room:
            recipientRoom,

          role:
            normalizedRole,

          type:
            normalizedType,

          recipient:
            String(recipient)
        }
      );

      io.to(
        recipientRoom
      ).emit(
        "notification:new",
        notificationPayload
      );
    }

    return notification;
  };

/*
|--------------------------------------------------------------------------
| CREATE MULTIPLE NOTIFICATIONS
|--------------------------------------------------------------------------
*/

const createNotifications =
  async ({
    recipients,
    role,
    type,
    title,
    message,
    metadata = {},
    data = {},
    io = null
  }) => {

    if (
      !Array.isArray(
        recipients
      ) ||
      recipients.length === 0
    ) {
      return [];
    }

    if (!role) {
      throw new Error(
        "Notification role is required"
      );
    }

    if (!type) {
      throw new Error(
        "Notification type is required"
      );
    }

    if (!title) {
      throw new Error(
        "Notification title is required"
      );
    }

    if (!message) {
      throw new Error(
        "Notification message is required"
      );
    }

    const normalizedRole =
      normalizeRole(role);

    if (!normalizedRole) {
      throw new Error(
        `Invalid notification role: ${role}`
      );
    }

    const normalizedType =
      normalizeType(type);

    const uniqueRecipients =
      [
        ...new Set(
          recipients
            .filter(Boolean)
            .map(
              (recipient) =>
                String(
                  recipient?._id ||
                  recipient
                )
            )
        )
      ];

    if (
      uniqueRecipients.length ===
      0
    ) {
      return [];
    }

    const finalMetadata =
      metadata &&
      typeof metadata ===
        "object"
        ? metadata
        : data || {};

    const documents =
      uniqueRecipients.map(
        (recipient) => ({
          recipient,

          role:
            normalizedRole,

          type:
            normalizedType,

          title,

          message,

          metadata:
            finalMetadata
        })
      );

    const notifications =
      await Notification.insertMany(
        documents
      );

    /*
    |--------------------------------------------------------------------------
    | SOCKET EVENTS
    |--------------------------------------------------------------------------
    */

    if (io) {

      for (
        const notification
        of notifications
      ) {

        const payload = {
          id:
            String(
              notification._id
            ),

          _id:
            String(
              notification._id
            ),

          recipient:
            String(
              notification.recipient
            ),

          role:
            notification.role,

          recipientRole:
            notification.role,

          type:
            notification.type,

          title:
            notification.title,

          message:
            notification.message,

          metadata:
            notification.metadata ||
            {},

          data:
            notification.metadata ||
            {},

          isRead:
            Boolean(
              notification.isRead
            ),

          createdAt:
            notification.createdAt
              ? notification.createdAt.toISOString()
              : new Date().toISOString()
        };

        io.to(
          `user:${String(
            notification.recipient
          )}`
        ).emit(
          "notification:new",
          payload
        );
      }
    }

    return notifications;
  };

/*
|--------------------------------------------------------------------------
| MARK ONE AS READ
|--------------------------------------------------------------------------
*/

const markNotificationAsRead =
  async ({
    notificationId,
    recipient
  }) => {

    if (!notificationId) {
      throw new Error(
        "Notification ID is required"
      );
    }

    if (!recipient) {
      throw new Error(
        "Notification recipient is required"
      );
    }

    const notification =
      await Notification.findOne({
        _id:
          notificationId,

        recipient
      });

    if (!notification) {
      return null;
    }

    if (
      !notification.isRead
    ) {

      notification.isRead =
        true;

      notification.readAt =
        new Date();

      await notification.save();
    }

    return notification;
  };

/*
|--------------------------------------------------------------------------
| MARK ALL AS READ
|--------------------------------------------------------------------------
*/

const markAllNotificationsAsRead =
  async ({
    recipient
  }) => {

    if (!recipient) {
      throw new Error(
        "Notification recipient is required"
      );
    }

    return Notification.updateMany(
      {
        recipient,

        isRead:
          false
      },

      {
        $set: {
          isRead:
            true,

          readAt:
            new Date()
        }
      }
    );
  };

/*
|--------------------------------------------------------------------------
| GET UNREAD COUNT
|--------------------------------------------------------------------------
*/

const getUnreadNotificationCount =
  async ({
    recipient
  }) => {

    if (!recipient) {
      throw new Error(
        "Notification recipient is required"
      );
    }

    return Notification.countDocuments({
      recipient,

      isRead:
        false
    });
  };

/*
|--------------------------------------------------------------------------
| DELETE ONE
|--------------------------------------------------------------------------
*/

const deleteNotification =
  async ({
    notificationId,
    recipient
  }) => {

    if (!notificationId) {
      throw new Error(
        "Notification ID is required"
      );
    }

    if (!recipient) {
      throw new Error(
        "Notification recipient is required"
      );
    }

    return Notification.findOneAndDelete({
      _id:
        notificationId,

      recipient
    });
  };

/*
|--------------------------------------------------------------------------
| DELETE READ NOTIFICATIONS
|--------------------------------------------------------------------------
*/

const deleteReadNotifications =
  async ({
    recipient
  }) => {

    if (!recipient) {
      throw new Error(
        "Notification recipient is required"
      );
    }

    return Notification.deleteMany({
      recipient,

      isRead:
        true
    });
  };

/*
|--------------------------------------------------------------------------
| NOTIFY ONE USER
|--------------------------------------------------------------------------
*/

const notifyUser =
  async ({
    req,
    recipient,
    role,
    type,
    title,
    message,
    metadata = {},
    data = {}
  }) => {

    const io =
      req?.app?.get(
        "io"
      ) || null;

    let finalRole =
      role;

    /*
    |--------------------------------------------------------------------------
    | FALLBACK ROLE
    |--------------------------------------------------------------------------
    */

    if (
      !finalRole &&
      req?.user?.role
    ) {
      finalRole =
        req.user.role;
    }

    /*
    |--------------------------------------------------------------------------
    | FINAL VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!finalRole) {
      throw new Error(
        "Notification role is required"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE
    |--------------------------------------------------------------------------
    */

    return createNotification({
      recipient,

      role:
        finalRole,

      type,

      title,

      message,

      metadata,

      data,

      io
    });
  };

/*
|--------------------------------------------------------------------------
| NOTIFY MULTIPLE USERS
|--------------------------------------------------------------------------
*/

const notifyUsers =
  async ({
    req,
    recipients,
    role,
    type,
    title,
    message,
    metadata = {},
    data = {}
  }) => {

    const io =
      req?.app?.get(
        "io"
      ) || null;

    let finalRole =
      role;

    if (
      !finalRole &&
      req?.user?.role
    ) {
      finalRole =
        req.user.role;
    }

    if (!finalRole) {
      throw new Error(
        "Notification role is required"
      );
    }

    return createNotifications({
      recipients,

      role:
        finalRole,

      type,

      title,

      message,

      metadata,

      data,

      io
    });
  };

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {

  createNotification,

  createNotifications,

  notifyUser,

  notifyUsers,

  markNotificationAsRead,

  markAllNotificationsAsRead,

  getUnreadNotificationCount,

  deleteNotification,

  deleteReadNotifications

};