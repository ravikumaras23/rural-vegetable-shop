import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { Link } from "react-router-dom";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminHeader from "../../components/admin/AdminHeader";

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

/*
|--------------------------------------------------------------------------
| API REQUEST
|--------------------------------------------------------------------------
*/

const request = async (
  url,
  options = {}
) => {
  const token =
    localStorage.getItem("token");

  if (!token) {
    throw new Error(
      "Admin authentication token is missing. Please login again."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API_URL}${url}`,
      {
        ...options,
        headers: {
          ...(options.body instanceof FormData
            ? {}
            : {
                "Content-Type":
                  "application/json"
              }),

          Authorization:
            `Bearer ${token}`,

          ...(options.headers || {})
        },

        cache: "no-store"
      }
    );
  } catch {
    throw new Error(
      "Unable to connect to the backend. Make sure the backend is running on http://localhost:5000."
    );
  }

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    const error =
      new Error(
        data.message ||
          `Request failed with status ${response.status}`
      );

    error.status =
      response.status;

    throw error;
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| NORMALIZE
|--------------------------------------------------------------------------
*/

function normalizeStatus(value) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

/*
|--------------------------------------------------------------------------
| FORMAT STATUS
|--------------------------------------------------------------------------
*/

function formatStatus(value) {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

/*
|--------------------------------------------------------------------------
| FORMAT MONEY
|--------------------------------------------------------------------------
*/

function formatMoney(value) {
  const amount =
    Number(value) || 0;

  return amount.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

/*
|--------------------------------------------------------------------------
| FORMAT DATE
|--------------------------------------------------------------------------
*/

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

/*
|--------------------------------------------------------------------------
| ORDER STATUS VISUAL
|--------------------------------------------------------------------------
*/

function getOrderStatusVisual(
  status
) {
  switch (
    normalizeStatus(status)
  ) {
    case "pending":
      return {
        label: "Pending",
        icon: "◌",
        wrapper:
          "border-amber-300/15 bg-amber-300/[0.06]",
        text:
          "text-amber-200",
        dot:
          "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.9)]"
      };

    case "confirmed":
      return {
        label: "Confirmed",
        icon: "✓",
        wrapper:
          "border-sky-300/15 bg-sky-300/[0.06]",
        text:
          "text-sky-200",
        dot:
          "bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.9)]"
      };

    case "processing":
      return {
        label: "Processing",
        icon: "↻",
        wrapper:
          "border-violet-300/15 bg-violet-300/[0.06]",
        text:
          "text-violet-200",
        dot:
          "bg-violet-300 shadow-[0_0_14px_rgba(196,181,253,0.9)]"
      };

    case "packed":
      return {
        label: "Packed",
        icon: "▣",
        wrapper:
          "border-fuchsia-300/15 bg-fuchsia-300/[0.06]",
        text:
          "text-fuchsia-200",
        dot:
          "bg-fuchsia-300 shadow-[0_0_14px_rgba(240,171,252,0.9)]"
      };

    case "out_for_delivery":
      return {
        label: "Out for Delivery",
        icon: "➜",
        wrapper:
          "border-cyan-300/15 bg-cyan-300/[0.06]",
        text:
          "text-cyan-200",
        dot:
          "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.95)]"
      };

    case "delivered":
      return {
        label: "Delivered",
        icon: "✓",
        wrapper:
          "border-emerald-300/15 bg-emerald-300/[0.06]",
        text:
          "text-emerald-200",
        dot:
          "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.95)]"
      };

    case "cancelled":
      return {
        label: "Cancelled",
        icon: "×",
        wrapper:
          "border-red-300/15 bg-red-300/[0.06]",
        text:
          "text-red-200",
        dot:
          "bg-red-300 shadow-[0_0_14px_rgba(252,165,165,0.95)]"
      };

    case "returned":
      return {
        label: "Returned",
        icon: "↩",
        wrapper:
          "border-orange-300/15 bg-orange-300/[0.06]",
        text:
          "text-orange-200",
        dot:
          "bg-orange-300 shadow-[0_0_14px_rgba(253,186,116,0.95)]"
      };

    default:
      return {
        label: "Unknown",
        icon: "?",
        wrapper:
          "border-white/10 bg-white/[0.025]",
        text:
          "text-white/50",
        dot:
          "bg-white/30"
      };
  }
}

/*
|--------------------------------------------------------------------------
| PAYMENT VISUAL
|--------------------------------------------------------------------------
*/

function getPaymentVisual(
  status
) {
  switch (
    normalizeStatus(status)
  ) {
    case "paid":
      return {
        label: "Paid",
        wrapper:
          "border-emerald-300/15 bg-emerald-300/[0.06]",
        text:
          "text-emerald-200"
      };

    case "failed":
      return {
        label: "Failed",
        wrapper:
          "border-red-300/15 bg-red-300/[0.06]",
        text:
          "text-red-200"
      };

    case "refunded":
      return {
        label: "Refunded",
        wrapper:
          "border-violet-300/15 bg-violet-300/[0.06]",
        text:
          "text-violet-200"
      };

    case "pending":
    default:
      return {
        label: "Pending",
        wrapper:
          "border-amber-300/15 bg-amber-300/[0.06]",
        text:
          "text-amber-200"
      };
  }
}

/*
|--------------------------------------------------------------------------
| ADMIN ORDERS
|--------------------------------------------------------------------------
*/


const ADMIN_NOTIFICATION_STORAGE_KEY =
  "admin_order_notifications_v1";

const MAX_ADMIN_NOTIFICATIONS = 50;

function readStoredAdminNotifications() {
  try {
    const raw = localStorage.getItem(
      ADMIN_NOTIFICATION_STORAGE_KEY
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.slice(0, MAX_ADMIN_NOTIFICATIONS)
      : [];
  } catch {
    return [];
  }
}

function createAdminNotification({
  type = "system",
  title,
  message,
  orderId = "",
  orderNumber = "",
  status = "",
  paymentStatus = "",
  timestamp = new Date().toISOString()
}) {
  return {
    id: `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`,
    type,
    title,
    message,
    orderId: String(orderId || ""),
    orderNumber: String(orderNumber || ""),
    status: String(status || ""),
    paymentStatus: String(paymentStatus || ""),
    timestamp,
    read: false
  };
}

function notificationIcon(type) {
  const icons = {
    "new-order": "🛒",
    status: "↻",
    payment: "₹",
    cancelled: "×",
    deleted: "⌫",
    error: "!",
    system: "•"
  };
  return icons[type] || icons.system;
}

function notificationAccent(type) {
  if (type === "new-order")
    return "border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200";
  if (type === "status")
    return "border-violet-300/15 bg-violet-300/[0.06] text-violet-200";
  if (type === "payment")
    return "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200";
  if (
    type === "cancelled" ||
    type === "deleted" ||
    type === "error"
  )
    return "border-red-300/15 bg-red-300/[0.06] text-red-200";
  return "border-white/10 bg-white/[0.035] text-white/60";
}

function getAdminOrderId(order) {
  return String(order?._id || "");
}

function getAdminOrderNumber(order) {
  return (
    order?.orderNumber ||
    getAdminOrderId(order).slice(-10) ||
    "Unknown"
  );
}

function getAdminOrderSnapshot(order) {
  return {
    id: getAdminOrderId(order),
    orderNumber: getAdminOrderNumber(order),
    status: normalizeStatus(
      order?.orderStatus || "unknown"
    ),
    paymentStatus: normalizeStatus(
      order?.paymentStatus || "pending"
    )
  };
}

export default function AdminOrders() {
  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [paymentFilter, setPaymentFilter] =
    useState("");

  const [deletingOrderId, setDeletingOrderId] =
    useState("");

  const [deleteConfirmOrder, setDeleteConfirmOrder] =
    useState(null);

  const [toast, setToast] =
    useState(null);

  const [notifications, setNotifications] =
    useState(() =>
      readStoredAdminNotifications()
    );

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const notificationInitializedRef =
    useRef(false);

  const previousOrdersRef =
    useRef([]);

  const notificationPanelRef =
    useRef(null);

  const unreadNotificationCount =
    notifications.filter(
      (notification) => !notification.read
    ).length;


  /*
  |--------------------------------------------------------------------------
  | LOAD ORDERS
  |--------------------------------------------------------------------------
  */


  const pushAdminNotifications = useCallback(
    (incomingNotifications) => {
      if (!incomingNotifications?.length) return;

      setNotifications((current) =>
        [
          ...incomingNotifications,
          ...current
        ].slice(0, MAX_ADMIN_NOTIFICATIONS)
      );
    },
    []
  );

  const inspectOrderChanges =
    useCallback(
      (nextOrders) => {
        if (!notificationInitializedRef.current) {
          previousOrdersRef.current =
            Array.isArray(nextOrders)
              ? nextOrders
              : [];
          notificationInitializedRef.current =
            true;
          return;
        }

        const previousMap = new Map(
          (
            previousOrdersRef.current || []
          ).map((order) => [
            getAdminOrderId(order),
            getAdminOrderSnapshot(order)
          ])
        );

        const nextMap = new Map(
          (
            Array.isArray(nextOrders)
              ? nextOrders
              : []
          ).map((order) => [
            getAdminOrderId(order),
            getAdminOrderSnapshot(order)
          ])
        );

        const generated = [];

        nextMap.forEach((next) => {
          if (!next.id) return;

          const previous =
            previousMap.get(next.id);

          if (!previous) {
            generated.push(
              createAdminNotification({
                type: "new-order",
                title: "New order received",
                message:
                  `Order #${next.orderNumber} ` +
                  "has been added to the marketplace.",
                orderId: next.id,
                orderNumber: next.orderNumber,
                status: next.status,
                paymentStatus:
                  next.paymentStatus
              })
            );
            return;
          }

          if (
            previous.status !==
            next.status
          ) {
            generated.push(
              createAdminNotification({
                type:
                  next.status === "cancelled"
                    ? "cancelled"
                    : "status",
                title:
                  next.status === "cancelled"
                    ? "Order cancelled"
                    : "Order status changed",
                message:
                  `Order #${next.orderNumber} ` +
                  `changed from ${formatStatus(
                    previous.status
                  )} to ${formatStatus(
                    next.status
                  )}.`,
                orderId: next.id,
                orderNumber: next.orderNumber,
                status: next.status,
                paymentStatus:
                  next.paymentStatus
              })
            );
          }

          if (
            previous.paymentStatus !==
            next.paymentStatus
          ) {
            generated.push(
              createAdminNotification({
                type: "payment",
                title: "Payment status changed",
                message:
                  `Order #${next.orderNumber} ` +
                  `payment changed from ${formatStatus(
                    previous.paymentStatus
                  )} to ${formatStatus(
                    next.paymentStatus
                  )}.`,
                orderId: next.id,
                orderNumber: next.orderNumber,
                status: next.status,
                paymentStatus:
                  next.paymentStatus
              })
            );
          }
        });

        if (generated.length) {
          pushAdminNotifications(
            generated.reverse()
          );
        }

        previousOrdersRef.current =
          Array.isArray(nextOrders)
            ? nextOrders
            : [];
      },
      [pushAdminNotifications]
    );

  const markAllNotificationsRead =
    useCallback(() => {
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true
        }))
      );
    }, []);

  const markNotificationRead =
    useCallback((notificationId) => {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                read: true
              }
            : notification
        )
      );
    }, []);

  const clearNotifications =
    useCallback(() => {
      setNotifications([]);
      try {
        localStorage.removeItem(
          ADMIN_NOTIFICATION_STORAGE_KEY
        );
      } catch {
        // Ignore storage failures.
      }
    }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        ADMIN_NOTIFICATION_STORAGE_KEY,
        JSON.stringify(notifications)
      );
    } catch {
      // Ignore storage failures.
    }
  }, [notifications]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(
          event.target
        )
      ) {
        setNotificationOpen(false);
      }
    };

    if (notificationOpen) {
      document.addEventListener(
        "mousedown",
        handleOutsideClick
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [notificationOpen]);

  const loadOrders =
    useCallback(
      async (
        background = false
      ) => {
        try {
          if (
            background
          ) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const params =
            new URLSearchParams();

          params.set(
            "page",
            "1"
          );

          params.set(
            "limit",
            "100"
          );

          if (
            statusFilter
          ) {
            params.set(
              "status",
              statusFilter
            );
          }

          /*
          |--------------------------------------------------------------------------
          | IMPORTANT
          |--------------------------------------------------------------------------
          | Search is sent to backend for orderNumber searching.
          |--------------------------------------------------------------------------
          */

          if (search.trim()) {
            // Remove a leading # before searching the backend.
            const normalizedSearch = search.trim().replace(/^#/, "");

            params.set("search", normalizedSearch);
          }

          const response =
            await request(
              `/api/admin/orders?${params.toString()}`
            );

          const data =
            response.data ||
            response.orders ||
            [];

          const nextOrders =
            Array.isArray(data)
              ? data
              : [];

          if (background) {
            inspectOrderChanges(
              nextOrders
            );
          } else {
            previousOrdersRef.current =
              nextOrders;
            notificationInitializedRef.current =
              true;
          }

          setOrders(nextOrders);
        } catch (
          err
        ) {
          console.error(
            "Admin orders loading error:",
            err
          );

          setError(
            err.message ||
              "Unable to load orders."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        inspectOrderChanges,
        search,
        statusFilter
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadOrders();
  }, [
    loadOrders
  ]);

  /*
  |--------------------------------------------------------------------------
  | LIVE REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timer =
      setInterval(
        () => {
          loadOrders(true);
        },
        15000
      );

    return () =>
      clearInterval(
        timer
      );
  }, [
    loadOrders
  ]);

  /*
  |--------------------------------------------------------------------------
  | CLIENT FILTER
  |--------------------------------------------------------------------------
  */

  
const visibleOrders = useMemo(() => {
  const query = search
    .trim()
    .toLowerCase()
    .replace(/^#/, "");

  const filteredOrders = orders.filter((order) => {
    const orderNumber = String(
      order.orderNumber || ""
    )
      .trim()
      .toLowerCase()
      .replace(/^#/, "");

    const customerName =
      typeof order.customer === "object"
        ? String(order.customer?.name || "").toLowerCase()
        : "";

    const customerEmail =
      typeof order.customer === "object"
        ? String(order.customer?.email || "").toLowerCase()
        : "";

    const paymentMethod = normalizeStatus(order.paymentMethod);

    const paymentMatches =
      !paymentFilter || paymentMethod === paymentFilter;

    const textMatches =
      !query ||
      orderNumber.includes(query) ||
      customerName.includes(query) ||
      customerEmail.includes(query);

    return paymentMatches && textMatches;
  });

  // Put an exact order-number match at the top.
  if (query) {
    filteredOrders.sort((a, b) => {
      const orderNumberA = String(a.orderNumber || "")
        .trim()
        .toLowerCase()
        .replace(/^#/, "");

      const orderNumberB = String(b.orderNumber || "")
        .trim()
        .toLowerCase()
        .replace(/^#/, "");

      const exactMatchA = orderNumberA === query;
      const exactMatchB = orderNumberB === query;

      if (exactMatchA && !exactMatchB) return -1;
      if (!exactMatchA && exactMatchB) return 1;

      return 0;
    });
  }

  return filteredOrders;
}, [orders, search, paymentFilter]);
  /*
  |--------------------------------------------------------------------------
  | METRICS
  |--------------------------------------------------------------------------
  */

  const metrics =
    useMemo(
      () => {
        const total =
          orders.length;

        const pending =
          orders.filter(
            (order) =>
              normalizeStatus(
                order.orderStatus
              ) ===
              "pending"
          ).length;

        const active =
          orders.filter(
            (order) =>
              [
                "confirmed",
                "processing",
                "packed",
                "out_for_delivery"
              ].includes(
                normalizeStatus(
                  order.orderStatus
                )
              )
          ).length;

        const delivered =
          orders.filter(
            (order) =>
              normalizeStatus(
                order.orderStatus
              ) ===
              "delivered"
          ).length;

        const cancelled =
          orders.filter(
            (order) =>
              normalizeStatus(
                order.orderStatus
              ) ===
              "cancelled"
          ).length;

        const paid =
          orders.filter(
            (order) =>
              normalizeStatus(
                order.paymentStatus
              ) ===
              "paid"
          ).length;

        const cod =
          orders.filter(
            (order) =>
              normalizeStatus(
                order.paymentMethod
              ) ===
              "cod"
          ).length;

        const online =
          orders.filter(
            (order) =>
              [
                "razorpay",
                "upi",
                "online"
              ].includes(
                normalizeStatus(
                  order.paymentMethod
                )
              )
          ).length;

        const gross =
          orders.reduce(
            (
              sum,
              order
            ) =>
              sum +
              Number(
                order.totalAmount ||
                  order.total ||
                  0
              ),
            0
          );

        const deliveredValue =
          orders
            .filter(
              (order) =>
                normalizeStatus(
                  order.orderStatus
                ) ===
                "delivered"
            )
            .reduce(
              (
                sum,
                order
              ) =>
                sum +
                Number(
                  order.totalAmount ||
                    order.total ||
                    0
                ),
              0
            );

        return {
          total,
          pending,
          active,
          delivered,
          cancelled,
          paid,
          cod,
          online,
          gross,
          deliveredValue
        };
      },
      [orders]
    );

  /*
  |--------------------------------------------------------------------------
  | PAYMENT AMOUNTS
  |--------------------------------------------------------------------------
  */

  const paymentAmounts =
    useMemo(
      () => {
        const onlineAmount =
          orders
            .filter(
              (order) =>
                [
                  "razorpay",
                  "upi",
                  "online"
                ].includes(
                  normalizeStatus(
                    order.paymentMethod
                  )
                )
            )
            .reduce(
              (
                sum,
                order
              ) =>
                sum +
                Number(
                  order.totalAmount ||
                    order.total ||
                    0
                ),
              0
            );

        const codAmount =
          orders
            .filter(
              (order) =>
                normalizeStatus(
                  order.paymentMethod
                ) === "cod"
            )
            .reduce(
              (
                sum,
                order
              ) =>
                sum +
                Number(
                  order.totalAmount ||
                    order.total ||
                    0
                ),
              0
            );

        return {
          onlineAmount,
          codAmount
        };
      },
      [orders]
    );

  /*
  |--------------------------------------------------------------------------
  | DELETE ADMIN ORDER
  |--------------------------------------------------------------------------
  |
  | Permanent deletion is available to administrators.
  |
  | Important:
  | - This deletes the order record from MongoDB.
  | - It does NOT issue an external payment refund.
  | - Committed inventory is NOT restored by record deletion.
  | - Reserved inventory is released by the backend deletion flow.
  |
  */

  const deleteOrder = async (order) => {
    if (!order?._id) {
      return;
    }

    const orderNumber =
      order.orderNumber ||
      String(order._id).slice(-10);

    const totalAmount =
      Number(
        order.totalAmount ||
          order.total ||
          0
      );

    setDeleteConfirmOrder({
      ...order,
      _deleteOrderNumber: orderNumber,
      _deleteTotalAmount: totalAmount
    });
  };

  const confirmDeleteOrder = async () => {
    const order = deleteConfirmOrder;

    if (!order?._id) {
      setDeleteConfirmOrder(null);
      return;
    }

    const orderNumber =
      order._deleteOrderNumber ||
      order.orderNumber ||
      String(order._id).slice(-10);

    try {
      setDeletingOrderId(
        String(order._id)
      );
      setError("");

      await request(
        `/api/order-management/admin/${order._id}`,
        {
          method: "DELETE"
        }
      );

      /*
      |--------------------------------------------------------------------------
      | REMOVE FROM CURRENT UI IMMEDIATELY
      |--------------------------------------------------------------------------
      */

      setOrders(
        (currentOrders) =>
          currentOrders.filter(
            (currentOrder) =>
              String(currentOrder._id) !==
              String(order._id)
          )
      );

      /*
      |--------------------------------------------------------------------------
      | LIVE SOCKET / OTHER ADMIN CLIENTS
      |--------------------------------------------------------------------------
      |
      | The backend also emits admin:order-deleted.
      | Reload to guarantee the local list matches the database.
      |
      */

      await loadOrders(true);

      setDeleteConfirmOrder(null);
      setToast({
        type: "success",
        title: "Order deleted successfully",
        message: `Order #${orderNumber} was permanently removed.`
      });

      window.setTimeout(() => {
        setToast((current) =>
          current?.message ===
          `Order #${orderNumber} was permanently removed.`
            ? null
            : current
        );
      }, 4000);
    } catch (err) {
      console.error(
        "Admin order deletion error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete order."
      );

      setToast({
        type: "error",
        title: "Delete failed",
        message: err.message || `Unable to delete order #${orderNumber}.`
      });

      window.setTimeout(() => {
        setToast((current) =>
          current?.message ===
          (err.message || `Unable to delete order #${orderNumber}.`)
            ? null
            : current
        );
      }, 5000);

      pushAdminNotifications([
        createAdminNotification({
          type: "error",
          title: "Order action failed",
          message:
            err.message ||
            `Unable to delete order #${orderNumber}.`,
          orderId: order._id,
          orderNumber
        })
      ]);
    } finally {
      setDeletingOrderId("");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RESET
  |--------------------------------------------------------------------------
  */

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPaymentFilter("");
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020706] text-white">

      {/* ================================================================ */}
      {/* BACKGROUND                                                       */}
      {/* ================================================================ */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div className="absolute -left-40 top-[-120px] h-[560px] w-[560px] rounded-full bg-emerald-400/[0.07] blur-[150px]" />

        <div className="absolute right-[-180px] top-[12%] h-[560px] w-[560px] rounded-full bg-cyan-400/[0.055] blur-[150px]" />

        <div className="absolute bottom-[-200px] left-[28%] h-[560px] w-[560px] rounded-full bg-violet-400/[0.045] blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.9) 1px, transparent 1px)",
            backgroundSize:
              "46px 46px"
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,.8) 1px, transparent 0)",
            backgroundSize:
              "22px 22px"
          }}
        />

      </div>

      {/* ================================================================ */}
      {/* SIDEBAR                                                          */}
      {/* ================================================================ */}

      <AdminSidebar />

      {/* ================================================================ */}
      {/* MAIN                                                             */}
      {/* ================================================================ */}

      <main className="relative lg:ml-72">

        <div className="mx-auto max-w-[1850px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

          {/* ============================================================ */}
          {/* HEADER                                                       */}
          {/* ============================================================ */}

          <AdminHeader
            title="Order Command Center"
            subtitle="Monitor marketplace orders, payments and fulfilment in real time."
            onRefresh={() =>
              loadOrders(true)
            }
            refreshing={
              refreshing
            }
          />

          {/* ============================================================ */}
          {/* LIVE SYSTEM BAR                                               */}
          {/* ============================================================ */}

          <section className="relative z-30 mt-5 flex justify-end">
            <div
              ref={notificationPanelRef}
              className="relative"
            >
              <button
                type="button"
                onClick={() =>
                  setNotificationOpen(
                    (current) => !current
                  )
                }
                aria-label="Open admin notifications"
                aria-expanded={notificationOpen}
                className="relative inline-flex items-center gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.05] px-4 py-3 text-xs font-black text-white/75 shadow-[0_15px_50px_rgba(0,0,0,0.2)] transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.09] hover:text-white"
              >
                <span className="text-lg">🔔</span>
                <span>Notifications</span>
                {unreadNotificationCount > 0 && (
                  <span className="flex min-w-6 items-center justify-center rounded-full border border-red-300/20 bg-red-400/15 px-2 py-1 text-[9px] font-black text-red-200">
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                )}
                {unreadNotificationCount > 0 && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 animate-pulse rounded-full bg-red-300 shadow-[0_0_12px_rgba(252,165,165,0.9)]" />
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 mt-3 w-[min(92vw,430px)] overflow-hidden rounded-[26px] border border-white/10 bg-[#06100e] shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-300/45">
                        Commerce alerts
                      </p>
                      <h3 className="mt-1 text-sm font-black text-white">
                        Admin notifications
                      </h3>
                      <p className="mt-1 text-[10px] text-white/25">
                        New orders and order-state changes appear here.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={
                          markAllNotificationsRead
                        }
                        disabled={
                          unreadNotificationCount ===
                          0
                        }
                        className="rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-2 text-[8px] font-black uppercase tracking-wide text-white/45 transition hover:border-cyan-300/20 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-25"
                      >
                        Read all
                      </button>
                      <button
                        type="button"
                        onClick={
                          clearNotifications
                        }
                        disabled={
                          notifications.length ===
                          0
                        }
                        className="rounded-lg border border-red-300/10 bg-red-400/[0.04] px-2.5 py-2 text-[8px] font-black uppercase tracking-wide text-red-200/50 transition hover:border-red-300/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-25"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[430px] overflow-y-auto">
                    {notifications.length ===
                    0 ? (
                      <div className="px-6 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-xl text-white/30">
                          🔕
                        </div>
                        <p className="mt-4 text-xs font-black text-white/60">
                          No notifications yet
                        </p>
                        <p className="mt-1 text-[10px] leading-5 text-white/20">
                          New order and status changes will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/6">
                        {notifications.map(
                          (notification) => (
                            <button
                              key={
                                notification.id
                              }
                              type="button"
                              onClick={() =>
                                markNotificationRead(
                                  notification.id
                                )
                              }
                              className={`block w-full px-5 py-4 text-left transition hover:bg-white/[0.035] ${
                                notification.read
                                  ? "opacity-55"
                                  : "bg-cyan-300/[0.02]"
                              }`}
                            >
                              <div className="flex gap-3">
                                <div
                                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border text-base ${notificationAccent(
                                    notification.type
                                  )}`}
                                >
                                  {notificationIcon(
                                    notification.type
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-xs font-black text-white/85">
                                      {
                                        notification.title
                                      }
                                    </p>
                                    {!notification.read && (
                                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
                                    )}
                                  </div>
                                  <p className="mt-1 text-[10px] leading-5 text-white/35">
                                    {
                                      notification.message
                                    }
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {notification.orderNumber && (
                                      <span className="rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[8px] font-black text-white/35">
                                        #
                                        {
                                          notification.orderNumber
                                        }
                                      </span>
                                    )}
                                    <span className="text-[8px] font-semibold text-white/20">
                                      {formatDate(
                                        notification.timestamp
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-white/8 bg-white/[0.025] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl">

            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">

              <div className="flex items-center gap-4">

                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.05]">

                  <span className="absolute h-3 w-3 animate-ping rounded-full bg-emerald-400/40" />

                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,1)]" />

                </div>

                <div>

                  <p className="text-[8px] font-black uppercase tracking-[0.22em] text-white/20">
                    Commerce network
                  </p>

                  <p className="mt-1 text-sm font-black text-emerald-300">
                    Live monitoring active
                  </p>

                </div>

              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                <TelemetryPill
                  label="Records"
                  value={
                    orders.length
                  }
                />

                <TelemetryPill
                  label="Visible"
                  value={
                    visibleOrders.length
                  }
                />

                <TelemetryPill
                  label="Active"
                  value={
                    metrics.active
                  }
                />

                <TelemetryPill
                  label="Paid"
                  value={
                    metrics.paid
                  }
                />

              </div>

            </div>

          </section>

          {/* ============================================================ */}
          {/* ERROR                                                          */}
          {/* ============================================================ */}

          {error && (
            <section className="mt-5 rounded-[24px] border border-red-300/15 bg-red-400/[0.05] p-5">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-sm font-black text-red-200">
                    Commerce stream unavailable
                  </p>

                  <p className="mt-1 text-xs text-red-200/45">
                    {error}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    loadOrders()
                  }
                  className="rounded-xl border border-red-300/15 bg-red-400/[0.06] px-4 py-2.5 text-xs font-black text-red-100 transition hover:bg-red-400/[0.12]"
                >
                  Retry
                </button>

              </div>

            </section>
          )}

          {/* ============================================================ */}
          {/* MAIN METRIC STRIP                                             */}
          {/* ============================================================ */}

          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

            <MetricCard
              label="Total Orders"
              value={
                metrics.total
              }
              icon="▣"
              accent="cyan"
            />

            <MetricCard
              label="Pending"
              value={
                metrics.pending
              }
              icon="◌"
              accent="amber"
            />

            <MetricCard
              label="Active"
              value={
                metrics.active
              }
              icon="↗"
              accent="violet"
            />

            <MetricCard
              label="Delivered"
              value={
                metrics.delivered
              }
              icon="✓"
              accent="emerald"
            />

            <MetricCard
              label="Cancelled"
              value={
                metrics.cancelled
              }
              icon="×"
              accent="red"
            />

          </section>

          {/* ============================================================ */}
          {/* VALUE + PAYMENT                                               */}
          {/* ============================================================ */}

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">

            {/* ---------------------------------------------------------- */}
            {/* VALUE CORE                                                   */}
            {/* ---------------------------------------------------------- */}

            <section className="relative overflow-hidden rounded-[34px] border border-cyan-300/10 bg-gradient-to-br from-[#071613] via-[#04110e] to-[#020706] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.4)] sm:p-8">

              <div className="pointer-events-none absolute right-[-90px] top-[-90px] h-80 w-80 rounded-full bg-cyan-300/[0.07] blur-[100px]" />

              <div className="pointer-events-none absolute bottom-[-100px] left-[35%] h-80 w-80 rounded-full bg-emerald-400/[0.07] blur-[100px]" />

              <div className="relative">

                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">

                  <div>

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.08] text-xl text-cyan-300">
                        ₹
                      </div>

                      <div>

                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-300/45">
                          Marketplace throughput
                        </p>

                        <p className="mt-1 text-xs text-white/25">
                          Aggregate order value
                        </p>

                      </div>

                    </div>

                    <p className="mt-6 text-4xl font-black tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                      ₹
                      {formatMoney(
                        metrics.gross
                      )}
                    </p>

                    <p className="mt-3 text-xs text-white/25">
                      Current value represented by all loaded orders.
                    </p>

                  </div>

                  <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.045] px-5 py-4">

                    <p className="text-[8px] font-black uppercase tracking-[0.17em] text-white/25">
                      Delivered value
                    </p>

                    <p className="mt-2 text-2xl font-black text-emerald-300">
                      ₹
                      {formatMoney(
                        metrics.deliveredValue
                      )}
                    </p>

                    <p className="mt-1 text-[10px] text-emerald-300/40">
                      completed commerce
                    </p>

                  </div>

                </div>

                {/* PAYMENT CARDS */}

                <div className="mt-9 grid gap-4 sm:grid-cols-2">

                  <PaymentChannel
                    title="Online / UPI"
                    orders={
                      metrics.online
                    }
                    amount={
                      paymentAmounts.onlineAmount
                    }
                    icon="⌁"
                    accent="cyan"
                  />

                  <PaymentChannel
                    title="Cash / COD"
                    orders={
                      metrics.cod
                    }
                    amount={
                      paymentAmounts.codAmount
                    }
                    icon="¤"
                    accent="amber"
                  />

                </div>

              </div>

            </section>

            {/* ---------------------------------------------------------- */}
            {/* RIGHT HEALTH                                                 */}
            {/* ---------------------------------------------------------- */}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">

              <SignalCard
                label="Paid Orders"
                value={
                  metrics.paid
                }
                text="Recorded as paid"
                icon="✓"
                accent="emerald"
              />

              <SignalCard
                label="Pending Queue"
                value={
                  metrics.pending
                }
                text="Awaiting progression"
                icon="◌"
                accent="amber"
              />

              <SignalCard
                label="Online Orders"
                value={
                  metrics.online
                }
                text="Digital payment flow"
                icon="⌁"
                accent="cyan"
              />

              <SignalCard
                label="Completion"
                value={
                  metrics.total > 0
                    ? `${Math.round(
                        (metrics.delivered /
                          metrics.total) *
                          100
                      )}%`
                    : "0%"
                }
                text="Delivered ratio"
                icon="%"
                accent="violet"
              />

            </section>

          </section>

          {/* ============================================================ */}
          {/* FILTER CONTROL                                                */}
          {/* ============================================================ */}

          <section className="mt-5 rounded-[30px] border border-white/8 bg-white/[0.025] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.23)] backdrop-blur-2xl">

            <div className="flex flex-col gap-5">

              <div>

                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-300/35">
                  Order intelligence
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Query the order stream
                </h2>

                <p className="mt-1 text-xs text-white/25">
                  Search orders and isolate payment or fulfilment states.
                </p>

              </div>

              <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">

                {/* SEARCH */}

                <div className="relative">

                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                    ⌕
                  </span>

                  <input
                    type="text"
                    value={
                      search
                    }
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search order number, customer or email..."
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-11 py-3.5 text-sm text-white outline-none placeholder:text-white/20 transition focus:border-cyan-300/30 focus:bg-cyan-300/[0.02]"
                  />

                </div>

                {/* STATUS */}

                <select
                  value={
                    statusFilter
                  }
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  className="rounded-2xl border border-white/10 bg-[#07110f] px-4 py-3.5 text-sm font-semibold text-white/70 outline-none focus:border-cyan-300/30"
                >

                  <option value="">
                    All order statuses
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="confirmed">
                    Confirmed
                  </option>

                  <option value="processing">
                    Processing
                  </option>

                  <option value="packed">
                    Packed
                  </option>

                  <option value="out_for_delivery">
                    Out for Delivery
                  </option>

                  <option value="delivered">
                    Delivered
                  </option>

                  <option value="cancelled">
                    Cancelled
                  </option>

                  <option value="returned">
                    Returned
                  </option>

                </select>

                {/* PAYMENT */}

                <select
                  value={
                    paymentFilter
                  }
                  onChange={(event) =>
                    setPaymentFilter(
                      event.target.value
                    )
                  }
                  className="rounded-2xl border border-white/10 bg-[#07110f] px-4 py-3.5 text-sm font-semibold text-white/70 outline-none focus:border-cyan-300/30"
                >

                  <option value="">
                    All payment methods
                  </option>

                  <option value="cod">
                    Cash / COD
                  </option>

                  <option value="razorpay">
                    Razorpay
                  </option>

                  <option value="upi">
                    UPI
                  </option>

                  <option value="online">
                    Online
                  </option>

                </select>

                {/* RESET */}

                <button
                  type="button"
                  onClick={
                    resetFilters
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-3.5 text-xs font-black text-white/45 transition hover:border-cyan-300/20 hover:text-cyan-300"
                >
                  Reset
                </button>

              </div>

            </div>

          </section>

          {/* ============================================================ */}
          {/* STREAM HEADER                                                 */}
          {/* ============================================================ */}

          <section className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

            <div>

              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                Live order stream
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight">
                {visibleOrders.length}
                {" "}
                order
                {visibleOrders.length ===
                1
                  ? ""
                  : "s"}
              </h2>

            </div>

            <Link
              to="/admin/dashboard"
              className="w-fit rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs font-black text-white/45 transition hover:border-emerald-300/15 hover:text-emerald-300"
            >
              ← Dashboard
            </Link>

          </section>

          {/* ============================================================ */}
          {/* LOADING                                                       */}
          {/* ============================================================ */}

          {loading && (
            <section className="mt-5 rounded-[30px] border border-white/8 bg-white/[0.025] p-16 text-center backdrop-blur-xl">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] text-2xl text-cyan-300">
                ⚡
              </div>

              <p className="mt-5 text-sm font-black text-white/75">
                Synchronizing order stream...
              </p>

              <p className="mt-2 text-xs text-white/25">
                Pulling current commerce records.
              </p>

            </section>
          )}

          {/* ============================================================ */}
          {/* EMPTY                                                         */}
          {/* ============================================================ */}

          {!loading &&
            visibleOrders.length ===
              0 && (
              <section className="mt-5 rounded-[30px] border border-dashed border-white/10 bg-white/[0.02] p-16 text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-3xl text-white/35">
                  ▣
                </div>

                <h2 className="mt-5 text-xl font-black">
                  No matching orders
                </h2>

                <p className="mt-2 text-xs text-white/25">
                  Adjust your search or payment/status filters.
                </p>

                <button
                  type="button"
                  onClick={
                    resetFilters
                  }
                  className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-black text-white/50 transition hover:border-cyan-300/20 hover:text-cyan-300"
                >
                  Clear filters
                </button>

              </section>
            )}

          {/* ============================================================ */}
          {/* ORDER STREAM                                                   */}
          {/* ============================================================ */}

          {!loading &&
            visibleOrders.length >
              0 && (
              <section className="mt-5 overflow-hidden rounded-[30px] border border-white/8 bg-white/[0.025] shadow-[0_30px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl">

                {/* DESKTOP HEADER */}

                <div className="hidden border-b border-white/8 bg-white/[0.025] px-6 py-4 lg:grid lg:grid-cols-[1.45fr_1.25fr_0.8fr_1.05fr_1.05fr_0.95fr_0.7fr] lg:gap-5">

                  <TableHeader>
                    Order
                  </TableHeader>

                  <TableHeader>
                    Customer
                  </TableHeader>

                  <TableHeader>
                    Value
                  </TableHeader>

                  <TableHeader>
                    Payment
                  </TableHeader>

                  <TableHeader>
                    Status
                  </TableHeader>

                  <TableHeader align="right">
                    Created
                  </TableHeader>

                  <TableHeader align="right">
                    Action
                  </TableHeader>

                </div>

                <div className="divide-y divide-white/6">

                  {visibleOrders.map(
                    (
                      order
                    ) => {

                      const customer =
                        typeof order.customer ===
                        "object"
                          ? order.customer
                          : null;

                      const status =
                        normalizeStatus(
                          order.orderStatus ||
                            "unknown"
                        );

                      const paymentStatus =
                        normalizeStatus(
                          order.paymentStatus ||
                            "pending"
                        );

                      const paymentMethod =
                        normalizeStatus(
                          order.paymentMethod ||
                            ""
                        );

                      const statusVisual =
                        getOrderStatusVisual(
                          status
                        );

                      const paymentVisual =
                        getPaymentVisual(
                          paymentStatus
                        );

                      const total =
                        Number(
                          order.totalAmount ||
                            order.total ||
                            0
                        );

                      return (
                        <div
                          key={
                            order._id
                          }
                          className="group relative px-5 py-5 transition-all duration-300 hover:bg-cyan-300/[0.025] lg:grid lg:grid-cols-[1.45fr_1.25fr_0.8fr_1.05fr_1.05fr_0.95fr_0.7fr] lg:items-center lg:gap-5 lg:px-6"
                        >

                          {/* LEFT GLOW */}

                          <div className="pointer-events-none absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-transparent via-cyan-300/60 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

                          {/* ORDER */}

                          <div>

                            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-300/30 lg:hidden">
                              Order
                            </p>

                            <div className="mt-1 flex items-center gap-3">

                              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.025] text-cyan-300 transition group-hover:border-cyan-300/15 group-hover:bg-cyan-300/[0.05]">
                                ⚡
                              </div>

                              <div className="min-w-0">

                                <p className="truncate text-sm font-black text-white">
                                  #
                                  {order.orderNumber ||
                                    String(
                                      order._id
                                    ).slice(
                                      -10
                                    )}
                                </p>

                                
                                <p className="mt-1 text-[10px] text-white/40">
                                  {order.items?.length || 0}{" "}
                                  item
                                  {order.items?.length === 1 ? "" : "s"}
                                </p>

                                {Array.isArray(order.items) && order.items.length > 0 && (
                                  <div className="mt-3 space-y-3">
                                    {order.items.map((item, index) => {
                                      const seller =
                                        typeof item.seller === "object"
                                          ? item.seller
                                          : typeof item.product?.seller === "object"
                                            ? item.product.seller
                                            : null;

                                      const sellerName =
                                        item.sellerName ||
                                        seller?.name ||
                                        seller?.fullName ||
                                        seller?.username ||
                                        item.product?.sellerName ||
                                        "Seller name unavailable";

                                      const productName =
                                        item.productName ||
                                        item.product?.name ||
                                        item.name ||
                                        "Unknown product";

                                      return (
                                        <div
                                          key={item._id || item.product?._id || index}
                                          className="rounded-xl border border-white/10 bg-white/[0.025] p-3"
                                        >
                                          <p className="text-xs font-bold text-white/85">
                                            {productName}
                                          </p>

                                          <p className="mt-1 text-[10px] text-emerald-300">
                                            Seller: {sellerName}
                                          </p>

                                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/40">
                                            <span>
                                              Qty: {item.quantity ?? 0} {item.unit || ""}
                                            </span>

                                            <span>
                                              Unit price: ₹
                                              {formatMoney(item.priceAtPurchase ?? item.price)}
                                            </span>

                                            <span>
                                              Subtotal: ₹
                                              {formatMoney(
                                                item.subtotal ??
                                                  (Number(item.quantity || 0) *
                                                    Number(item.priceAtPurchase ?? item.price ?? 0))
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                              </div>

                            </div>

                          </div>

                          {/* CUSTOMER */}

                          <div className="mt-5 lg:mt-0">

                            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-300/30 lg:hidden">
                              Customer
                            </p>

                            <p className="mt-1 truncate text-sm font-bold text-white/80">
                              {customer?.name ||
                                order.customerName ||
                                "Unknown customer"}
                            </p>

                            <p className="mt-1 truncate text-[10px] text-white/25">
                              {customer?.email ||
                                "No email"}
                            </p>

                          </div>

                          {/* VALUE */}

                          <div className="mt-5 lg:mt-0">

                            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-300/30 lg:hidden">
                              Value
                            </p>

                            <p className="mt-1 text-base font-black text-emerald-300">
                              ₹
                              {formatMoney(
                                total
                              )}
                            </p>

                          </div>

                          {/* PAYMENT */}

                          <div className="mt-5 lg:mt-0">

                            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-300/30 lg:hidden">
                              Payment
                            </p>

                            <div className="mt-1 flex flex-wrap gap-2">

                              <span className="rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white/40">
                                {paymentMethod ||
                                  "—"}
                              </span>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase ${paymentVisual.wrapper} ${paymentVisual.text}`}
                              >
                                {paymentVisual.label}
                              </span>

                            </div>

                          </div>

                          {/* STATUS */}

                          <div className="mt-5 lg:mt-0">

                            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-300/30 lg:hidden">
                              Status
                            </p>

                            <span
                              className={`mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black ${statusVisual.wrapper} ${statusVisual.text}`}
                            >

                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusVisual.dot}`}
                              />

                              {statusVisual.icon}

                              <span>
                                {statusVisual.label}
                              </span>

                            </span>

                          </div>

                          {/* DATE */}

                          <div className="mt-5 lg:mt-0 lg:text-right">

                            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-300/30 lg:hidden">
                              Created
                            </p>

                            <p className="mt-1 text-[10px] font-semibold leading-5 text-white/35">
                              {formatDate(
                                order.createdAt
                              )}
                            </p>

                          </div>

                          {/* DELETE */}

                          <div className="mt-5 lg:mt-0 lg:flex lg:justify-end">

                            <button
                              type="button"
                              onClick={() =>
                                deleteOrder(order)
                              }
                              disabled={
                                deletingOrderId ===
                                String(order._id)
                              }
                              title="Permanently delete this order"
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300/15 bg-red-400/[0.06] px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-red-200 transition hover:border-red-300/30 hover:bg-red-400/[0.12] hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <span>
                                {deletingOrderId ===
                                String(order._id)
                                  ? "…"
                                  : "×"}
                              </span>

                              <span className="lg:hidden">
                                {deletingOrderId ===
                                String(order._id)
                                  ? "Deleting..."
                                  : "Delete"}
                              </span>
                            </button>

                          </div>

                          {/* MOBILE */}

                          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/6 pt-4 lg:hidden">

                            <Link
                              to={`/admin/orders/${order._id}`}
                              className="inline-flex rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs font-black text-white/50 transition hover:border-cyan-300/20 hover:text-cyan-300"
                            >
                              Open order →
                            </Link>

                            <button
                              type="button"
                              onClick={() =>
                                deleteOrder(order)
                              }
                              disabled={
                                deletingOrderId ===
                                String(order._id)
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-red-300/15 bg-red-400/[0.06] px-4 py-2.5 text-xs font-black text-red-200 transition hover:border-red-300/30 hover:bg-red-400/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <span>
                                {deletingOrderId ===
                                String(order._id)
                                  ? "Deleting..."
                                  : "Delete Order ×"}
                              </span>
                            </button>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </section>
            )}

          {/* ============================================================ */}
          {/* BOTTOM INSIGHT                                                */}
          {/* ============================================================ */}

          <section className="mt-5 grid gap-4 md:grid-cols-3">

            <InsightCard
              label="Payment layer"
              value={
                metrics.paid
              }
              text="Orders recorded as paid."
              accent="emerald"
            />

            <InsightCard
              label="Fulfilment layer"
              value={
                metrics.active
              }
              text="Orders currently moving through fulfilment."
              accent="cyan"
            />

            <InsightCard
              label="Exception layer"
              value={
                metrics.cancelled
              }
              text="Orders currently in cancellation."
              accent="red"
            />

          </section>

          <section className="mt-5 rounded-[24px] border border-red-300/10 bg-red-400/[0.03] px-5 py-4">

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.17em] text-red-200/60">
                  Permanent record action
                </p>

                <p className="mt-1 text-xs leading-5 text-white/30">
                  Administrators can permanently delete an order record. Payment refunds and committed-stock restoration are separate operations.
                </p>

              </div>

              <span className="w-fit rounded-full border border-red-300/10 bg-red-400/[0.05] px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-red-200/55">
                Admin only
              </span>

            </div>

          </section>

        </div>

      </main>

      {/* DELETE CONFIRMATION MODAL                                   */}
      {/* ============================================================ */}

      {deleteConfirmOrder && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDeleteConfirmOrder(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-order-title"
            className="w-full max-w-lg overflow-hidden rounded-[28px] border border-red-300/15 bg-[#07100e] shadow-2xl shadow-black/60"
          >
            <div className="border-b border-white/8 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-red-300/15 bg-red-400/[0.08] text-xl text-red-300">
                  ×
                </div>
                <div className="min-w-0">
                  <h2 id="delete-order-title" className="text-lg font-black text-white">
                    Delete order?
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-white/40">
                    This action permanently removes the order record.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">
                    Order
                  </span>
                  <span className="text-sm font-black text-cyan-300">
                    #{deleteConfirmOrder._deleteOrderNumber || deleteConfirmOrder.orderNumber || String(deleteConfirmOrder._id).slice(-10)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-white/25">Amount</p>
                    <p className="mt-1 text-sm font-black text-emerald-300">
                      ₹{formatMoney(deleteConfirmOrder._deleteTotalAmount || deleteConfirmOrder.totalAmount || deleteConfirmOrder.total || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-white/25">Status</p>
                    <p className="mt-1 text-sm font-bold text-white/70">
                      {formatStatus(deleteConfirmOrder.orderStatus)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-white/25">Payment</p>
                    <p className="mt-1 text-sm font-bold text-white/70">
                      {formatStatus(deleteConfirmOrder.paymentMethod)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-white/25">Refund</p>
                    <p className="mt-1 text-sm font-bold text-amber-300">Not issued</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-300/10 bg-amber-400/[0.04] px-4 py-3 text-xs leading-5 text-amber-100/65">
                External payment refunds are not issued by this action. Committed stock is not restored by deleting the record.
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/8 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmOrder(null)}
                disabled={Boolean(deletingOrderId)}
                className="rounded-xl border border-white/10 bg-white/[0.035] px-5 py-3 text-xs font-black text-white/60 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteOrder}
                disabled={Boolean(deletingOrderId)}
                className="rounded-xl border border-red-300/20 bg-red-400/[0.10] px-5 py-3 text-xs font-black text-red-200 transition hover:border-red-300/35 hover:bg-red-400/[0.17] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingOrderId ? "Deleting..." : "Delete Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TOAST MESSAGE                                                */}
      {/* ============================================================ */}

      {toast && (
        <div className="fixed right-4 top-4 z-[110] w-[min(420px,calc(100vw-2rem))]">
          <div
            className={`overflow-hidden rounded-2xl border bg-[#07100e]/95 p-4 shadow-2xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-300/20 shadow-emerald-950/30"
                : "border-red-300/20 shadow-red-950/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg ${
                  toast.type === "success"
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-red-400/10 text-red-300"
                }`}
              >
                {toast.type === "success" ? "✓" : "!"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">
                  {toast.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded-lg px-2 py-1 text-sm text-white/30 transition hover:bg-white/5 hover:text-white/70"
                aria-label="Close message"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TELEMETRY PILL
|--------------------------------------------------------------------------
*/

function TelemetryPill({
  label,
  value
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/20">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white/75">
        {value}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TABLE HEADER
|--------------------------------------------------------------------------
*/

function TableHeader({
  children,
  align = "left"
}) {
  return (
    <div
      className={`text-[8px] font-black uppercase tracking-[0.18em] text-white/20 ${
        align === "right"
          ? "text-right"
          : ""
      }`}
    >
      {children}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| METRIC CARD
|--------------------------------------------------------------------------
*/

function MetricCard({
  label,
  value,
  icon,
  accent
}) {
  const accents = {
    cyan:
      "border-cyan-300/10 bg-cyan-400/[0.035] text-cyan-300",

    amber:
      "border-amber-300/10 bg-amber-400/[0.035] text-amber-300",

    violet:
      "border-violet-300/10 bg-violet-400/[0.035] text-violet-300",

    emerald:
      "border-emerald-300/10 bg-emerald-400/[0.035] text-emerald-300",

    red:
      "border-red-300/10 bg-red-400/[0.035] text-red-300"
  };

  return (
    <div
      className={`group rounded-[24px] border p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.045] ${accents[accent] || "border-white/10 bg-white/[0.025] text-white"}`}
    >
      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-[8px] font-black uppercase tracking-[0.16em] opacity-40">
            {label}
          </p>

          <p className="mt-3 text-3xl font-black">
            {value}
          </p>

          <p className="mt-2 text-[8px] font-black uppercase tracking-[0.13em] text-white/15">
            live metric
          </p>

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.045] text-lg">
          {icon}
        </div>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SIGNAL CARD
|--------------------------------------------------------------------------
*/

function SignalCard({
  label,
  value,
  text,
  icon,
  accent
}) {
  const accents = {
    amber:
      "border-amber-300/10 bg-amber-400/[0.03] text-amber-300",

    emerald:
      "border-emerald-300/10 bg-emerald-400/[0.03] text-emerald-300",

    cyan:
      "border-cyan-300/10 bg-cyan-400/[0.03] text-cyan-300",

    violet:
      "border-violet-300/10 bg-violet-400/[0.03] text-violet-300"
  };

  return (
    <div
      className={`rounded-[26px] border p-5 backdrop-blur-xl ${accents[accent] || "border-white/10 bg-white/[0.025] text-white"}`}
    >
      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-[8px] font-black uppercase tracking-[0.17em] opacity-40">
            {label}
          </p>

          <p className="mt-3 text-3xl font-black">
            {value}
          </p>

          <p className="mt-2 text-[10px] leading-5 text-white/25">
            {text}
          </p>

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.045] text-lg">
          {icon}
        </div>

      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PAYMENT CHANNEL
|--------------------------------------------------------------------------
*/

function PaymentChannel({
  title,
  orders,
  amount,
  icon,
  accent
}) {
  const cyan =
    accent === "cyan";

  return (
    <div
      className={`rounded-2xl border p-5 ${
        cyan
          ? "border-cyan-300/10 bg-cyan-400/[0.045]"
          : "border-amber-300/10 bg-amber-400/[0.045]"
      }`}
    >
      <div className="flex items-center justify-between gap-4">

        <div className="flex items-center gap-3">

          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              cyan
                ? "bg-cyan-400/10 text-cyan-300"
                : "bg-amber-400/10 text-amber-300"
            }`}
          >
            {icon}
          </div>

          <div>

            <p
              className={`text-[8px] font-black uppercase tracking-[0.17em] ${
                cyan
                  ? "text-cyan-200/55"
                  : "text-amber-200/55"
              }`}
            >
              {title}
            </p>

            <p className="mt-1 text-xl font-black text-white">
              {orders}{" "}
              {orders === 1
                ? "order"
                : "orders"}
            </p>

          </div>

        </div>

        <p
          className={`text-sm font-black ${
            cyan
              ? "text-cyan-300"
              : "text-amber-300"
          }`}
        >
          ₹
          {formatMoney(
            amount
          )}
        </p>

      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INSIGHT CARD
|--------------------------------------------------------------------------
*/

function InsightCard({
  label,
  value,
  text,
  accent
}) {
  const map = {
    emerald:
      "border-emerald-300/10 bg-emerald-400/[0.025] text-emerald-300",

    cyan:
      "border-cyan-300/10 bg-cyan-400/[0.025] text-cyan-300",

    red:
      "border-red-300/10 bg-red-400/[0.025] text-red-300"
  };

  return (
    <div
      className={`rounded-[24px] border p-5 ${map[accent] || "border-white/10 bg-white/[0.025] text-white"}`}
    >
      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-[8px] font-black uppercase tracking-[0.17em] opacity-40">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black">
            {value}
          </p>

          <p className="mt-2 text-[10px] leading-5 text-white/25">
            {text}
          </p>

        </div>

        <div className="h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_15px_currentColor]" />

      </div>
    </div>
  );
}