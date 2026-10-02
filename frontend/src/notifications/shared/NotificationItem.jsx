import React from "react";

/*
|--------------------------------------------------------------------------
| NOTIFICATION ICON
|--------------------------------------------------------------------------
*/

function getIcon(type) {
  switch (String(type || "").toUpperCase()) {
    case "SELLER_REGISTERED":
    case "NEW_SELLER":
    case "NEW_SELLER_ORDER":
      return "👨‍🌾";

    case "SELLER_APPROVED":
    case "SELLER_ACTIVATED":
    case "SELLER_ACCOUNT_ACTIVATED":
    case "APPROVED":
      return "✓";

    case "SELLER_REJECTED":
    case "SELLER_DEACTIVATED":
    case "SELLER_ACCOUNT_DEACTIVATED":
    case "REJECTED":
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
| NOTIFICATION ICON COLORS
|--------------------------------------------------------------------------
*/

function getIconClasses(type) {
  switch (String(type || "").toUpperCase()) {
    /*
    |----------------------------------------------------------------------
    | SUCCESS
    |----------------------------------------------------------------------
    */

    case "SELLER_APPROVED":
    case "SELLER_ACTIVATED":
    case "SELLER_ACCOUNT_ACTIVATED":
    case "APPROVED":
    case "PAYMENT_VERIFIED":
    case "PRODUCT_APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    /*
    |----------------------------------------------------------------------
    | ERROR / REJECTED / CANCELLED
    |----------------------------------------------------------------------
    */

    case "SELLER_REJECTED":
    case "SELLER_DEACTIVATED":
    case "SELLER_ACCOUNT_DEACTIVATED":
    case "REJECTED":
    case "PAYMENT_REJECTED":
    case "PRODUCT_REJECTED":
    case "ORDER_CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";

    /*
    |----------------------------------------------------------------------
    | WARNING
    |----------------------------------------------------------------------
    */

    case "LOW_STOCK":
      return "border-amber-200 bg-amber-50 text-amber-700";

    /*
    |----------------------------------------------------------------------
    | ORDER / SELLER ACTIVITY
    |----------------------------------------------------------------------
    */

    case "ORDER_CREATED":
    case "NEW_SELLER_ORDER":
    case "NEW_SELLER":
    case "SELLER_REGISTERED":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    /*
    |----------------------------------------------------------------------
    | DEFAULT
    |----------------------------------------------------------------------
    */

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

/*
|--------------------------------------------------------------------------
| FORMAT DATE
|--------------------------------------------------------------------------
*/

function formatDate(value) {
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
| NOTIFICATION ITEM
|--------------------------------------------------------------------------
*/

export default function NotificationItem({
  notification,
  onRead,
  onDelete,
  onClick
}) {
  if (!notification) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | READ STATUS
  |--------------------------------------------------------------------------
  */

  const isRead = Boolean(
    notification.isRead ??
      notification.read
  );

  /*
  |--------------------------------------------------------------------------
  | BASIC DATA
  |--------------------------------------------------------------------------
  */

  const type =
    notification.type || "";

  const title =
    notification.title ||
    "Notification";

  const message =
    notification.message ||
    "";

  const createdAt =
    notification.createdAt;

  /*
  |--------------------------------------------------------------------------
  | CLICK HANDLER
  |--------------------------------------------------------------------------
  |
  | The parent component is responsible for navigation.
  |
  | Example:
  |
  | seller   -> /seller/orders/:id
  | customer -> /orders/:id
  | admin    -> /admin/orders/:id
  |
  */

  const handleClick = () => {
    /*
    |----------------------------------------------------------------------
    | Mark as read
    |----------------------------------------------------------------------
    */

    if (!isRead && onRead) {
      onRead(notification);
    }

    /*
    |----------------------------------------------------------------------
    | Navigate
    |----------------------------------------------------------------------
    */

    if (onClick) {
      onClick(notification);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DELETE HANDLER
  |--------------------------------------------------------------------------
  */

  const handleDelete = (event) => {
    event.stopPropagation();

    if (onDelete) {
      onDelete(notification);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div
      className={`group relative flex gap-3 border-b border-slate-100 px-4 py-4 transition ${
        isRead
          ? "bg-white hover:bg-slate-50"
          : "bg-emerald-50/40 hover:bg-emerald-50/70"
      }`}
    >
      {/* 
      |--------------------------------------------------------------------------
      | CLICKABLE NOTIFICATION
      |--------------------------------------------------------------------------
      */}

      <button
        type="button"
        onClick={handleClick}
        className="flex min-w-0 flex-1 gap-3 text-left"
        aria-label={`Open notification: ${title}`}
      >
        {/* 
        |--------------------------------------------------------------------------
        | ICON
        |--------------------------------------------------------------------------
        */}

        <span
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border text-base font-black ${getIconClasses(
            type
          )}`}
        >
          {getIcon(type)}
        </span>

        {/* 
        |--------------------------------------------------------------------------
        | CONTENT
        |--------------------------------------------------------------------------
        */}

        <span className="min-w-0 flex-1">
          {/* TITLE */}
          <span className="flex items-start gap-2">
            <span
              className={`text-sm ${
                isRead
                  ? "font-bold text-slate-800"
                  : "font-black text-slate-950"
              }`}
            >
              {title}
            </span>

            {/* UNREAD DOT */}
            {!isRead && (
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
            )}
          </span>

          {/* MESSAGE */}
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {message}
          </span>

          {/* DATE */}
          {createdAt && (
            <span className="mt-2 block text-[10px] font-semibold text-slate-400">
              {formatDate(createdAt)}
            </span>
          )}
        </span>
      </button>

      {/* 
      |--------------------------------------------------------------------------
      | DELETE BUTTON
      |--------------------------------------------------------------------------
      */}

      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete notification"
          title="Delete notification"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}