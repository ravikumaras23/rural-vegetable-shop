import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  Link
} from "react-router-dom";

import {
  io
} from "socket.io-client";

import SellerSidebar from "../../components/seller/SellerSidebar.jsx";

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
| GET TOKEN PAYLOAD
|--------------------------------------------------------------------------
*/

function getTokenPayload() {
  try {
    const token =
      localStorage.getItem("token");

    if (!token) {
      return null;
    }

    const parts =
      token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const base64 =
      parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    return JSON.parse(
      atob(base64)
    );
  } catch {
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| GET TOKEN ROLE
|--------------------------------------------------------------------------
*/

function getTokenRole() {
  const payload =
    getTokenPayload();

  return String(
    payload?.role || ""
  ).toLowerCase();
}

/*
|--------------------------------------------------------------------------
| GET SELLER ID FROM TOKEN
|--------------------------------------------------------------------------
*/

function getSellerIdFromToken() {
  const payload =
    getTokenPayload();

  return (
    payload?.id ||
    payload?._id ||
    payload?.userId ||
    payload?.sub ||
    ""
  );
}

/*
|--------------------------------------------------------------------------
| SELLER NOTIFICATION STORAGE
|--------------------------------------------------------------------------
*/

function getNotificationStorageKey() {
  const sellerId =
    getSellerIdFromToken();

  if (!sellerId) {
    return "seller_product_notifications_unknown";
  }

  return `seller_product_notifications_${sellerId}`;
}

function readStoredNotifications() {
  try {
    const key =
      getNotificationStorageKey();

    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function saveStoredNotifications(
  notifications
) {
  try {
    const key =
      getNotificationStorageKey();

    localStorage.setItem(
      key,
      JSON.stringify(
        notifications.slice(0, 50)
      )
    );
  } catch {
    // Ignore localStorage errors.
  }
}

/*
|--------------------------------------------------------------------------
| API REQUEST
|--------------------------------------------------------------------------
*/

async function request(
  endpoint,
  options = {}
) {
  const token =
    localStorage.getItem("token");

  if (!token) {
    throw new Error(
      "Please login before continuing."
    );
  }

  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,

          ...(options.headers || {})
        },

        cache:
          "no-store"
      }
    );

  const data =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| IMAGE URL
|--------------------------------------------------------------------------
*/

function getImageUrl(
  image
) {
  if (!image) {
    return "";
  }

  if (
    typeof image ===
    "string"
  ) {
    return image;
  }

  return (
    image.url ||
    image.secure_url ||
    ""
  );
}

/*
|--------------------------------------------------------------------------
| FORMAT DATE
|--------------------------------------------------------------------------
*/

function formatDate(
  value
) {
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

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

/*
|--------------------------------------------------------------------------
| STATUS HELPERS
|--------------------------------------------------------------------------
*/

function normalizeStatus(
  status
) {
  return String(
    status || ""
  )
    .trim()
    .toLowerCase();
}

function getStatusLabel(
  status
) {
  const normalized =
    normalizeStatus(status);

  switch (normalized) {
    case "pending":
      return "Pending Approval";

    case "approved":
      return "Approved";

    case "rejected":
      return "Rejected";

    case "out_of_stock":
      return "Out of Stock";

    case "inactive":
      return "Inactive";

    default:
      return normalized
        ? normalized
            .replaceAll(
              "_",
              " "
            )
            .replace(
              /\b\w/g,
              (character) =>
                character.toUpperCase()
            )
        : "Unknown";
  }
}

function getStatusClasses(
  status
) {
  switch (
    normalizeStatus(status)
  ) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";

    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "rejected":
      return "bg-red-100 text-red-700";

    case "out_of_stock":
      return "bg-orange-100 text-orange-700";

    case "inactive":
      return "bg-slate-200 text-slate-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

/*
|--------------------------------------------------------------------------
| NOTIFICATION HELPERS
|--------------------------------------------------------------------------
*/

function getNotificationIcon(
  type
) {
  switch (type) {
    case "approved":
      return "✓";

    case "rejected":
      return "×";

    case "inactive":
      return "⏸";

    case "out_of_stock":
      return "!";

    case "low_stock":
      return "⚠";

    default:
      return "🔔";
  }
}

function getNotificationClasses(
  type
) {
  switch (type) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";

    case "inactive":
      return "border-slate-200 bg-slate-100 text-slate-700";

    case "out_of_stock":
      return "border-orange-200 bg-orange-50 text-orange-700";

    default:
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }
}

/*
|--------------------------------------------------------------------------
| PRODUCT IMAGE
|--------------------------------------------------------------------------
*/

function ProductImage({
  product
}) {
  const images =
    Array.isArray(
      product?.images
    )
      ? product.images
      : [];

  const image =
    images.length
      ? getImageUrl(
          images[0]
        )
      : "";

  if (!image) {
    return (
      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
        No image
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={
        product?.name ||
        "Vegetable"
      }
      className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
      loading="lazy"
    />
  );
}

/*
|--------------------------------------------------------------------------
| SELLER PRODUCTS
|--------------------------------------------------------------------------
*/

export default function SellerProducts() {
  /*
  |--------------------------------------------------------------------------
  | PRODUCT STATE
  |--------------------------------------------------------------------------
  */

  const [
    products,
    setProducts
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter
  ] = useState("");

  const [
    search,
    setSearch
  ] = useState("");

  const [
    page,
    setPage
  ] = useState(1);

  const [
    pagination,
    setPagination
  ] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  const [
    deletingId,
    setDeletingId
  ] = useState("");

  const [
    stockEditingId,
    setStockEditingId
  ] = useState("");

  const [
    stockValue,
    setStockValue
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | NOTIFICATION STATE
  |--------------------------------------------------------------------------
  */

  const [
    notifications,
    setNotifications
  ] = useState(
    readStoredNotifications
  );

  const [
    notificationOpen,
    setNotificationOpen
  ] = useState(false);

  const [
    toast,
    setToast
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | REFS
  |--------------------------------------------------------------------------
  */

  const notificationRef =
    useRef(null);

  const toastTimerRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | IMPORTANT SOCKET REFS
  |--------------------------------------------------------------------------
  |
  | These prevent Socket.IO from reconnecting whenever page,
  | filters or loadProducts function changes.
  |
  */

  const loadProductsRef =
    useRef(null);

  const pageRef =
    useRef(page);

  /*
  |--------------------------------------------------------------------------
  | KEEP PAGE REF UPDATED
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    pageRef.current =
      page;
  }, [page]);

  /*
  |--------------------------------------------------------------------------
  | UNREAD COUNT
  |--------------------------------------------------------------------------
  */

  const unreadNotificationCount =
    useMemo(
      () =>
        notifications.filter(
          (item) =>
            !item.read
        ).length,
      [notifications]
    );

  /*
  |--------------------------------------------------------------------------
  | PUSH NOTIFICATION
  |--------------------------------------------------------------------------
  */

  const pushNotification =
    useCallback(
      ({
        type,
        title,
        message,
        productId = null
      }) => {
        const notification = {
          id:
            `${productId || "product"}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,

          type,

          title,

          message,

          productId,

          read: false,

          createdAt:
            new Date().toISOString()
        };

        setNotifications(
          (current) => {
            const next = [
              notification,
              ...current
            ].slice(0, 50);

            saveStoredNotifications(
              next
            );

            return next;
          }
        );

        setToast(
          notification
        );

        if (
          toastTimerRef.current
        ) {
          clearTimeout(
            toastTimerRef.current
          );
        }

        toastTimerRef.current =
          setTimeout(
            () => {
              setToast(null);
            },
            6000
          );
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | MARK NOTIFICATION READ
  |--------------------------------------------------------------------------
  */

  const markNotificationRead =
    useCallback(
      (id) => {
        setNotifications(
          (current) => {
            const next =
              current.map(
                (item) =>
                  item.id === id
                    ? {
                        ...item,
                        read: true
                      }
                    : item
              );

            saveStoredNotifications(
              next
            );

            return next;
          }
        );
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | MARK ALL READ
  |--------------------------------------------------------------------------
  */

  const markAllNotificationsRead =
    useCallback(
      () => {
        setNotifications(
          (current) => {
            const next =
              current.map(
                (item) => ({
                  ...item,
                  read: true
                })
              );

            saveStoredNotifications(
              next
            );

            return next;
          }
        );
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | CLEAR NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  const clearNotifications =
    useCallback(
      () => {
        setNotifications(
          []
        );

        saveStoredNotifications(
          []
        );
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | LOAD PRODUCTS
  |--------------------------------------------------------------------------
  */

  const loadProducts =
    useCallback(
      async (
        requestedPage = page,
        isRefresh = false
      ) => {
        try {
          if (
            isRefresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError("");

          const params =
            new URLSearchParams();

          params.set(
            "page",
            String(
              requestedPage
            )
          );

          params.set(
            "limit",
            "20"
          );

          if (
            statusFilter
          ) {
            params.set(
              "status",
              statusFilter
            );
          }

          const response =
            await request(
              `/api/products/seller/my-products?${params.toString()}`
            );

          const loadedProducts =
            Array.isArray(
              response.products
            )
              ? response.products
              : Array.isArray(
                  response.data
                )
              ? response.data
              : [];

          setProducts(
            loadedProducts
          );

          const nextPagination =
            response.pagination ||
            {
              page:
                requestedPage,

              limit: 20,

              total:
                loadedProducts.length,

              pages: 1
            };

          setPagination(
            nextPagination
          );

          setPage(
            Number(
              nextPagination.page ||
                requestedPage
            )
          );
        } catch (
          requestError
        ) {
          console.error(
            "Seller products loading error:",
            requestError
          );

          setError(
            requestError.message ||
              "Unable to load your products."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        page,
        statusFilter
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | KEEP LATEST LOAD FUNCTION IN REF
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadProductsRef.current =
      loadProducts;
  }, [loadProducts]);

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadProducts(
      1
    );
  }, []);

  /*
  |--------------------------------------------------------------------------
  | STATUS FILTER CHANGE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setPage(
      1
    );

    loadProducts(
      1
    );
  }, [
    statusFilter
  ]);

  /*
  |--------------------------------------------------------------------------
  | SELLER SOCKET.IO
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  | The socket effect intentionally does NOT depend on page or
  | loadProducts. This prevents unnecessary disconnect/reconnect cycles.
  |
  */
  useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) {
    console.warn(
      "SELLER SOCKET: No authentication token found."
    );
    return undefined;
  }

  let cancelled = false;

  const socket = io(SOCKET_URL, {
    auth: {
      token
    },

    transports: ["websocket", "polling"],

    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,

    timeout: 10000,

    autoConnect: true
  });

  const handleConnect = () => {
    if (cancelled) {
      return;
    }

    console.log(
      "SELLER PRODUCT SOCKET CONNECTED:",
      socket.id
    );
  };

  const handleSocketReady = (payload) => {
    if (cancelled) {
      return;
    }

    console.log(
      "SELLER PRODUCT SOCKET READY:",
      payload
    );
  };

  const handleProductStatusUpdated = (payload) => {
    if (cancelled || !payload) {
      return;
    }

    const productId = String(
      payload.productId ||
        payload.product?._id ||
        payload.product?.id ||
        ""
    ).trim();

    if (!productId) {
      return;
    }

    const eventKey = getSocketEventKey(payload);

    if (
      eventKey &&
      processedSocketEventsRef.current.has(eventKey)
    ) {
      return;
    }

    if (eventKey) {
      processedSocketEventsRef.current.add(
        eventKey
      );

      if (
        processedSocketEventsRef.current.size > 100
      ) {
        const firstKey =
          processedSocketEventsRef.current.values()
            .next().value;

        if (firstKey) {
          processedSocketEventsRef.current.delete(
            firstKey
          );
        }
      }
    }

    const incomingStatus = normalizeStatus(
      payload.status ||
        payload.product?.status ||
        ""
    );

    if (incomingStatus) {
      setProducts((currentProducts) =>
        currentProducts.map((product) => {
          const currentId = String(
            product?._id ||
              product?.id ||
              ""
          );

          if (currentId !== productId) {
            return product;
          }

          return {
            ...product,
            status: incomingStatus
          };
        })
      );
    }

    if (loadProductsRef.current) {
      loadProductsRef.current(
        pageRef.current,
        true
      );
    }
  };

  const handleConnectError = (error) => {
    if (cancelled) {
      return;
    }

    console.warn(
      "SELLER PRODUCT SOCKET CONNECTION ERROR:",
      error?.message || error
    );
  };

  const handleDisconnect = (reason) => {
    if (cancelled) {
      return;
    }

    console.log(
      "SELLER PRODUCT SOCKET DISCONNECTED:",
      reason
    );
  };

  const handleReconnect = (attempt) => {
    if (cancelled) {
      return;
    }

    console.log(
      "SELLER PRODUCT SOCKET RECONNECTED:",
      attempt
    );
  };

  socket.on(
    "connect",
    handleConnect
  );

  socket.on(
    "socket:ready",
    handleSocketReady
  );

  socket.on(
    "product:status-updated",
    handleProductStatusUpdated
  );

  socket.on(
    "connect_error",
    handleConnectError
  );

  socket.on(
    "disconnect",
    handleDisconnect
  );

  socket.io.on(
    "reconnect",
    handleReconnect
  );

  return () => {
    cancelled = true;

    socket.off(
      "connect",
      handleConnect
    );

    socket.off(
      "socket:ready",
      handleSocketReady
    );

    socket.off(
      "product:status-updated",
      handleProductStatusUpdated
    );

    socket.off(
      "connect_error",
      handleConnectError
    );

    socket.off(
      "disconnect",
      handleDisconnect
    );

    socket.io.off(
      "reconnect",
      handleReconnect
    );

    socket.disconnect();
  };
}, []);
  /*
  |--------------------------------------------------------------------------
  | TOAST CLEANUP
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      if (
        toastTimerRef.current
      ) {
        clearTimeout(
          toastTimerRef.current
        );
      }
    };
  }, []);

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
          setNotificationOpen(
            false
          );
        }
      };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | PRODUCT EVENTS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleProductEvent =
      () => {
        if (
          loadProductsRef.current
        ) {
          loadProductsRef.current(
            pageRef.current,
            true
          );
        }
      };

    window.addEventListener(
      "product-updated",
      handleProductEvent
    );

    window.addEventListener(
      "product-created",
      handleProductEvent
    );

    window.addEventListener(
      "product-deleted",
      handleProductEvent
    );

    window.addEventListener(
      "inventory-updated",
      handleProductEvent
    );

    return () => {
      window.removeEventListener(
        "product-updated",
        handleProductEvent
      );

      window.removeEventListener(
        "product-created",
        handleProductEvent
      );

      window.removeEventListener(
        "product-deleted",
        handleProductEvent
      );

      window.removeEventListener(
        "inventory-updated",
        handleProductEvent
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SEARCH
  |--------------------------------------------------------------------------
  */

  const filteredProducts =
    useMemo(
      () => {
        const searchText =
          search
            .trim()
            .toLowerCase();

        if (!searchText) {
          return products;
        }

        return products.filter(
          (product) => {
            return (
              product?.name
                ?.toLowerCase()
                .includes(
                  searchText
                ) ||

              product?.category
                ?.toLowerCase()
                .includes(
                  searchText
                ) ||

              product?.unit
                ?.toLowerCase()
                .includes(
                  searchText
                )
            );
          }
        );
      },
      [
        products,
        search
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | DELETE PRODUCT
  |--------------------------------------------------------------------------
  */

  const handleDelete =
    async (
      product
    ) => {
      const confirmed =
        window.confirm(
          `Are you sure you want to delete "${product.name}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(
          product._id
        );

        setError("");

        await request(
          `/api/products/${product._id}`,
          {
            method:
              "DELETE"
          }
        );

        await loadProducts(
          page,
          true
        );
      } catch (
        deleteError
      ) {
        console.error(
          "Delete product error:",
          deleteError
        );

        setError(
          deleteError.message ||
            "Unable to delete product."
        );
      } finally {
        setDeletingId(
          ""
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | START STOCK EDIT
  |--------------------------------------------------------------------------
  */

  const startStockEdit =
    (
      product
    ) => {
      setStockEditingId(
        product._id
      );

      setStockValue(
        String(
          Number(
            product.stockQuantity ||
              0
          )
        )
      );
    };

  /*
  |--------------------------------------------------------------------------
  | CANCEL STOCK EDIT
  |--------------------------------------------------------------------------
  */

  const cancelStockEdit =
    () => {
      setStockEditingId(
        ""
      );

      setStockValue(
        ""
      );
    };

  /*
  |--------------------------------------------------------------------------
  | SAVE STOCK
  |--------------------------------------------------------------------------
  */

  const saveStock =
    async (
      product
    ) => {
      const numericStock =
        Number(
          stockValue
        );

      if (
        !Number.isFinite(
          numericStock
        ) ||
        numericStock < 0
      ) {
        setError(
          "Stock quantity must be a valid non-negative number."
        );

        return;
      }

      try {
        setError("");

        await request(
          `/api/products/${product._id}/stock`,
          {
            method:
              "PATCH",

            body:
              JSON.stringify({
                stockQuantity:
                  numericStock
              })
          }
        );

        cancelStockEdit();

        await loadProducts(
          page,
          true
        );
      } catch (
        stockError
      ) {
        console.error(
          "Stock update error:",
          stockError
        );

        setError(
          stockError.message ||
            "Unable to update stock."
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CHANGE PAGE
  |--------------------------------------------------------------------------
  */

  const changePage =
    (
      nextPage
    ) => {
      const totalPages =
        Number(
          pagination.pages ||
            1
        );

      if (
        nextPage < 1 ||
        nextPage >
          totalPages
      ) {
        return;
      }

      setPage(
        nextPage
      );

      pageRef.current =
        nextPage;

      loadProducts(
        nextPage
      );
    };

  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-[#f5f8f7] text-slate-900">

      {/* ================================================================ */}
      {/* NOTIFICATION BELL                                                */}
      {/* ================================================================ */}

      <div
        ref={
          notificationRef
        }
        className="fixed right-5 top-5 z-[90]"
      >

        <button
          type="button"
          onClick={() =>
            setNotificationOpen(
              (value) =>
                !value
            )
          }
          className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg shadow-lg transition hover:bg-emerald-50"
          aria-label="Product notifications"
        >

          🔔

          {unreadNotificationCount >
            0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
              {unreadNotificationCount >
              99
                ? "99+"
                : unreadNotificationCount}
            </span>
          )}

        </button>

        {/* ============================================================ */}
        {/* NOTIFICATION PANEL                                             */}
        {/* ============================================================ */}

        {notificationOpen && (
          <div className="absolute right-0 top-14 w-[min(94vw,420px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_25px_90px_rgba(15,23,42,.2)]">

            <div className="bg-slate-950 px-5 py-4 text-white">

              <p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">
                Live marketplace
              </p>

              <h3 className="mt-1 text-base font-black">
                Product Notifications
              </h3>

              <p className="mt-1 text-[10px] text-slate-400">
                Approvals, rejections, stock and product status changes.
              </p>

            </div>

            <div className="flex justify-between border-b border-slate-100 px-5 py-3">

              <button
                type="button"
                onClick={
                  markAllNotificationsRead
                }
                disabled={
                  unreadNotificationCount ===
                  0
                }
                className="text-[10px] font-black text-emerald-700 disabled:opacity-40"
              >
                Mark all read
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
                className="text-[10px] font-black text-slate-400 hover:text-red-600 disabled:opacity-40"
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
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border text-sm font-black ${getNotificationClasses(
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
                            {
                              item.title
                            }
                          </span>

                          {!item.read && (
                            <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                          )}

                        </span>

                        <span className="mt-1 block text-[11px] leading-5 text-slate-500">
                          {
                            item.message
                          }
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

      {/* ================================================================ */}
      {/* TOAST                                                             */}
      {/* ================================================================ */}

      {toast && (
        <div
          className="fixed right-5 top-20 z-[100] w-[min(92vw,430px)] rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl"
          role="status"
        >

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              ✓
            </div>

            <div>

              <p className="text-xs font-black text-slate-900">
                {
                  toast.title
                }
              </p>

              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                {
                  toast.message
                }
              </p>

            </div>

          </div>

        </div>
      )}

      {/* ================================================================ */}
      {/* SIDEBAR                                                           */}
      {/* ================================================================ */}

      <SellerSidebar />

      {/* ================================================================ */}
      {/* MAIN                                                              */}
      {/* ================================================================ */}

      <main className="lg:ml-72">

        <div className="mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

          {/* ============================================================ */}
          {/* HEADER                                                        */}
          {/* ============================================================ */}

          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                Inventory Management
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                My Products
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Manage your vegetables, inventory and product status.
              </p>

            </div>

            <div className="flex flex-wrap gap-3">

              <button
                type="button"
                onClick={() =>
                  loadProducts(
                    page,
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing
                  ? "Refreshing..."
                  : "↻ Refresh"}
              </button>

              <Link
                to="/seller/products/add"
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                + Add Product
              </Link>

            </div>

          </div>

          {/* ============================================================ */}
          {/* ERROR                                                          */}
          {/* ============================================================ */}

          {error && (
            <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

              <div>

                <p className="font-black">
                  Product operation failed
                </p>

                <p className="mt-1">
                  {error}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                className="font-black text-red-600 hover:text-red-800"
              >
                ×
              </button>

            </div>
          )}

          {/* ============================================================ */}
          {/* FILTER BAR                                                     */}
          {/* ============================================================ */}

          <div className="mb-6 rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-[0_15px_50px_rgba(15,23,42,0.05)]">

            <div className="grid gap-4 md:grid-cols-[1fr_220px]">

              <div>

                <label
                  htmlFor="seller-product-search"
                  className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500"
                >
                  Search products
                </label>

                <input
                  id="seller-product-search"
                  type="text"
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search by vegetable, category or unit..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

              </div>

              <div>

                <label
                  htmlFor="status-filter"
                  className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500"
                >
                  Status
                </label>

                <select
                  id="status-filter"
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) => {
                    setStatusFilter(
                      event.target.value
                    );

                    setPage(
                      1
                    );
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                >

                  <option value="">
                    All Products
                  </option>

                  <option value="pending">
                    Pending Approval
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

              </div>

            </div>

          </div>

          {/* ============================================================ */}
          {/* SUMMARY                                                        */}
          {/* ============================================================ */}

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">

              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Total Products
              </p>

              <p className="mt-2 text-2xl font-black text-slate-950">
                {
                  pagination.total ||
                  0
                }
              </p>

            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">

              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Showing
              </p>

              <p className="mt-2 text-2xl font-black text-emerald-600">
                {
                  filteredProducts.length
                }
              </p>

            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">

              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Current Page
              </p>

              <p className="mt-2 text-2xl font-black text-slate-950">
                {
                  pagination.page ||
                  1
                }
              </p>

            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">

              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Total Pages
              </p>

              <p className="mt-2 text-2xl font-black text-slate-950">
                {
                  pagination.pages ||
                  1
                }
              </p>

            </div>

          </div>

          {/* ============================================================ */}
          {/* PRODUCTS                                                        */}
          {/* ============================================================ */}

          <div className="overflow-hidden rounded-[30px] border border-slate-200/70 bg-white shadow-[0_15px_50px_rgba(15,23,42,0.05)]">

            {loading ? (
              <div className="flex min-h-[360px] items-center justify-center">

                <div className="text-center">

                  <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

                  <p className="text-sm font-semibold text-slate-500">
                    Loading your products...
                  </p>

                </div>

              </div>
            ) : filteredProducts.length ===
              0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">

                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
                  🥕
                </div>

                <h2 className="text-lg font-black text-slate-950">
                  No products found
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  You do not have any products matching the current search or status filter.
                </p>

                <Link
                  to="/seller/products/add"
                  className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  Add Your First Product
                </Link>

              </div>
            ) : (
              <>

                {/* ====================================================== */}
                {/* DESKTOP TABLE                                            */}
                {/* ====================================================== */}

                <div className="hidden overflow-x-auto lg:block">

                  <table className="min-w-full">

                    <thead className="bg-slate-50">

                      <tr>

                        <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                          Product
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                          Category
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                          Price
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                          Stock
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                          Status
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                          Harvest Date
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                          Actions
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {filteredProducts.map(
                        (product) => {
                          const isEditingStock =
                            stockEditingId ===
                            product._id;

                          const stock =
                            Number(
                              product.stockQuantity ||
                                0
                            );

                          const threshold =
                            Number(
                              product.lowStockThreshold ||
                                0
                            );

                          return (
                            <tr
                              key={
                                product._id
                              }
                              className="transition hover:bg-slate-50/70"
                            >

                              {/* PRODUCT */}

                              <td className="px-5 py-5">

                                <div className="flex items-center gap-3">

                                  <ProductImage
                                    product={
                                      product
                                    }
                                  />

                                  <div className="min-w-0">

                                    <p className="truncate font-black text-slate-900">
                                      {
                                        product.name
                                      }
                                    </p>

                                    <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                                      {
                                        product.description ||
                                        "No description"
                                      }
                                    </p>

                                    {product.isOrganic && (
                                      <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                                        Organic
                                      </span>
                                    )}

                                  </div>

                                </div>

                              </td>

                              {/* CATEGORY */}

                              <td className="px-5 py-5 text-sm font-semibold text-slate-700">
                                {
                                  product.category ||
                                  "—"
                                }
                              </td>

                              {/* PRICE */}

                              <td className="px-5 py-5">

                                <p className="font-black text-slate-900">
                                  ₹
                                  {Number(
                                    product.price ||
                                      0
                                  ).toFixed(
                                    2
                                  )}
                                </p>

                                <p className="text-xs text-slate-400">
                                  /
                                  {
                                    product.unit ||
                                    "unit"
                                  }
                                </p>

                              </td>

                              {/* STOCK */}

                              <td className="px-5 py-5">

                                {isEditingStock ? (
                                  <div className="flex flex-wrap items-center gap-2">

                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={
                                        stockValue
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setStockValue(
                                          event.target.value
                                        )
                                      }
                                      className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        saveStock(
                                          product
                                        )
                                      }
                                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                                    >
                                      Save
                                    </button>

                                    <button
                                      type="button"
                                      onClick={
                                        cancelStockEdit
                                      }
                                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                      Cancel
                                    </button>

                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      startStockEdit(
                                        product
                                      )
                                    }
                                    className="text-left"
                                    title="Click to edit stock"
                                  >

                                    <span className="font-black text-slate-900">
                                      {
                                        stock
                                      }
                                    </span>

                                    <span className="ml-1 text-xs text-slate-400">
                                      {
                                        product.unit ||
                                        "unit"
                                      }
                                    </span>

                                    {threshold >
                                      0 &&
                                      stock <=
                                        threshold &&
                                      stock >
                                        0 && (
                                        <span className="ml-2 rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-black text-yellow-700">
                                          Low
                                        </span>
                                      )}

                                  </button>
                                )}

                              </td>

                              {/* STATUS */}

                              <td className="px-5 py-5">

                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getStatusClasses(
                                    product.status
                                  )}`}
                                >
                                  {
                                    getStatusLabel(
                                      product.status
                                    )
                                  }
                                </span>

                              </td>

                              {/* HARVEST DATE */}

                              <td className="px-5 py-5 text-sm font-semibold text-slate-600">
                                {
                                  formatDate(
                                    product.harvestDate
                                  )
                                }
                              </td>

                              {/* ACTIONS */}

                              <td className="px-5 py-5">

                                <div className="flex justify-end gap-2">

                                  <Link
                                    to={`/seller/products/edit/${product._id}`}
                                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                  >
                                    Edit
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDelete(
                                        product
                                      )
                                    }
                                    disabled={
                                      deletingId ===
                                      product._id
                                    }
                                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {deletingId ===
                                    product._id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </button>

                                </div>

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

                {/* ====================================================== */}
                {/* MOBILE CARDS                                            */}
                {/* ====================================================== */}

                <div className="grid gap-4 p-4 lg:hidden">

                  {filteredProducts.map(
                    (product) => {
                      const isEditingStock =
                        stockEditingId ===
                        product._id;

                      return (
                        <div
                          key={
                            product._id
                          }
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >

                          {/* HEADER */}

                          <div className="flex gap-4">

                            <ProductImage
                              product={
                                product
                              }
                            />

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-3">

                                <div>

                                  <h3 className="font-black text-slate-900">
                                    {
                                      product.name
                                    }
                                  </h3>

                                  <p className="mt-1 text-sm text-slate-500">
                                    {
                                      product.category ||
                                      "—"
                                    }
                                  </p>

                                </div>

                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${getStatusClasses(
                                    product.status
                                  )}`}
                                >
                                  {
                                    getStatusLabel(
                                      product.status
                                    )
                                  }
                                </span>

                              </div>

                              {product.isOrganic && (
                                <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700">
                                  Organic
                                </span>
                              )}

                            </div>

                          </div>

                          {/* DETAILS */}

                          <div className="mt-4 grid grid-cols-2 gap-3">

                            <div className="rounded-xl bg-slate-50 p-3">

                              <p className="text-xs text-slate-400">
                                Price
                              </p>

                              <p className="mt-1 font-black text-slate-900">

                                ₹
                                {Number(
                                  product.price ||
                                    0
                                ).toFixed(
                                  2
                                )}

                                <span className="ml-1 text-xs font-normal text-slate-400">
                                  /
                                  {
                                    product.unit ||
                                    "unit"
                                  }
                                </span>

                              </p>

                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">

                              <p className="text-xs text-slate-400">
                                Harvest Date
                              </p>

                              <p className="mt-1 font-black text-slate-900">
                                {
                                  formatDate(
                                    product.harvestDate
                                  )
                                }
                              </p>

                            </div>

                          </div>

                          {/* STOCK */}

                          <div className="mt-3 rounded-xl bg-slate-50 p-3">

                            <div className="flex items-center justify-between gap-3">

                              <div>

                                <p className="text-xs text-slate-400">
                                  Stock
                                </p>

                                {!isEditingStock && (
                                  <p className="mt-1 font-black text-slate-900">
                                    {
                                      Number(
                                        product.stockQuantity ||
                                          0
                                      )
                                    }{" "}
                                    {
                                      product.unit ||
                                      "unit"
                                    }
                                  </p>
                                )}

                              </div>

                              {!isEditingStock && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    startStockEdit(
                                      product
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  Update Stock
                                </button>
                              )}

                            </div>

                            {isEditingStock && (
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row">

                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={
                                    stockValue
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setStockValue(
                                      event.target.value
                                    )
                                  }
                                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    saveStock(
                                      product
                                    )
                                  }
                                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                                >
                                  Save
                                </button>

                                <button
                                  type="button"
                                  onClick={
                                    cancelStockEdit
                                  }
                                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>

                              </div>
                            )}

                          </div>

                          {/* ACTIONS */}

                          <div className="mt-4 flex gap-2">

                            <Link
                              to={`/seller/products/edit/${product._id}`}
                              className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-center text-xs font-bold text-blue-700 hover:bg-blue-100"
                            >
                              Edit
                            </Link>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  product
                                )
                              }
                              disabled={
                                deletingId ===
                                product._id
                              }
                              className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId ===
                              product._id
                                ? "Deleting..."
                                : "Delete"}
                            </button>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </>
            )}

          </div>

          {/* ============================================================ */}
          {/* PAGINATION                                                     */}
          {/* ============================================================ */}

          {!loading &&
            Number(
              pagination.pages
            ) > 1 && (
              <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:flex-row">

                <p className="text-sm text-slate-500">

                  Page{" "}

                  <span className="font-black text-slate-900">
                    {
                      pagination.page
                    }
                  </span>

                  {" "}of{" "}

                  <span className="font-black text-slate-900">
                    {
                      pagination.pages
                    }
                  </span>

                </p>

                <div className="flex items-center gap-2">

                  <button
                    type="button"
                    disabled={
                      Number(
                        pagination.page
                      ) <= 1
                    }
                    onClick={() =>
                      changePage(
                        Number(
                          pagination.page
                        ) - 1
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={
                      Number(
                        pagination.page
                      ) >=
                      Number(
                        pagination.pages
                      )
                    }
                    onClick={() =>
                      changePage(
                        Number(
                          pagination.page
                        ) + 1
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>

                </div>

              </div>
            )}

        </div>

      </main>

    </div>
  );
}