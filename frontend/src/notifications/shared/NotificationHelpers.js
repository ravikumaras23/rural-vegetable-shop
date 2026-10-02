/*
|--------------------------------------------------------------------------
| NORMALIZE NOTIFICATION
|--------------------------------------------------------------------------
*/

export function normalizeNotification(notification) {
  if (!notification) {
    return null;
  }

  const metadata =
    notification.metadata ||
    notification.data ||
    {};

  return {
    ...notification,

    id: String(
      notification.id ||
        notification._id ||
        ""
    ),

    recipient: String(
      notification.recipient ||
        ""
    ),

    role: String(
      notification.role ||
        notification.recipientRole ||
        ""
    )
      .trim()
      .toLowerCase(),

    title:
      notification.title ||
      "Notification",

    message:
      notification.message ||
      "",

    type:
      notification.type ||
      "",

    metadata,

    data: metadata,

    isRead: Boolean(
      notification.isRead ??
        notification.read
    ),

    createdAt:
      notification.createdAt ||
      null
  };
}

/*
|--------------------------------------------------------------------------
| EXTRACT NOTIFICATIONS
|--------------------------------------------------------------------------
*/

export function extractNotifications(
  response
) {
  if (!response) {
    return [];
  }

  let notifications = [];

  if (
    Array.isArray(
      response.notifications
    )
  ) {
    notifications =
      response.notifications;
  } else if (
    Array.isArray(
      response.data?.notifications
    )
  ) {
    notifications =
      response.data.notifications;
  } else if (
    Array.isArray(response.data)
  ) {
    notifications =
      response.data;
  } else if (
    Array.isArray(response.results)
  ) {
    notifications =
      response.results;
  }

  return notifications
    .map(normalizeNotification)
    .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| EXTRACT UNREAD COUNT
|--------------------------------------------------------------------------
*/

export function extractUnreadCount(
  response,
  notifications = []
) {
  if (!response) {
    return notifications.filter(
      (item) => !item.isRead
    ).length;
  }

  if (
    typeof response.unreadCount ===
    "number"
  ) {
    return response.unreadCount;
  }

  if (
    typeof response.data?.unreadCount ===
    "number"
  ) {
    return response.data.unreadCount;
  }

  if (
    typeof response.count === "number"
  ) {
    return response.count;
  }

  return notifications.filter(
    (item) => !item.isRead
  ).length;
}

/*
|--------------------------------------------------------------------------
| ICON
|--------------------------------------------------------------------------
*/

export function notificationIcon(type) {
  switch (
    String(type || "").toUpperCase()
  ) {
    case "SELLER_REGISTERED":
    case "NEW_SELLER":
    case "NEW_SELLER_ORDER":
      return "👨‍🌾";

    case "SELLER_APPROVED":
    case "SELLER_ACTIVATED":
    case "SELLER_ACCOUNT_ACTIVATED":
      return "✓";

    case "SELLER_REJECTED":
    case "SELLER_DEACTIVATED":
    case "SELLER_ACCOUNT_DEACTIVATED":
      return "×";

    case "PAYMENT_SUBMITTED":
      return "💳";

    case "PAYMENT_VERIFIED":
      return "✓";

    case "PAYMENT_REJECTED":
      return "×";

    case "ORDER_CREATED":
      return "🛒";

    case "ORDER_STATUS_UPDATED":
      return "📦";

    case "ORDER_CANCELLED":
      return "⚠";

    case "LOW_STOCK":
      return "⚠";

    case "PRODUCT_APPROVED":
      return "✓";

    case "PRODUCT_REJECTED":
      return "×";

    default:
      return "🔔";
  }
}

/*
|--------------------------------------------------------------------------
| ICON CLASSES
|--------------------------------------------------------------------------
*/

export function notificationClasses(
  type
) {
  switch (
    String(type || "").toUpperCase()
  ) {
    case "SELLER_APPROVED":
    case "SELLER_ACTIVATED":
    case "SELLER_ACCOUNT_ACTIVATED":
    case "PAYMENT_VERIFIED":
    case "PRODUCT_APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "SELLER_REJECTED":
    case "SELLER_DEACTIVATED":
    case "SELLER_ACCOUNT_DEACTIVATED":
    case "PAYMENT_REJECTED":
    case "PRODUCT_REJECTED":
    case "ORDER_CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";

    case "LOW_STOCK":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "ORDER_CREATED":
    case "NEW_SELLER_ORDER":
    case "NEW_SELLER":
    case "SELLER_REGISTERED":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

/*
|--------------------------------------------------------------------------
| FORMAT DATE
|--------------------------------------------------------------------------
*/

export function formatNotificationDate(
  value
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/*
|--------------------------------------------------------------------------
| GET ROLE
|--------------------------------------------------------------------------
*/

function getNotificationRole(
  notification
) {
  const role = String(
    notification?.role ||
      notification?.recipientRole ||
      ""
  )
    .trim()
    .toLowerCase();

  if (
    role === "admin" ||
    role === "seller" ||
    role === "customer"
  ) {
    return role;
  }

  /*
   * Fallback to the saved logged-in
   * user if notification role is missing.
   */

  try {
    const storedUser =
      localStorage.getItem("user");

    if (storedUser) {
      const user =
        JSON.parse(storedUser);

      const storedRole =
        String(
          user?.role || ""
        )
          .trim()
          .toLowerCase();

      if (
        storedRole === "admin" ||
        storedRole === "seller" ||
        storedRole === "customer"
      ) {
        return storedRole;
      }
    }
  } catch (error) {
    console.error(
      "Unable to read saved user role:",
      error
    );
  }

  return "";
}

/*
|--------------------------------------------------------------------------
| GET ORDER ID
|--------------------------------------------------------------------------
*/

function getOrderId(
  notification
) {
  const metadata =
    notification?.metadata ||
    notification?.data ||
    {};

  return (
    metadata.orderId ||
    metadata.orderID ||
    metadata.order_id ||
    metadata.order?._id ||
    metadata.order?.id ||
    null
  );
}

/*
|--------------------------------------------------------------------------
| GET PRODUCT ID
|--------------------------------------------------------------------------
*/

function getProductId(
  notification
) {
  const metadata =
    notification?.metadata ||
    notification?.data ||
    {};

  return (
    metadata.productId ||
    metadata.productID ||
    metadata.product_id ||
    metadata.product?._id ||
    metadata.product?.id ||
    null
  );
}

/*
|--------------------------------------------------------------------------
| GET SELLER ID
|--------------------------------------------------------------------------
*/

function getSellerId(
  notification
) {
  const metadata =
    notification?.metadata ||
    notification?.data ||
    {};

  return (
    metadata.sellerId ||
    metadata.sellerID ||
    metadata.seller_id ||
    metadata.seller?._id ||
    metadata.seller?.id ||
    null
  );
}

/*
|--------------------------------------------------------------------------
| ROLE-BASED NOTIFICATION NAVIGATION
|--------------------------------------------------------------------------
|
| Customer:
|   /orders/:id
|
| Seller:
|   /seller/orders/:id
|
| Admin:
|   /admin/orders
|
|--------------------------------------------------------------------------
*/

export function getNotificationPath(
  notification
) {
  if (!notification) {
    return "/notifications";
  }

  const role =
    getNotificationRole(
      notification
    );

  const type = String(
    notification.type || ""
  ).toUpperCase();

  const orderId =
    getOrderId(notification);

  const productId =
    getProductId(notification);

  const sellerId =
    getSellerId(notification);

  /*
  |--------------------------------------------------------------------------
  | ORDER
  |--------------------------------------------------------------------------
  */

  if (orderId) {
    if (role === "seller") {
      return `/seller/orders/${encodeURIComponent(
        String(orderId)
      )}`;
    }

    if (role === "customer") {
      return `/orders/${encodeURIComponent(
        String(orderId)
      )}`;
    }

    /*
     * There is currently no
     * /admin/orders/:id route in
     * your App.jsx.
     *
     * Therefore admin order
     * notifications go to the
     * existing admin orders page.
     */

    if (role === "admin") {
      return "/admin/orders";
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SELLER NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  if (
    sellerId &&
    role === "admin"
  ) {
    return "/admin/sellers";
  }

  /*
  |--------------------------------------------------------------------------
  | PRODUCT NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  if (productId) {
    if (role === "seller") {
      return `/seller/products/${encodeURIComponent(
        String(productId)
      )}/edit`;
    }

    if (role === "admin") {
      return "/admin/products";
    }

    if (role === "customer") {
      return "/products";
    }
  }

  /*
  |--------------------------------------------------------------------------
  | TYPE-BASED FALLBACKS
  |--------------------------------------------------------------------------
  */

  switch (type) {
    case "SELLER_REGISTERED":
    case "NEW_SELLER":
      if (role === "admin") {
        return "/admin/sellers";
      }
      break;

    case "SELLER_APPROVED":
    case "SELLER_REJECTED":
    case "SELLER_ACTIVATED":
    case "SELLER_DEACTIVATED":
    case "SELLER_ACCOUNT_ACTIVATED":
    case "SELLER_ACCOUNT_DEACTIVATED":
      if (role === "admin") {
        return "/admin/sellers";
      }
      break;

    case "LOW_STOCK":
      if (role === "seller") {
        return "/seller/products";
      }

      if (role === "admin") {
        return "/admin/products";
      }
      break;

    case "PAYMENT_SUBMITTED":
    case "PAYMENT_VERIFIED":
    case "PAYMENT_REJECTED":
      if (role === "seller") {
        return "/seller/orders";
      }

      if (role === "customer") {
        return "/orders";
      }

      if (role === "admin") {
        return "/admin/orders";
      }
      break;

    case "ORDER_CREATED":
    case "NEW_SELLER_ORDER":
    case "ORDER_STATUS_UPDATED":
    case "ORDER_CANCELLED":
      if (role === "seller") {
        return "/seller/orders";
      }

      if (role === "customer") {
        return "/orders";
      }

      if (role === "admin") {
        return "/admin/orders";
      }
      break;

    default:
      break;
  }

  return "/notifications";
}

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  normalizeNotification,
  extractNotifications,
  extractUnreadCount,
  notificationIcon,
  notificationClasses,
  formatNotificationDate,
  getNotificationPath
};