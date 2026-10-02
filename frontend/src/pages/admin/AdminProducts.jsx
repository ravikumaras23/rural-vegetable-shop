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
import { io } from "socket.io-client";

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API_URL.replace(/\/api\/?$/, "");

/*
|--------------------------------------------------------------------------
| API REQUEST
|--------------------------------------------------------------------------
*/

const request = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error(
      "Admin authentication token is missing. Please login again."
    );
  }

  let response;

  try {
    response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      },
      cache: "no-store"
    });
  } catch {
    throw new Error(
      "Unable to connect to the backend. Please check that the backend is running."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || `Request failed with status ${response.status}`
    );

    error.status = response.status;
    throw error;
  }

  return data;
};

function getTokenRole() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "";
    const parts = token.split(".");
    if (parts.length !== 3) return "";
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return String(payload?.role || "").toLowerCase();
  } catch {
    return "";
  }
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatStatus(value) {
  if (!value) return "Unknown";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(value) {
  return (Number(value) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getStockState(product) {
  const stock = Number(product?.stockQuantity || 0);
  const threshold = Number(product?.lowStockThreshold ?? 10);

  if (stock <= 0) {
    return {
      label: "Out of stock",
      text: "text-red-600",
      bar: "bg-red-500",
      width: 100
    };
  }

  if (stock <= threshold) {
    const percentage = Math.min(
      Math.max((stock / Math.max(threshold, 1)) * 100, 8),
      100
    );

    return {
      label: "Low stock",
      text: "text-orange-600",
      bar: "bg-orange-500",
      width: percentage
    };
  }

  return {
    label: "Healthy",
    text: "text-emerald-600",
    bar: "bg-emerald-500",
    width: 100
  };
}

function getStatusConfig(status) {
  switch (normalizeStatus(status)) {
    case "approved":
      return {
        label: "Approved",
        dot: "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.75)]",
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        glow:
          "hover:border-emerald-200 hover:shadow-[0_25px_70px_rgba(16,185,129,0.10)]"
      };

    case "pending":
      return {
        label: "Pending",
        dot: "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.75)]",
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        glow:
          "hover:border-amber-200 hover:shadow-[0_25px_70px_rgba(245,158,11,0.10)]"
      };

    case "rejected":
      return {
        label: "Rejected",
        dot: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.75)]",
        badge: "border-red-200 bg-red-50 text-red-700",
        glow:
          "hover:border-red-200 hover:shadow-[0_25px_70px_rgba(239,68,68,0.10)]"
      };

    case "out_of_stock":
      return {
        label: "Out of Stock",
        dot: "bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.75)]",
        badge: "border-orange-200 bg-orange-50 text-orange-700",
        glow:
          "hover:border-orange-200 hover:shadow-[0_25px_70px_rgba(249,115,22,0.10)]"
      };

    case "inactive":
      return {
        label: "Inactive",
        dot: "bg-slate-400",
        badge: "border-slate-200 bg-slate-50 text-slate-600",
        glow:
          "hover:border-slate-300 hover:shadow-[0_25px_70px_rgba(15,23,42,0.07)]"
      };

    default:
      return {
        label: formatStatus(status),
        dot: "bg-slate-400",
        badge: "border-slate-200 bg-slate-50 text-slate-600",
        glow: "hover:border-slate-300"
      };
  }
}

/*
|--------------------------------------------------------------------------
| NOTIFICATION STORAGE
|--------------------------------------------------------------------------
*/

const NOTIFICATION_STORAGE_KEY =
  "admin_product_notifications_v1";

function readStoredNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredNotifications(notifications) {
  try {
    localStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(notifications.slice(0, 50))
    );
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case "new_product":
      return "🥬";
    case "approved":
      return "✓";
    case "rejected":
      return "×";
    case "activated":
      return "⚡";
    case "deactivated":
      return "⏸";
    case "out_of_stock":
      return "!";
    case "low_stock":
      return "⚠";
    case "action_error":
      return "!";
    default:
      return "•";
  }
}

function getNotificationAccent(type) {
  switch (type) {
    case "approved":
    case "activated":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "new_product":
    case "low_stock":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "rejected":
    case "deactivated":
    case "action_error":
    case "out_of_stock":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getProductName(product) {
  return product?.name || "Unnamed product";
}

function getSellerName(product) {
  const seller =
    typeof product?.seller === "object"
      ? product.seller
      : null;

  return (
    seller?.sellerProfile?.businessName ||
    seller?.name ||
    seller?.email ||
    "Unknown seller"
  );
}

function createProductSnapshot(product) {
  return {
    id: String(product?._id || ""),
    name: getProductName(product),
    sellerName: getSellerName(product),
    status: normalizeStatus(product?.status),
    stockQuantity: Number(product?.stockQuantity || 0)
  };
}

function createProductSnapshotMap(products) {
  const map = {};

  products.forEach((product) => {
    const snapshot = createProductSnapshot(product);

    if (snapshot.id) {
      map[snapshot.id] = snapshot;
    }
  });

  return map;
}

/*
|--------------------------------------------------------------------------
| ADMIN PRODUCTS
|--------------------------------------------------------------------------
*/

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  /*
  |--------------------------------------------------------------------------
  | NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  const [notifications, setNotifications] = useState(
    readStoredNotifications
  );

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [toast, setToast] = useState(null);

  const [rejectModal, setRejectModal] = useState({
    open: false,
    productId: "",
    productName: "",
    reason: ""
  });

  const notificationRef = useRef(null);
  const toastTimerRef = useRef(null);
  const previousProductSnapshotsRef = useRef({});
  const hasProductBaselineRef = useRef(false);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (item) => !item.read
      ).length,
    [notifications]
  );

  /*
  |--------------------------------------------------------------------------
  | SHOW IN-APP TOAST
  |--------------------------------------------------------------------------
  */

  const showToast = useCallback(
    ({
      type = "success",
      title,
      message,
      productId = null
    }) => {
      const item = {
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        type,
        title,
        message,
        productId
      };

      setToast(item);

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      toastTimerRef.current = setTimeout(() => {
        setToast(null);
      }, 6000);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | PUSH NOTIFICATION
  |--------------------------------------------------------------------------
  */

  const pushNotification = useCallback(
    ({
      type,
      title,
      message,
      productId = null,
      showPopup = true
    }) => {
      const notification = {
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 9)}`,
        type,
        title,
        message,
        productId,
        read: false,
        createdAt: new Date().toISOString()
      };

      setNotifications((current) => {
        const next = [
          notification,
          ...current
        ].slice(0, 50);

        saveStoredNotifications(next);

        return next;
      });

      if (showPopup) {
        showToast({
          type,
          title,
          message,
          productId
        });
      }
    },
    [showToast]
  );

  /*
  |--------------------------------------------------------------------------
  | NOTIFICATION ACTIONS
  |--------------------------------------------------------------------------
  */

  const markNotificationRead = useCallback(
    (id) => {
      setNotifications((current) => {
        const next = current.map((item) =>
          item.id === id
            ? { ...item, read: true }
            : item
        );

        saveStoredNotifications(next);

        return next;
      });
    },
    []
  );

  const markAllNotificationsRead = useCallback(
    () => {
      setNotifications((current) => {
        const next = current.map((item) => ({
          ...item,
          read: true
        }));

        saveStoredNotifications(next);

        return next;
      });
    },
    []
  );

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    saveStoredNotifications([]);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | DETECT PRODUCT CHANGES
  |--------------------------------------------------------------------------
  */

  const detectProductChanges = useCallback(
    (nextProducts) => {
      const nextMap =
        createProductSnapshotMap(
          nextProducts
        );

      const previousMap =
        previousProductSnapshotsRef.current;

      if (!hasProductBaselineRef.current) {
        previousProductSnapshotsRef.current =
          nextMap;

        hasProductBaselineRef.current = true;

        return;
      }

      Object.values(nextMap).forEach(
        (current) => {
          const previous =
            previousMap[current.id];

          if (!previous) {
            pushNotification({
              type: "new_product",
              title: "New product registered",
              message: `${current.name} was added by ${current.sellerName}.`,
              productId: current.id
            });

            return;
          }

          if (
            previous.status !==
            current.status
          ) {
            if (
              current.status ===
              "approved"
            ) {
              pushNotification({
                type: "approved",
                title: "Product approved",
                message: `${current.name} from ${current.sellerName} is now approved.`,
                productId: current.id
              });
            } else if (
              current.status ===
              "rejected"
            ) {
              pushNotification({
                type: "rejected",
                title: "Product rejected",
                message: `${current.name} from ${current.sellerName} was rejected.`,
                productId: current.id
              });
            } else if (
              current.status ===
              "inactive"
            ) {
              pushNotification({
                type: "deactivated",
                title: "Product deactivated",
                message: `${current.name} has been moved to inactive status.`,
                productId: current.id
              });
            }
          }

          if (
            previous.status !==
              "out_of_stock" &&
            current.stockQuantity <= 0
          ) {
            pushNotification({
              type: "out_of_stock",
              title: "Product out of stock",
              message: `${current.name} has no remaining stock.`,
              productId: current.id
            });
          } else if (
            previous.stockQuantity >
              0 &&
            current.stockQuantity >
              0 &&
            current.stockQuantity <=
              10 &&
            previous.stockQuantity >
              10
          ) {
            pushNotification({
              type: "low_stock",
              title: "Low stock warning",
              message: `${current.name} now has only ${current.stockQuantity} units available.`,
              productId: current.id
            });
          }
        }
      );

      previousProductSnapshotsRef.current =
        nextMap;
    },
    [pushNotification]
  );

  /*
  |--------------------------------------------------------------------------
  | LOAD PRODUCTS
  |--------------------------------------------------------------------------
  */

  const loadProducts = useCallback(
    async (background = false) => {
      try {
        if (background) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params =
          new URLSearchParams();

        params.set("limit", "100");

        if (statusFilter) {
          params.set(
            "status",
            statusFilter
          );
        }

        const response =
          await request(
            `/api/admin/products?${params.toString()}`
          );

        const data =
          response.data ||
          response.products ||
          [];

        const nextProducts =
          Array.isArray(data)
            ? data
            : [];

        if (background) {
          detectProductChanges(
            nextProducts
          );
        } else {
          previousProductSnapshotsRef.current =
            createProductSnapshotMap(
              nextProducts
            );

          hasProductBaselineRef.current =
            true;
        }

        setProducts(
          nextProducts
        );
      } catch (err) {
        console.error(
          "Product loading error:",
          err
        );

        const message =
          err.message ||
          "Unable to load products.";

        setError(message);

        if (background && err.status !== 401 && err.status !== 403) {
          pushNotification({
            type: "action_error",
            title: "Product sync failed",
            message,
            showPopup: true
          });
        }

        if (err.status === 401 || err.status === 403) {
          setError("This page requires an admin account. Please logout and login with the admin account.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      statusFilter,
      detectProductChanges,
      pushNotification
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /*
  |--------------------------------------------------------------------------
  | ADMIN SOCKET.IO - LIVE PRODUCT UPDATES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return undefined;

    const role = getTokenRole();
    if (role && role !== "admin") {
      setError("This page requires an admin account. Please logout and login with the admin account.");
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    const handleStatusUpdated = (payload) => {
      if (!payload?.productId) return;
      const productId = String(payload.productId);
      const status = String(payload.status || "").toLowerCase();

      setProducts((current) => current.map((product) =>
        String(product._id) === productId
          ? { ...product, status, updatedAt: new Date().toISOString() }
          : product
      ));

      previousProductSnapshotsRef.current = {
        ...previousProductSnapshotsRef.current,
        [productId]: {
          ...(previousProductSnapshotsRef.current[productId] || {}),
          id: productId,
          status,
          name: payload.productName || previousProductSnapshotsRef.current[productId]?.name || "Product",
          sellerName: previousProductSnapshotsRef.current[productId]?.sellerName || "Seller",
          stockQuantity: Number(previousProductSnapshotsRef.current[productId]?.stockQuantity || 0)
        }
      };
    };

    socket.on("product:status-updated", handleStatusUpdated);
    socket.on("connect_error", (err) => console.error("Admin Socket.IO error:", err.message));

    return () => {
      socket.off("product:status-updated", handleStatusUpdated);
      socket.disconnect();
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | AUTO REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timer =
      setInterval(() => {
        loadProducts(true);
      }, 15000);

    return () =>
      clearInterval(timer);
  }, [loadProducts]);

  /*
  |--------------------------------------------------------------------------
  | CLOSE NOTIFICATION DROPDOWN
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleOutsideClick =
      (event) => {
        if (
          notificationRef.current &&
          !notificationRef.current.contains(
            event.target
          )
        ) {
          setNotificationOpen(false);
        }
      };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
  }, []);

  /*
  |--------------------------------------------------------------------------
  | FILTERED PRODUCTS
  |--------------------------------------------------------------------------
  */

  const filteredProducts =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return products;
      }

      return products.filter(
        (product) => {
          const seller =
            typeof product.seller ===
            "object"
              ? [
                  product.seller?.name,
                  product.seller?.email,
                  product.seller
                    ?.sellerProfile
                    ?.businessName
                ]
                  .filter(Boolean)
                  .join(" ")
              : String(
                  product.seller || ""
                );

          const searchable = [
            product.name,
            product.category,
            product.status,
            seller
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [products, search]);

  /*
  |--------------------------------------------------------------------------
  | PRODUCT STATS
  |--------------------------------------------------------------------------
  */

  const stats = useMemo(() => {
    const total =
      products.length;

    const pending =
      products.filter(
        (product) =>
          normalizeStatus(
            product.status
          ) === "pending"
      ).length;

    const approved =
      products.filter(
        (product) =>
          normalizeStatus(
            product.status
          ) === "approved"
      ).length;

    const rejected =
      products.filter(
        (product) =>
          normalizeStatus(
            product.status
          ) === "rejected"
      ).length;

    const inactive =
      products.filter(
        (product) =>
          normalizeStatus(
            product.status
          ) === "inactive"
      ).length;

    const outOfStock =
      products.filter(
        (product) =>
          normalizeStatus(
            product.status
          ) ===
            "out_of_stock" ||
          Number(
            product.stockQuantity
          ) <= 0
      ).length;

    return {
      total,
      pending,
      approved,
      rejected,
      inactive,
      outOfStock
    };
  }, [products]);

  /*
  |--------------------------------------------------------------------------
  | OPEN REJECT MODAL
  |--------------------------------------------------------------------------
  */

  const openRejectModal =
    (product) => {
      setRejectModal({
        open: true,
        productId:
          product._id,
        productName:
          getProductName(
            product
          ),
        reason: ""
      });
    };

  const closeRejectModal =
    () => {
      if (
        actionLoading
      ) {
        return;
      }

      setRejectModal({
        open: false,
        productId: "",
        productName: "",
        reason: ""
      });
    };

  /*
  |--------------------------------------------------------------------------
  | UPDATE PRODUCT
  |--------------------------------------------------------------------------
  */

  const updateProduct =
    async (
      productId,
      action,
      rejectionReason = ""
    ) => {
      let endpoint = "";
      let body = {};

      if (
        action === "approve"
      ) {
        endpoint =
          `/api/admin/products/${productId}/approve`;
      }

      if (
        action === "reject"
      ) {
        if (
          !rejectionReason.trim()
        ) {
          setError(
            "Please enter a rejection reason."
          );

          return;
        }

        endpoint =
          `/api/admin/products/${productId}/reject`;

        body = {
          reason: rejectionReason.trim()
        };
      }

      if (
        action === "deactivate"
      ) {
        endpoint =
          `/api/admin/products/${productId}/status`;

        body = {
          status: "inactive"
        };
      }

      if (
        action === "activate"
      ) {
        endpoint =
          `/api/admin/products/${productId}/status`;

        body = {
          status: "approved"
        };
      }

      if (!endpoint) {
        setError(
          "Invalid product action."
        );

        return;
      }

      const product =
        products.find(
          (item) =>
            String(item._id) ===
            String(productId)
        );

      const productName =
        getProductName(
          product
        );

      const sellerName =
        getSellerName(
          product
        );

      const actionText =
        action === "approve"
          ? "approve"
          : action === "reject"
          ? "reject"
          : action === "activate"
          ? "activate"
          : "deactivate";

      try {
        setActionLoading(
          `${productId}-${action}`
        );

        setError("");

        await request(
          endpoint,
          {
            method: "PATCH",
            body: JSON.stringify(
              body
            )
          }
        );

        /*
         * Immediately show the success
         * popup. No window.confirm and
         * no localhost browser message.
         */
        if (
          action === "approve"
        ) {
          pushNotification({
            type: "approved",
            title: "Product approved",
            message: `${productName} from ${sellerName} is now approved.`,
            productId
          });
        }

        if (
          action === "reject"
        ) {
          pushNotification({
            type: "rejected",
            title: "Product rejected",
            message: `${productName} from ${sellerName} was rejected.`,
            productId
          });
        }

        if (
          action === "activate"
        ) {
          pushNotification({
            type: "activated",
            title: "Product activated",
            message: `${productName} is now active in the marketplace.`,
            productId
          });
        }

        if (
          action === "deactivate"
        ) {
          pushNotification({
            type: "deactivated",
            title: "Product deactivated",
            message: `${productName} has been moved to inactive status.`,
            productId
          });
        }

        /*
         * Refresh without generating a
         * duplicate notification from the
         * same manual action.
         */
        const response =
          await request(
            `/api/admin/products?limit=100${
              statusFilter
                ? `&status=${encodeURIComponent(
                    statusFilter
                  )}`
                : ""
            }`
          );

        const data =
          response.data ||
          response.products ||
          [];

        const nextProducts =
          Array.isArray(data)
            ? data
            : [];

        previousProductSnapshotsRef.current =
          createProductSnapshotMap(
            nextProducts
          );

        hasProductBaselineRef.current =
          true;

        setProducts(
          nextProducts
        );
      } catch (err) {
        console.error(
          "Product update error:",
          err
        );

        const message =
          err.message ||
          "Unable to update product.";

        setError(message);

        pushNotification({
          type: "action_error",
          title: "Product action failed",
          message: `${actionText} action failed: ${message}`,
          productId
        });
      } finally {
        setActionLoading("");
      }
    };

  /*
  |--------------------------------------------------------------------------
  | SUBMIT REJECTION
  |--------------------------------------------------------------------------
  */

  const submitRejection =
    async () => {
      const reason =
        rejectModal.reason.trim();

      if (!reason) {
        setError(
          "Please enter a rejection reason."
        );

        return;
      }

      await updateProduct(
        rejectModal.productId,
        "reject",
        reason
      );

      setRejectModal({
        open: false,
        productId: "",
        productName: "",
        reason: ""
      });
    };

  /*
  |--------------------------------------------------------------------------
  | RESET FILTERS
  |--------------------------------------------------------------------------
  */

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef4f1] text-slate-900">

      {/* AMBIENT BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-emerald-300/20 blur-[130px]" />

        <div className="absolute right-[-160px] top-[15%] h-[520px] w-[520px] rounded-full bg-cyan-300/15 blur-[140px]" />

        <div className="absolute bottom-[-160px] left-[30%] h-[500px] w-[500px] rounded-full bg-lime-300/12 blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.8) 1px, transparent 1px)",
            backgroundSize: "42px 42px"
          }}
        />
      </div>

      <AdminSidebar />

      <main className="relative lg:ml-72">
        <div className="mx-auto max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

          {/* HEADER + BELL */}

          <div className="relative">
            <AdminHeader
              title="Product Control"
              subtitle="Moderate, monitor and maintain the live marketplace inventory."
              onRefresh={() =>
                loadProducts(true)
              }
              refreshing={refreshing}
            />

            <div
              ref={notificationRef}
              className="absolute right-0 top-0 z-50"
            >
              <button
                type="button"
                onClick={() =>
                  setNotificationOpen(
                    (open) => !open
                  )
                }
                aria-label="Open product notifications"
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                🔔

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-lg">
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-14 w-[min(94vw,410px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_25px_90px_rgba(15,23,42,0.20)]">
                  <div className="border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                          Live marketplace
                        </p>

                        <h3 className="mt-1 text-base font-black">
                          Product Notifications
                        </h3>

                        <p className="mt-1 text-[10px] text-slate-400">
                          Approvals, rejections, stock and account changes.
                        </p>
                      </div>

                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-black">
                        {notifications.length} stored
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                    <button
                      type="button"
                      onClick={
                        markAllNotificationsRead
                      }
                      className="text-[10px] font-black text-emerald-700 hover:text-emerald-800"
                    >
                      Mark all read
                    </button>

                    <button
                      type="button"
                      onClick={
                        clearNotifications
                      }
                      className="text-[10px] font-black text-slate-400 hover:text-red-600"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="max-h-[450px] overflow-y-auto">
                    {notifications.length ===
                    0 ? (
                      <div className="px-6 py-12 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                          🔔
                        </div>

                        <p className="mt-4 text-sm font-black text-slate-800">
                          No product notifications yet
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Product actions and inventory changes will appear here.
                        </p>
                      </div>
                    ) : (
                      notifications.map(
                        (item) => (
                          <button
                            key={
                              item.id
                            }
                            type="button"
                            onClick={() =>
                              markNotificationRead(
                                item.id
                              )
                            }
                            className={`flex w-full gap-3 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 ${
                              item.read
                                ? "bg-white"
                                : "bg-emerald-50/50"
                            }`}
                          >
                            <span
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border text-sm font-black ${getNotificationAccent(
                                item.type
                              )}`}
                            >
                              {getNotificationIcon(
                                item.type
                              )}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="text-xs font-black text-slate-900">
                                  {item.title}
                                </span>

                                {!item.read && (
                                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                                )}
                              </span>

                              <span className="mt-1 block text-[11px] leading-5 text-slate-500">
                                {item.message}
                              </span>

                              <span className="mt-2 block text-[9px] font-bold text-slate-400">
                                {new Date(
                                  item.createdAt
                                ).toLocaleString()}
                              </span>
                            </span>
                          </button>
                        )
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LIVE STATUS */}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />

              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                Product monitoring active
              </span>
            </div>

            <p className="text-[10px] font-bold text-emerald-700/70">
              Automatic inventory sync every 15 seconds
            </p>
          </div>

          {/* HERO */}

          <section className="relative mt-6 overflow-hidden rounded-[34px] border border-white/80 bg-white/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400/50" />
                      <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Live inventory layer
                  </div>

                  <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl lg:text-5xl">
                    Shape the marketplace,
                    <span className="text-emerald-600">
                      {" "}product by product.
                    </span>
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
                    Review seller submissions, identify inventory risks and keep approved products ready for customers.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniStat
                    label="Total"
                    value={stats.total}
                  />

                  <MiniStat
                    label="Pending"
                    value={stats.pending}
                    accent="amber"
                  />

                  <MiniStat
                    label="Approved"
                    value={stats.approved}
                    accent="green"
                  />

                  <MiniStat
                    label="Stock risk"
                    value={stats.outOfStock}
                    accent="red"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ERROR */}

          {error && (
            <section className="mt-5 rounded-[24px] border border-red-200 bg-red-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-red-800">
                    Product operation failed
                  </p>

                  <p className="mt-1 text-xs text-red-600">
                    {error}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setError("")
                  }
                  className="w-fit rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                >
                  Dismiss
                </button>
              </div>
            </section>
          )}

          {/* FILTERS */}

          <section className="mt-6 rounded-[30px] border border-white/80 bg-white/75 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.055)] backdrop-blur-xl">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Inventory explorer
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Search & filter
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Find products using their name, category or seller.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_200px_auto]">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    ⌕
                  </span>

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search product or seller..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                >
                  <option value="">
                    All statuses
                  </option>
                  <option value="pending">
                    Pending
                  </option>
                  <option value="approved">
                    Approved
                  </option>
                  <option value="rejected">
                    Rejected
                  </option>
                  <option value="out_of_stock">
                    Out of Stock
                  </option>
                  <option value="inactive">
                    Inactive
                  </option>
                </select>

                <button
                  type="button"
                  onClick={
                    resetFilters
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-black text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          {/* RESULTS */}

          <section className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Marketplace inventory
              </p>

              <div className="mt-1 flex items-end gap-3">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  {filteredProducts.length}
                </h2>

                <span className="pb-0.5 text-sm font-semibold text-slate-400">
                  {filteredProducts.length ===
                  1
                    ? "product"
                    : "products"}{" "}
                  visible
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                <span className="text-slate-900">
                  {filteredProducts.length}
                </span>{" "}
                of{" "}
                <span className="text-slate-900">
                  {products.length}
                </span>
              </div>

              <Link
                to="/admin/dashboard"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-500 transition hover:border-emerald-200 hover:text-emerald-700"
              >
                ← Command Center
              </Link>
            </div>
          </section>

          {/* LOADING */}

          {loading && (
            <section className="mt-5 rounded-[30px] border border-white/80 bg-white p-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-emerald-200 bg-emerald-50 text-2xl text-emerald-600">
                <span className="animate-pulse">
                  ◌
                </span>
              </div>

              <p className="mt-5 text-sm font-black text-slate-800">
                Synchronizing inventory
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Fetching the latest seller products.
              </p>
            </section>
          )}

          {/* EMPTY */}

          {!loading &&
            filteredProducts.length ===
              0 && (
              <section className="mt-5 rounded-[30px] border border-dashed border-slate-300 bg-white p-16 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-3xl">
                  🥬
                </div>

                <h2 className="mt-5 text-xl font-black text-slate-900">
                  No products found
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                  No product currently matches the selected search and status configuration.
                </p>

                <button
                  type="button"
                  onClick={
                    resetFilters
                  }
                  className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-slate-800"
                >
                  Clear filters
                </button>
              </section>
            )}

          {/* PRODUCT GRID */}

          {!loading &&
            filteredProducts.length >
              0 && (
              <section className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredProducts.map(
                  (product) => {
                    const status =
                      getStatusConfig(
                        product.status
                      );

                    const stock =
                      getStockState(
                        product
                      );

                    const seller =
                      typeof product.seller ===
                      "object"
                        ? product.seller
                        : null;

                    const sellerName =
                      seller
                        ?.sellerProfile
                        ?.businessName ||
                      seller?.name ||
                      seller?.email ||
                      "Unknown seller";

                    const approveLoading =
                      actionLoading ===
                      `${product._id}-approve`;

                    const rejectLoading =
                      actionLoading ===
                      `${product._id}-reject`;

                    const activateLoading =
                      actionLoading ===
                      `${product._id}-activate`;

                    const deactivateLoading =
                      actionLoading ===
                      `${product._id}-deactivate`;

                    return (
                      <article
                        key={
                          product._id
                        }
                        className={`group relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.055)] transition duration-300 hover:-translate-y-1.5 ${status.glow}`}
                      >
                        {/* IMAGE */}

                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                          {product.images?.[0]
                            ?.url ? (
                            <img
                              src={
                                product
                                  .images[0]
                                  .url
                              }
                              alt={
                                product.name ||
                                "Product"
                              }
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-6xl">
                              🥬
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />

                          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide shadow-lg backdrop-blur-md ${status.badge}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                              />
                              {status.label}
                            </span>

                            {product.isOrganic && (
                              <span className="rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-emerald-700 shadow-lg backdrop-blur-md">
                                Organic
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CONTENT */}

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                                {product.category ||
                                  "Vegetable"}
                              </p>

                              <h3 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
                                {product.name ||
                                  "Unnamed product"}
                              </h3>
                            </div>

                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg">
                              ◈
                            </div>
                          </div>

                          {/* SELLER */}

                          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm">
                              👨‍🌾
                            </div>

                            <div className="min-w-0">
                              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
                                Seller
                              </p>

                              <p className="mt-1 truncate text-xs font-black text-slate-800">
                                {sellerName}
                              </p>
                            </div>
                          </div>

                          {/* PRICE / STOCK */}

                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
                                Price
                              </p>

                              <p className="mt-1 text-xl font-black text-slate-950">
                                ₹
                                {formatMoney(
                                  product.price
                                )}
                              </p>

                              <p className="mt-0.5 text-[9px] text-slate-400">
                                /{" "}
                                {product.unit ||
                                  "unit"}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
                                Stock
                              </p>

                              <p
                                className={`mt-1 text-xl font-black ${stock.text}`}
                              >
                                {product.stockQuantity ??
                                  0}
                              </p>

                              <p className="mt-0.5 text-[9px] text-slate-400">
                                available
                              </p>
                            </div>
                          </div>

                          {/* STOCK HEALTH */}

                          <div className="mt-5">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[9px] font-black uppercase tracking-[0.12em] ${stock.text}`}
                              >
                                {stock.label}
                              </span>

                              <span className="text-[9px] font-bold text-slate-400">
                                limit{" "}
                                {product.lowStockThreshold ??
                                  10}
                              </span>
                            </div>

                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${stock.bar}`}
                                style={{
                                  width: `${stock.width}%`
                                }}
                              />
                            </div>
                          </div>

                          {/* ACTIONS */}

                          <div className="mt-5">
                            {normalizeStatus(
                              product.status
                            ) ===
                              "pending" && (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    actionLoading !==
                                    ""
                                  }
                                  onClick={() =>
                                    updateProduct(
                                      product._id,
                                      "approve"
                                    )
                                  }
                                  className="rounded-2xl bg-emerald-600 px-3 py-3 text-xs font-black text-white shadow-[0_10px_25px_rgba(16,185,129,0.15)] transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {approveLoading
                                    ? "Approving..."
                                    : "Approve"}
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    actionLoading !==
                                    ""
                                  }
                                  onClick={() =>
                                    openRejectModal(
                                      product
                                    )
                                  }
                                  className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {rejectLoading
                                    ? "Rejecting..."
                                    : "Reject"}
                                </button>
                              </div>
                            )}

                            {normalizeStatus(
                              product.status
                            ) ===
                              "approved" && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading !==
                                  ""
                                }
                                onClick={() =>
                                  updateProduct(
                                    product._id,
                                    "deactivate"
                                  )
                                }
                                className="w-full rounded-2xl border border-red-200 bg-white px-3 py-3 text-xs font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deactivateLoading
                                  ? "Deactivating..."
                                  : "Deactivate Product"}
                              </button>
                            )}

                            {normalizeStatus(
                              product.status
                            ) ===
                              "inactive" && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading !==
                                  ""
                                }
                                onClick={() =>
                                  updateProduct(
                                    product._id,
                                    "activate"
                                  )
                                }
                                className="w-full rounded-2xl bg-emerald-600 px-3 py-3 text-xs font-black text-white shadow-[0_10px_25px_rgba(16,185,129,0.14)] transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {activateLoading
                                  ? "Activating..."
                                  : "Activate Product"}
                              </button>
                            )}

                            {normalizeStatus(
                              product.status
                            ) ===
                              "rejected" && (
                              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-red-500">
                                  Moderation state
                                </p>

                                <p className="mt-1 text-xs leading-5 text-red-700">
                                  This product was rejected. Review the seller submission before approving again.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* META */}

                          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                Product ID
                              </p>

                              <p className="mt-1 truncate font-mono text-[9px] text-slate-400">
                                {String(
                                  product._id
                                ).slice(-10)}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                Updated
                              </p>

                              <p className="mt-1 text-[9px] font-semibold text-slate-500">
                                {product.updatedAt
                                  ? new Date(
                                      product.updatedAt
                                    ).toLocaleDateString(
                                      "en-IN"
                                    )
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pointer-events-none absolute bottom-0 left-0 h-1 w-full scale-x-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-lime-400 transition-transform duration-500 group-hover:scale-x-100" />
                      </article>
                    );
                  }
                )}
              </section>
            )}
        </div>
      </main>

      {/* ================================================================ */}
      {/* IN-APP TOAST POPUP                                               */}
      {/* ================================================================ */}

      {toast && (
        <div
          className="fixed right-5 top-5 z-[100] w-[min(92vw,540px)] animate-[toastIn_.35s_ease-out]"
          role="status"
          aria-live="polite"
        >
          <div
            className={`overflow-hidden rounded-3xl border bg-white shadow-[0_25px_90px_rgba(15,23,42,0.20)] ${
              toast.type ===
                "approved" ||
              toast.type ===
                "activated"
                ? "border-emerald-200"
                : toast.type ===
                    "rejected" ||
                  toast.type ===
                    "deactivated" ||
                  toast.type ===
                    "action_error" ||
                  toast.type ===
                    "out_of_stock"
                ? "border-red-200"
                : "border-amber-200"
            }`}
          >
            <div className="flex gap-3 p-4 sm:p-5">
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border text-lg font-black ${getNotificationAccent(
                  toast.type
                )}`}
              >
                {getNotificationIcon(
                  toast.type
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                      Product notification
                    </p>

                    <h3 className="mt-1 text-sm font-black text-slate-950 sm:text-base">
                      {toast.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setToast(null)
                    }
                    aria-label="Close notification"
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    ×
                  </button>
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {toast.message}
                </p>
              </div>
            </div>

            <div className="h-1 overflow-hidden bg-slate-100">
              <div className="h-full w-full origin-left animate-[toastProgress_6s_linear]" />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* CUSTOM REJECT MODAL                                             */}
      {/* ================================================================ */}

      {rejectModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-lg overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.30)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-product-title"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-red-500">
                  Product moderation
                </p>

                <h2
                  id="reject-product-title"
                  className="mt-1 text-xl font-black text-slate-950"
                >
                  Reject product
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {rejectModal.productName}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeRejectModal
                }
                disabled={
                  actionLoading !==
                  ""
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <label
                htmlFor="product-rejection-reason"
                className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500"
              >
                Rejection reason
              </label>

              <textarea
                id="product-rejection-reason"
                value={
                  rejectModal.reason
                }
                onChange={(event) =>
                  setRejectModal(
                    (current) => ({
                      ...current,
                      reason:
                        event.target
                          .value
                    })
                  )
                }
                rows={5}
                autoFocus
                placeholder="Enter the reason for rejecting this product..."
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
              />

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeRejectModal
                  }
                  disabled={
                    actionLoading !==
                    ""
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={
                    submitRejection
                  }
                  disabled={
                    actionLoading !==
                      "" ||
                    !rejectModal.reason.trim()
                  }
                  className="rounded-2xl bg-red-600 px-5 py-3 text-xs font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading ===
                  `${rejectModal.productId}-reject`
                    ? "Rejecting..."
                    : "Reject Product"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translate3d(30px, -10px, 0) scale(.97);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes toastProgress {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-\\[toastIn_.35s_ease-out\\],
          .animate-\\[toastProgress_6s_linear\\] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| MINI STAT
|--------------------------------------------------------------------------
*/

function MiniStat({
  label,
  value,
  accent = "slate"
}) {
  const accents = {
    slate:
      "border-slate-200 bg-white text-slate-950",

    amber:
      "border-amber-200 bg-amber-50 text-amber-900",

    green:
      "border-emerald-200 bg-emerald-50 text-emerald-900",

    red:
      "border-red-200 bg-red-50 text-red-900"
  };

  return (
    <div
      className={`min-w-[90px] rounded-2xl border px-3 py-3 ${
        accents[accent] ||
        accents.slate
      }`}
    >
      <p className="text-[8px] font-black uppercase tracking-[0.14em] opacity-45">
        {label}
      </p>

      <p className="mt-1 text-xl font-black">
        {value}
      </p>
    </div>
  );
}
