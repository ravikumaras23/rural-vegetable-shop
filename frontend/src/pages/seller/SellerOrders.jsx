import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link
} from "react-router-dom";

import SellerSidebar from "../../components/seller/SellerSidebar.jsx";
import SellerHeader from "../../components/seller/SellerHeader.jsx";
import SellerStatusBadge from "../../components/seller/SellerStatusBadge.jsx";

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
| CONSTANTS
|--------------------------------------------------------------------------
*/

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned"
];

/*
|--------------------------------------------------------------------------
| API REQUEST
|--------------------------------------------------------------------------
*/

async function apiRequest(
  endpoint,
  options = {}
) {
  const token =
    localStorage.getItem(
      "token"
    );

  if (!token) {
    throw new Error(
      "Seller login session not found. Please login again."
    );
  }

  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,

        headers: {
          ...(options.body instanceof
          FormData
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

    error.code =
      data.code;

    error.status =
      response.status;

    throw error;
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| NORMALIZE STATUS
|--------------------------------------------------------------------------
*/

function normalizeStatus(
  value
) {
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

function formatStatus(
  value
) {
  return String(
    value || "Unknown"
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

/*
|--------------------------------------------------------------------------
| INDIA DATE KEY
|--------------------------------------------------------------------------
*/

function getIndiaDateKey(
  date = new Date()
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Asia/Kolkata",

      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit"
    }
  ).format(date);
}

/*
|--------------------------------------------------------------------------
| HARVEST DATE KEY
|--------------------------------------------------------------------------
*/

function getHarvestDateKey(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return getIndiaDateKey(
    date
  );
}

/*
|--------------------------------------------------------------------------
| FORMAT HARVEST DATE
|--------------------------------------------------------------------------
*/

function formatHarvestDate(
  value
) {
  const key =
    getHarvestDateKey(
      value
    );

  if (!key) {
    return "Not specified";
  }

  const [
    year,
    month,
    day
  ] =
    key
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric"
    }
  );
}

/*
|--------------------------------------------------------------------------
| GET FUTURE HARVEST PRODUCTS
|--------------------------------------------------------------------------
*/

function getFutureHarvestProducts(
  order
) {
  const today =
    getIndiaDateKey();

  const items =
    Array.isArray(
      order?.items
    )
      ? order.items
      : [];

  return items.filter(
    (item) => {
      const harvestDate =
        item?.product
          ?.harvestDate;

      const harvestKey =
        getHarvestDateKey(
          harvestDate
        );

      return (
        harvestKey &&
        harvestKey >
          today
      );
    }
  );
}

/*
|--------------------------------------------------------------------------
| CAN PACK ORDER
|--------------------------------------------------------------------------
*/

function canPackOrder(
  order
) {
  return (
    getFutureHarvestProducts(
      order
    ).length === 0
  );
}

/*
|--------------------------------------------------------------------------
| STATUS ORDER
|--------------------------------------------------------------------------
*/

function getStatusOptions(
  order
) {
  const current =
    normalizeStatus(
      order?.orderStatus
    );

  const harvestBlocked =
    !canPackOrder(
      order
    );

  switch (
    current
  ) {
    case "pending":
      return [
        {
          value:
            "confirmed",

          label:
            "Confirm Order",

          icon:
            "✓",

          disabled:
            false
        }
      ];

    case "confirmed":
      return [
        {
          value:
            "processing",

          label:
            "Start Processing",

          icon:
            "↗",

          disabled:
            false
        }
      ];

    case "processing":
      return [
        {
          value:
            "packed",

          label:
            harvestBlocked
              ? "Pack — Waiting for Harvest"
              : "Mark as Packed",

          icon:
            harvestBlocked
              ? "🔒"
              : "📦",

          disabled:
            harvestBlocked
        }
      ];

    case "packed":
      return [
        {
          value:
            "out_for_delivery",

          label:
            "Out for Delivery",

          icon:
            "🚚",

          disabled:
            false
        }
      ];

    case "out_for_delivery":
      return [
        {
          value:
            "delivered",

          label:
            "Mark Delivered",

          icon:
            "✓",

          disabled:
            false
        }
      ];

    default:
      return [];
  }
}

/*
|--------------------------------------------------------------------------
| ITEM TOTAL
|--------------------------------------------------------------------------
*/

function getSellerItemTotal(
  order
) {
  const items =
    Array.isArray(
      order?.items
    )
      ? order.items
      : [];

  return items.reduce(
    (
      total,
      item
    ) => {
      const subtotal =
        Number(
          item?.subtotal
        );

      if (
        Number.isFinite(
          subtotal
        )
      ) {
        return (
          total +
          subtotal
        );
      }

      const quantity =
        Number(
          item?.quantity ||
            0
        );

      const price =
        Number(
          item?.priceAtPurchase ||
            item?.price ||
            item?.unitPrice ||
            0
        );

      return (
        total +
        quantity *
          price
      );
    },
    0
  );
}

/*
|--------------------------------------------------------------------------
| CURRENT SELLER ID
|--------------------------------------------------------------------------
*/

function getCurrentSellerId() {
  try {
    const user = JSON.parse(
      localStorage.getItem("user") ||
        "null"
    );

    return String(
      user?._id ||
        user?.id ||
        ""
    ).trim();
  } catch {
    return "";
  }
}

/*
|--------------------------------------------------------------------------
| GET SELLER PAYMENT RECORD
|--------------------------------------------------------------------------
*/

function getSellerPayment(
  order,
  sellerId = getCurrentSellerId()
) {
  const payments =
    Array.isArray(order?.sellerPayments)
      ? order.sellerPayments
      : [];

  if (payments.length === 0) {
    return null;
  }

  if (!sellerId) {
    return payments[0] || null;
  }

  return (
    payments.find((payment) => {
      const paymentSeller =
        payment?.seller;

      const paymentSellerId =
        typeof paymentSeller ===
        "object"
          ? paymentSeller?._id
          : paymentSeller;

      return (
        paymentSellerId &&
        String(paymentSellerId) ===
          sellerId
      );
    }) || null
  );
}

/*
|--------------------------------------------------------------------------
| SEARCH ALL ORDER DATA
|--------------------------------------------------------------------------
*/

function collectSearchableValues(
  value,
  parts = [],
  depth = 0,
  keyName = ""
) {
  if (
    depth > 6 ||
    value == null
  ) {
    return parts;
  }

  const normalizedKey =
    String(keyName || "")
      .toLowerCase();

  if (
    normalizedKey.includes("password") ||
    normalizedKey.includes("secret") ||
    normalizedKey.includes("token") ||
    normalizedKey === "url" ||
    normalizedKey.includes("publicid")
  ) {
    return parts;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    parts.push(String(value));
    return parts;
  }

  if (value instanceof Date) {
    parts.push(value.toISOString());
    return parts;
  }

  if (Array.isArray(value)) {
    value.forEach((item) =>
      collectSearchableValues(
        item,
        parts,
        depth + 1,
        keyName
      )
    );
    return parts;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(
      ([key, child]) =>
        collectSearchableValues(
          child,
          parts,
          depth + 1,
          key
        )
    );
  }

  return parts;
}

function getOrderSearchText(
  order
) {
  return collectSearchableValues(
    order,
    []
  )
    .join(" ")
    .toLowerCase();
}

function matchesDateRange(
  order,
  dateFrom,
  dateTo
) {
  if (!dateFrom && !dateTo) {
    return true;
  }

  const orderDate =
    getIndiaDateKey(
      order?.createdAt
        ? new Date(order.createdAt)
        : new Date(0)
    );

  if (
    dateFrom &&
    orderDate < dateFrom
  ) {
    return false;
  }

  if (
    dateTo &&
    orderDate > dateTo
  ) {
    return false;
  }

  return true;
}

function matchesMoneyRange(
  value,
  minAmount,
  maxAmount
) {
  const amount =
    Number(value) || 0;

  if (
    minAmount !== "" &&
    amount < Number(minAmount)
  ) {
    return false;
  }

  if (
    maxAmount !== "" &&
    amount > Number(maxAmount)
  ) {
    return false;
  }

  return true;
}

function getEffectivePaymentStatus(
  order
) {
  const method =
    normalizeStatus(
      order?.paymentMethod
    );

  if (method === "seller_qr") {
    return normalizeStatus(
      getSellerPayment(order)?.status ||
        order?.paymentStatus
    );
  }

  return normalizeStatus(
    order?.paymentStatus
  );
}

/*
|--------------------------------------------------------------------------
| CAN DELETE PENDING-PAYMENT ORDER
|--------------------------------------------------------------------------
|
| Sellers may permanently remove an order only when:
| - order status is still pending
| - payment is still pending
| - the seller has not submitted/verified a payment
|
| This keeps paid, submitted, processing and delivered orders protected.
|--------------------------------------------------------------------------
*/

function canDeletePendingPaymentOrder(
  order
) {
  const orderStatus =
    normalizeStatus(
      order?.orderStatus
    );

  if (
    orderStatus !== "pending"
  ) {
    return false;
  }

  const paymentMethod =
    normalizeStatus(
      order?.paymentMethod
    );

  const effectivePaymentStatus =
    getEffectivePaymentStatus(
      order
    );

  if (
    effectivePaymentStatus !==
    "pending"
  ) {
    return false;
  }

  if (
    paymentMethod === "seller_qr"
  ) {
    const sellerPayment =
      getSellerPayment(order);

    if (!sellerPayment) {
      return false;
    }

    const sellerPaymentStatus =
      normalizeStatus(
        sellerPayment.status
      );

    return (
      sellerPaymentStatus ===
      "pending"
    );
  }

  return (
    paymentMethod ===
      "razorpay" ||
    paymentMethod ===
      "cod"
  );
}

function matchesHarvestFilter(
  order,
  harvestFilter
) {
  if (harvestFilter === "all") {
    return true;
  }

  const future =
    getFutureHarvestProducts(order);

  if (harvestFilter === "upcoming") {
    return future.length > 0;
  }

  if (harvestFilter === "today") {
    const today =
      getIndiaDateKey();

    return getSellerItems(order).some(
      (item) =>
        getHarvestDateKey(
          item?.product?.harvestDate
        ) === today
    );
  }

  if (harvestFilter === "ready") {
    return future.length === 0;
  }

  return true;
}

function getPaymentChannelLabel(
  method
) {
  switch (
    normalizeStatus(method)
  ) {
    case "seller_qr":
      return "Seller QR / UPI";

    case "razorpay":
      return "UPI / Online";

    case "cod":
      return "Cash / COD";

    default:
      return formatStatus(
        method ||
          "Not specified"
      );
  }
}

function calculateFilteredCollectedSales(
  orders
) {
  const result = {
    sellerQr: 0,
    upi: 0,
    cod: 0
  };

  orders.forEach((order) => {
    if (
      normalizeStatus(
        order?.orderStatus
      ) !== "delivered"
    ) {
      return;
    }

    const method =
      normalizeStatus(
        order?.paymentMethod
      );

    const sellerValue =
      getSellerItemTotal(order);

    if (method === "seller_qr") {
      const payment =
        getSellerPayment(order);

      if (
        normalizeStatus(
          payment?.status
        ) === "paid"
      ) {
        result.sellerQr +=
          Number(payment?.amount) ||
          sellerValue;
      }

      return;
    }

    if (method === "razorpay") {
      if (
        normalizeStatus(
          order?.paymentStatus
        ) === "paid"
      ) {
        result.upi += sellerValue;
      }

      return;
    }

    if (method === "cod") {
      result.cod += sellerValue;
    }
  });

  return result;
}

function countActiveFilters({
  search,
  statusFilter,
  paymentMethodFilter,
  paymentStatusFilter,
  harvestFilter,
  utrFilter,
  dateFrom,
  dateTo,
  minAmount,
  maxAmount,
  sortOption
}) {
  let count = 0;

  if (search.trim()) count += 1;
  if (statusFilter !== "all") count += 1;
  if (paymentMethodFilter !== "all") count += 1;
  if (paymentStatusFilter !== "all") count += 1;
  if (harvestFilter !== "all") count += 1;
  if (utrFilter !== "all") count += 1;
  if (dateFrom) count += 1;
  if (dateTo) count += 1;
  if (minAmount !== "") count += 1;
  if (maxAmount !== "") count += 1;
  if (sortOption !== "latest") count += 1;

  return count;
}

/*
|--------------------------------------------------------------------------
| MONEY FORMAT
|--------------------------------------------------------------------------
*/

function formatMoney(
  value
) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2
    }
  );
}

/*
|--------------------------------------------------------------------------
| SELLER ORDERS
|--------------------------------------------------------------------------
*/

export default function SellerOrders() {
  const [
    orders,
    setOrders
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
    updatingOrderId,
    setUpdatingOrderId
  ] = useState("");

  const [
    search,
    setSearch
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter
  ] = useState(
    "all"
  );

  const [
    paymentMethodFilter,
    setPaymentMethodFilter
  ] = useState("all");

  const [
    paymentStatusFilter,
    setPaymentStatusFilter
  ] = useState("all");

  const [
    harvestFilter,
    setHarvestFilter
  ] = useState("all");

  const [
    utrFilter,
    setUtrFilter
  ] = useState("all");

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  const [minAmount, setMinAmount] =
    useState("");

  const [maxAmount, setMaxAmount] =
    useState("");

  const [sortOption, setSortOption] =
    useState("latest");

  const [deletingOrderId, setDeletingOrderId] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD ORDERS
  |--------------------------------------------------------------------------
  */

  const loadOrders =
    useCallback(
      async (
        background = false
      ) => {
        try {
          if (
            background
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

          const response =
            await apiRequest(
              "/api/order-management/seller?limit=100"
            );

          const loadedOrders =
            Array.isArray(
              response.data
            )
              ? response.data
              : Array.isArray(
                  response.orders
                )
              ? response.orders
              : [];

          setOrders(
            loadedOrders
          );
        } catch (
          err
        ) {
          console.error(
            "Seller order loading error:",
            err
          );

          setError(
            err.message ||
              "Unable to load seller orders."
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
      []
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
  | AUTO REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const interval =
      setInterval(
        () => {
          loadOrders(
            true
          );
        },
        10000
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    loadOrders
  ]);

  /*
  |--------------------------------------------------------------------------
  | UPDATE STATUS
  |--------------------------------------------------------------------------
  */

  const updateStatus =
    async (
      order,
      nextStatus
    ) => {
      if (!order) {
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | HARVEST PROTECTION
      |--------------------------------------------------------------------------
      */

      if (
        nextStatus ===
          "packed" &&
        !canPackOrder(
          order
        )
      ) {
        const blockedProducts =
          getFutureHarvestProducts(
            order
          );

        const productNames =
          blockedProducts
            .map(
              (
                item
              ) =>
                item?.productName ||
                item?.product
                  ?.name ||
                "Product"
            )
            .join(
              ", "
            );

        window.alert(
          `Packing is not available yet.\n\n${productNames}\n\nThe harvest date has not been reached.`
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | DELIVERY CONFIRMATION
      |--------------------------------------------------------------------------
      */

      if (
        nextStatus ===
        "delivered"
      ) {
        const confirmed =
          window.confirm(
            "Confirm that this order has been delivered to the customer?"
          );

        if (
          !confirmed
        ) {
          return;
        }
      }

      try {
        setUpdatingOrderId(
          order._id
        );

        setError("");

        await apiRequest(
          `/api/order-management/seller/${order._id}/status`,
          {
            method:
              "PATCH",

            body:
              JSON.stringify(
                {
                  status:
                    nextStatus
                }
              )
          }
        );

        await loadOrders(
          true
        );
      } catch (
        err
      ) {
        console.error(
          "Seller order status update error:",
          err
        );

        if (
          err.code ===
          "HARVEST_NOT_READY"
        ) {
          window.alert(
            err.message
          );
        } else {
          setError(
            err.message ||
              "Unable to update order status."
          );
        }

        await loadOrders(
          true
        );
      } finally {
        setUpdatingOrderId(
          ""
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | DELETE SELLER ORDER
  |--------------------------------------------------------------------------
  */

  const deleteOrder =
    async (order) => {
      if (!order?._id) return;

      if (
        !canDeletePendingPaymentOrder(
          order
        )
      ) {
        window.alert(
          "Only orders that are still pending payment can be deleted."
        );
        return;
      }

      const paymentMethod =
        normalizeStatus(
          order?.paymentMethod
        );

      const paymentLabel =
        getPaymentChannelLabel(
          paymentMethod
        );

      const confirmed =
        window.confirm(
          `Delete pending-payment order ${
            order.orderNumber ||
            order._id
          }?\n\nPayment method: ${paymentLabel}\nAmount: ₹${formatMoney(
            getSellerItemTotal(order)
          )}\n\nThe pending inventory reservation will be released.\nThis order record will be permanently deleted.`
        );

      if (!confirmed) return;

      try {
        setDeletingOrderId(
          order._id
        );
        setError("");

        await apiRequest(
          `/api/order-management/seller/${order._id}`,
          {
            method: "DELETE"
          }
        );

        setOrders((current) =>
          current.filter(
            (item) =>
              String(item._id) !==
              String(order._id)
          )
        );
      } catch (err) {
        console.error(
          "Seller pending-payment order delete error:",
          err
        );

        setError(
          err.message ||
            "Unable to delete pending-payment order."
        );
      } finally {
        setDeletingOrderId("");
      }
    };

  /*
  |--------------------------------------------------------------------------
  | FILTERED ORDERS
  |--------------------------------------------------------------------------
  */

  const filteredOrders =
    useMemo(
      () => {
        const normalizedSearch =
          search
            .trim()
            .toLowerCase();

        const nextOrders =
          orders.filter(
            (order) => {
              const status =
                normalizeStatus(
                  order?.orderStatus
                );

              const paymentMethod =
                normalizeStatus(
                  order?.paymentMethod
                );

              const paymentStatus =
                getEffectivePaymentStatus(
                  order
                );

              const sellerPayment =
                getSellerPayment(order);

              const sellerValue =
                getSellerItemTotal(order);

              if (
                statusFilter !== "all" &&
                status !== statusFilter
              ) {
                return false;
              }

              if (
                paymentMethodFilter !== "all" &&
                paymentMethod !== paymentMethodFilter
              ) {
                return false;
              }

              if (
                paymentStatusFilter !== "all" &&
                paymentStatus !== paymentStatusFilter
              ) {
                return false;
              }

              if (
                !matchesHarvestFilter(
                  order,
                  harvestFilter
                )
              ) {
                return false;
              }

              if (utrFilter !== "all") {
                const hasTransaction =
                  Boolean(
                    String(
                      sellerPayment?.transactionReference ||
                        order?.transactionReference ||
                        order?.utr ||
                        order?.razorpay?.paymentId ||
                        ""
                    ).trim()
                  );

                if (
                  utrFilter === "with_utr" &&
                  !hasTransaction
                ) {
                  return false;
                }

                if (
                  utrFilter === "without_utr" &&
                  hasTransaction
                ) {
                  return false;
                }
              }

              if (
                !matchesDateRange(
                  order,
                  dateFrom,
                  dateTo
                )
              ) {
                return false;
              }

              if (
                !matchesMoneyRange(
                  sellerValue,
                  minAmount,
                  maxAmount
                )
              ) {
                return false;
              }

              if (!normalizedSearch) {
                return true;
              }

              return getOrderSearchText(
                order
              ).includes(
                normalizedSearch
              );
            }
          );

        nextOrders.sort(
          (a, b) => {
            if (sortOption === "oldest") {
              return (
                new Date(a?.createdAt || 0) -
                new Date(b?.createdAt || 0)
              );
            }

            if (
              sortOption ===
              "highest_value"
            ) {
              return (
                getSellerItemTotal(b) -
                getSellerItemTotal(a)
              );
            }

            if (
              sortOption ===
              "lowest_value"
            ) {
              return (
                getSellerItemTotal(a) -
                getSellerItemTotal(b)
              );
            }

            if (sortOption === "status") {
              return formatStatus(
                a?.orderStatus
              ).localeCompare(
                formatStatus(
                  b?.orderStatus
                )
              );
            }

            return (
              new Date(b?.createdAt || 0) -
              new Date(a?.createdAt || 0)
            );
          }
        );

        return nextOrders;
      },
      [
        orders,
        search,
        statusFilter,
        paymentMethodFilter,
        paymentStatusFilter,
        harvestFilter,
        utrFilter,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        sortOption
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | SUMMARY
  |--------------------------------------------------------------------------
  */

  const summary =
    useMemo(
      () => {
        const counts = {
          total:
            orders.length,

          pending:
            0,

          active:
            0,

          delivered:
            0,

          harvestBlocked:
            0
        };

        orders.forEach(
          (
            order
          ) => {
            const status =
              normalizeStatus(
                order?.orderStatus
              );

            if (
              status ===
              "pending"
            ) {
              counts.pending +=
                1;
            }

            if (
              [
                "confirmed",
                "processing",
                "packed",
                "out_for_delivery"
              ].includes(
                status
              )
            ) {
              counts.active +=
                1;
            }

            if (
              status ===
              "delivered"
            ) {
              counts.delivered +=
                1;
            }

            if (
              getFutureHarvestProducts(
                order
              ).length >
              0
            ) {
              counts.harvestBlocked +=
                1;
            }
          }
        );

        return counts;
      },
      [
        orders
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | TOTAL VISIBLE VALUE
  |--------------------------------------------------------------------------
  */

  const visibleValue =
    useMemo(
      () =>
        filteredOrders.reduce(
          (
            total,
            order
          ) =>
            total +
            getSellerItemTotal(
              order
            ),
          0
        ),
      [
        filteredOrders
      ]
    );

  const collectedSales =
    useMemo(
      () =>
        calculateFilteredCollectedSales(
          filteredOrders
        ),
      [filteredOrders]
    );

  const collectedTotal =
    collectedSales.sellerQr +
    collectedSales.upi +
    collectedSales.cod;

  const activeFilterCount =
    countActiveFilters({
      search,
      statusFilter,
      paymentMethodFilter,
      paymentStatusFilter,
      harvestFilter,
      utrFilter,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      sortOption
    });

  const clearFilters =
    () => {
      setSearch("");
      setStatusFilter("all");
      setPaymentMethodFilter("all");
      setPaymentStatusFilter("all");
      setHarvestFilter("all");
      setUtrFilter("all");
      setDateFrom("");
      setDateTo("");
      setMinAmount("");
      setMaxAmount("");
      setSortOption("latest");
    };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-[#f5f8f7] text-slate-900">

      {/* ================================================================ */}
      {/* SIDEBAR                                                         */}
      {/* ================================================================ */}

      <SellerSidebar />

      {/* ================================================================ */}
      {/* MAIN                                                            */}
      {/* ================================================================ */}

      <main className="lg:ml-72">

        <div className="mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

          {/* ============================================================ */}
          {/* HEADER                                                       */}
          {/* ============================================================ */}

          <SellerHeader
            title="Order Command Center"
            subtitle="Process customer orders, monitor harvest readiness and keep fulfillment moving."
            onRefresh={() =>
              loadOrders(
                true
              )
            }
            loading={
              refreshing
            }
          />

          {/* ============================================================ */}
          {/* ERROR                                                        */}
          {/* ============================================================ */}

          {error && (
            <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">

              <div>

                <p className="text-sm font-black text-red-800">
                  Order update failed
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600">
                  {error}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setError(
                    ""
                  )
                }
                className="text-xs font-black text-red-500 hover:text-red-700"
              >
                Dismiss
              </button>

            </div>
          )}

          {/* ============================================================ */}
          {/* COMMAND HERO                                                 */}
          {/* ============================================================ */}

          <section className="mb-6 overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-[0_25px_80px_rgba(15,23,42,0.12)] sm:p-8">

            <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                    Seller fulfillment
                  </span>

                  {summary.harvestBlocked >
                    0 && (
                    <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                      🌱 Harvest holds active
                    </span>
                  )}

                </div>

                <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                  Your orders,
                  <br />
                  under control.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/45">
                  Track incoming orders, work through processing stages
                  and respect harvest readiness before packing.
                </p>

              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">

                <HeroMetric
                  label="Orders"
                  value={
                    summary.total
                  }
                />

                <HeroMetric
                  label="Pending"
                  value={
                    summary.pending
                  }
                />

                <HeroMetric
                  label="Active"
                  value={
                    summary.active
                  }
                />

                <HeroMetric
                  label="Delivered"
                  value={
                    summary.delivered
                  }
                />

              </div>

            </div>

          </section>

          {/* ============================================================ */}
          {/* METRIC STRIP                                                 */}
          {/* ============================================================ */}

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <MetricCard
              label="Total Orders"
              value={
                summary.total
              }
              icon="▣"
              description="Orders containing your products"
            />

            <MetricCard
              label="Active Fulfillment"
              value={
                summary.active
              }
              icon="↗"
              description="Confirmed through delivery"
            />

            <MetricCard
              label="Delivered"
              value={
                summary.delivered
              }
              icon="✓"
              description="Successfully completed"
            />

            <MetricCard
              label="Visible Order Value"
              value={`₹${formatMoney(
                visibleValue
              )}`}
              icon="₹"
              description="Seller item value in current view"
            />

          </section>

          {/* ============================================================ */}
          {/* COLLECTED SALES BY PAYMENT CHANNEL                            */}
          {/* ============================================================ */}

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Collected Total"
              value={`₹${formatMoney(
                collectedTotal
              )}`}
              icon="₹"
              description="Delivered seller collections in current view"
            />

            <MetricCard
              label="Seller QR / UPI"
              value={`₹${formatMoney(
                collectedSales.sellerQr
              )}`}
              icon="▣"
              description="Verified seller QR collections"
            />

            <MetricCard
              label="UPI / Online"
              value={`₹${formatMoney(
                collectedSales.upi
              )}`}
              icon="⌁"
              description="Paid Razorpay collections"
            />

            <MetricCard
              label="Cash / COD"
              value={`₹${formatMoney(
                collectedSales.cod
              )}`}
              icon="₹"
              description="Delivered COD collections"
            />
          </section>

          {/* ============================================================ */}
          {/* SEARCH / FILTER BAR                                           */}
          {/* ============================================================ */}

          <section className="mb-6 rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-[0_15px_50px_rgba(15,23,42,0.045)] sm:p-6">
            <div className="flex flex-col gap-5">

              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                    Order explorer
                  </p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">
                    Search and filter every order field
                  </h2>
                  <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-400">
                    Search across order number, customer details, phone, email, shipping data, product data, payment method/status, UTR/payment IDs, harvest fields and other scalar values returned by the backend.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
                    {filteredOrders.length} / {orders.length} matching
                  </span>

                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-black text-red-600 transition hover:bg-red-100"
                    >
                      Clear filters ({activeFilterCount})
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="relative lg:col-span-2">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-300">
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
                    placeholder="Search anything — order #, customer, phone, email, product, address, UTR, payment, harvest, amount..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                >
                  <option value="all">All order statuses</option>
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>

                <select
                  value={paymentMethodFilter}
                  onChange={(event) =>
                    setPaymentMethodFilter(
                      event.target.value
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                >
                  <option value="all">All payment methods</option>
                  <option value="seller_qr">Seller QR / UPI</option>
                  <option value="razorpay">UPI / Online</option>
                  <option value="cod">Cash / COD</option>
                </select>

                <select
                  value={paymentStatusFilter}
                  onChange={(event) =>
                    setPaymentStatusFilter(
                      event.target.value
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                >
                  <option value="all">All payment statuses</option>
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="paid">Paid / Verified</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                  <option value="partially_paid">Partially Paid</option>
                </select>

                <select
                  value={harvestFilter}
                  onChange={(event) =>
                    setHarvestFilter(
                      event.target.value
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                >
                  <option value="all">All harvest states</option>
                  <option value="upcoming">Upcoming harvest</option>
                  <option value="today">Harvest today</option>
                  <option value="ready">Ready / no harvest hold</option>
                </select>

                <select
                  value={utrFilter}
                  onChange={(event) =>
                    setUtrFilter(
                      event.target.value
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                >
                  <option value="all">Any transaction reference</option>
                  <option value="with_utr">Has UTR / payment ID</option>
                  <option value="without_utr">No UTR / payment ID</option>
                </select>

                <select
                  value={sortOption}
                  onChange={(event) =>
                    setSortOption(
                      event.target.value
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                >
                  <option value="latest">Sort: Latest first</option>
                  <option value="oldest">Sort: Oldest first</option>
                  <option value="highest_value">Sort: Highest seller value</option>
                  <option value="lowest_value">Sort: Lowest seller value</option>
                  <option value="status">Sort: Status</option>
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) =>
                      setDateFrom(
                        event.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                    title="From date"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) =>
                      setDateTo(
                        event.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                    title="To date"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 lg:col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minAmount}
                    onChange={(event) =>
                      setMinAmount(
                        event.target.value
                      )
                    }
                    placeholder="Min seller value ₹"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maxAmount}
                    onChange={(event) =>
                      setMaxAmount(
                        event.target.value
                      )
                    }
                    placeholder="Max seller value ₹"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-emerald-800">
                  <span>Seller value: ₹{formatMoney(visibleValue)}</span>
                  <span className="h-1 w-1 rounded-full bg-emerald-300" />
                  <span>Collected: ₹{formatMoney(collectedTotal)}</span>
                  <span className="h-1 w-1 rounded-full bg-emerald-300" />
                  <span>QR ₹{formatMoney(collectedSales.sellerQr)}</span>
                  <span className="h-1 w-1 rounded-full bg-emerald-300" />
                  <span>Online ₹{formatMoney(collectedSales.upi)}</span>
                  <span className="h-1 w-1 rounded-full bg-emerald-300" />
                  <span>COD ₹{formatMoney(collectedSales.cod)}</span>
                </div>

                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`
                    : "No filters applied"}
                </span>
              </div>

            </div>
          </section>

          {/* ============================================================ */}
          {/* LOADING                                                       */}
          {/* ============================================================ */}

          {loading && (
            <OrdersSkeleton />
          )}

          {/* ============================================================ */}
          {/* EMPTY                                                         */}
          {/* ============================================================ */}

          {!loading &&
            filteredOrders.length ===
              0 && (
              <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                  {orders.length ===
                  0
                    ? "📦"
                    : "⌕"}
                </div>

                <h2 className="mt-5 text-xl font-black text-slate-950">
                  {orders.length ===
                  0
                    ? "No orders yet"
                    : "No matching orders"}
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                  {orders.length ===
                  0
                    ? "Customer orders containing your products will appear here."
                    : "Try another search term or remove the current status filter."}
                </p>

                {orders.length >
                  0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch(
                        ""
                      );

                      setStatusFilter(
                        "all"
                      );
                    }}
                    className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    Clear Filters
                  </button>
                )}

              </div>
            )}

          {/* ============================================================ */}
          {/* ORDER CARDS                                                   */}
          {/* ============================================================ */}

          {!loading &&
            filteredOrders.length >
              0 && (
              <section className="space-y-4">

                {filteredOrders.map(
                  (
                    order
                  ) => (
                    <OrderCard
                      key={
                        order._id
                      }
                      order={
                        order
                      }
                      updating={
                        updatingOrderId ===
                        order._id
                      }
                      deleting={
                        deletingOrderId ===
                        order._id
                      }
                      onUpdate={
                        updateStatus
                      }
                      onDelete={
                        deleteOrder
                      }
                    />
                  )
                )}

              </section>
            )}

        </div>

      </main>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| HERO METRIC
|--------------------------------------------------------------------------
*/

function HeroMetric({
  label,
  value
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 backdrop-blur-xl">

      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-white">
        {value}
      </p>

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
  description
}) {
  return (
    <div className="group rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_18px_50px_rgba(16,185,129,0.08)]">

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>

          <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            {description}
          </p>

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-lg text-emerald-700 transition group-hover:scale-105">
          {icon}
        </div>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ORDER CARD
|--------------------------------------------------------------------------
*/

function OrderCard({
  order,
  updating,
  deleting,
  onUpdate,
  onDelete
}) {
  const status =
    normalizeStatus(
      order?.orderStatus
    );

  const items =
    Array.isArray(
      order?.items
    )
      ? order.items
      : [];

  const futureHarvestProducts =
    getFutureHarvestProducts(
      order
    );

  const harvestBlocked =
    futureHarvestProducts.length >
    0;

  const statusOptions =
    getStatusOptions(
      order
    );

  const sellerValue =
    getSellerItemTotal(
      order
    );

  const paymentMethod =
    normalizeStatus(
      order?.paymentMethod
    );

  const paymentStatus =
    normalizeStatus(
      order?.paymentStatus
    );

  return (
    <article className="group overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_15px_50px_rgba(15,23,42,0.045)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_60px_rgba(15,23,42,0.07)]">

      {/* ============================================================ */}
      {/* TOP BAR                                                      */}
      {/* ============================================================ */}

      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex min-w-0 items-start gap-4">

            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg text-white shadow-sm">
              📦
            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h3 className="truncate text-base font-black text-slate-950 sm:text-lg">
                  #
                  {order.orderNumber ||
                    String(
                      order._id
                    ).slice(
                      -8
                    )}
                </h3>

                <SellerStatusBadge
                  status={
                    status
                  }
                />

              </div>

              <p className="mt-1 text-xs text-slate-400">
                {order.createdAt
                  ? new Date(
                      order.createdAt
                    ).toLocaleString(
                      "en-IN"
                    )
                  : "Date unavailable"}
              </p>

            </div>

          </div>

          <div className="flex items-center gap-3">

            <div className="text-right">

              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                Your value
              </p>

              <p className="mt-1 text-lg font-black text-slate-950">
                ₹
                {formatMoney(
                  sellerValue
                )}
              </p>

            </div>

            <Link
              to={`/seller/orders/${order._id}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              title="View order"
            >
              →
            </Link>

          </div>

        </div>

      </div>

      {/* ============================================================ */}
      {/* BODY                                                         */}
      {/* ============================================================ */}

      <div className="grid xl:grid-cols-[1.2fr_0.8fr]">

        {/* ========================================================== */}
        {/* LEFT                                                        */}
        {/* ========================================================== */}

        <div className="border-b border-slate-100 p-5 sm:p-6 xl:border-b-0 xl:border-r">

          {/* CUSTOMER */}

          <div className="grid gap-4 sm:grid-cols-3">

            <InfoBlock
              label="Customer"
              value={
                order.customer
                  ?.name ||
                "Customer"
              }
            />

            <InfoBlock
              label="Email"
              value={
                order.customer
                  ?.email ||
                "—"
              }
            />

            <InfoBlock
              label="Items"
              value={`${items.length} item${
                items.length ===
                1
                  ? ""
                  : "s"
              }`}
            />

          </div>

          {/* ITEMS */}

          <div className="mt-6 space-y-3">

            {items.map(
              (
                item,
                index
              ) => (
                <ProductRow
                  key={`${item.product?._id || item.product || index}`}
                  item={
                    item
                  }
                />
              )
            )}

          </div>

        </div>

        {/* ========================================================== */}
        {/* RIGHT                                                       */}
        {/* ========================================================== */}

        <div className="p-5 sm:p-6">

          {/* PAYMENT */}

          <div className="rounded-2xl bg-slate-50 p-4">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Payment
                </p>

                <p className="mt-1 text-sm font-black text-slate-900">
                  {getPaymentChannelLabel(
                    paymentMethod
                  )}
                </p>

              </div>

              <PaymentPill
                status={
                  paymentStatus
                }
              />

            </div>

          </div>

          {/* HARVEST ALERT */}

          {harvestBlocked && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">

              <div className="flex items-start gap-3">

                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  🌱
                </div>

                <div>

                  <p className="text-xs font-black uppercase tracking-[0.08em] text-amber-800">
                    Packing locked
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    One or more products are scheduled for future harvest.
                  </p>

                  <div className="mt-3 space-y-1">

                    {futureHarvestProducts.map(
                      (
                        item,
                        index
                      ) => (
                        <p
                          key={`${item.product?._id || index}`}
                          className="text-[11px] font-semibold text-amber-800"
                        >
                          {item.productName ||
                            item.product
                              ?.name ||
                            "Product"}
                          {" · "}
                          {formatHarvestDate(
                            item.product
                              ?.harvestDate
                          )}
                        </p>
                      )
                    )}

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ACTION */}

          <div className="mt-5">

            {statusOptions.length >
            0 ? (

              <div>

                <label className="mb-2 block text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Next fulfillment step
                </label>

                <div className="flex flex-col gap-2 sm:flex-row">

                  {statusOptions.map(
                    (
                      option
                    ) => (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        onClick={() =>
                          onUpdate(
                            order,
                            option.value
                          )
                        }
                        disabled={
                          updating ||
                          option.disabled
                        }
                        className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-xs font-black transition ${
                          option.disabled
                            ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                            : "bg-slate-950 text-white hover:-translate-y-0.5 hover:bg-emerald-600"
                        } disabled:opacity-60`}
                      >

                        <span>
                          {updating
                            ? "…"
                            : option.icon}
                        </span>

                        <span>
                          {updating
                            ? "Updating..."
                            : option.label}
                        </span>

                      </button>
                    )
                  )}

                </div>

              </div>

            ) : (

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">

                <p className="text-xs font-black text-slate-600">
                  {status ===
                  "delivered"
                    ? "✓ Order completed"
                    : status ===
                      "cancelled"
                    ? "Order cancelled"
                    : status ===
                      "returned"
                    ? "Order returned"
                    : "No further seller action"}
                </p>

              </div>

            )}

          </div>

        </div>

      </div>

      {/* ============================================================ */}
      {/* FOOTER                                                        */}
      {/* ============================================================ */}

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

        <div className="flex flex-wrap items-center gap-2">

          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
            Workflow
          </span>

          <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-sm">
            Confirm
          </span>

          <span className="text-slate-300">
            →
          </span>

          <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-sm">
            Process
          </span>

          <span className="text-slate-300">
            →
          </span>

          <span
            className={`rounded-full px-3 py-1.5 text-[10px] font-bold shadow-sm ${
              harvestBlocked
                ? "bg-amber-100 text-amber-700"
                : "bg-white text-slate-500"
            }`}
          >
            {harvestBlocked
              ? "🌱 Harvest"
              : "Pack"}
          </span>

          <span className="text-slate-300">
            →
          </span>

          <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-sm">
            Delivery
          </span>

        </div>

        <div className="flex items-center gap-3">

          {canDeletePendingPaymentOrder(
            order
          ) && (
            <button
              type="button"
              onClick={() =>
                onDelete(order)
              }
              disabled={deleting}
              className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              title="Delete this pending-payment order"
            >
              {deleting
                ? "Deleting..."
                : "Delete pending order"}
            </button>
          )}

          <Link
            to={`/seller/orders/${order._id}`}
            className="text-xs font-black text-emerald-700 hover:text-emerald-800"
          >
            Open full details →
          </Link>

        </div>

      </div>

    </article>
  );
}

/*
|--------------------------------------------------------------------------
| INFO BLOCK
|--------------------------------------------------------------------------
*/

function InfoBlock({
  label,
  value
}) {
  return (
    <div>

      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PRODUCT ROW
|--------------------------------------------------------------------------
*/

function ProductRow({
  item
}) {
  const image =
    item?.productImage ||
    item?.product?.images?.[0]
      ?.url ||
    "";

  const subtotal =
    Number(
      item?.subtotal ||
        Number(
          item?.priceAtPurchase ||
            0
        ) *
          Number(
            item?.quantity ||
              0
          )
    ) || 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-emerald-100 hover:bg-emerald-50/20">

      {image ? (

        <img
          src={
            image
          }
          alt={
            item?.productName ||
            "Product"
          }
          className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover"
        />

      ) : (

        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl">
          🥬
        </div>

      )}

      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-black text-slate-900">
          {item?.productName ||
            item?.product?.name ||
            "Product"}
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          {item?.quantity ||
            0}{" "}
          {item?.unit ||
            "unit"}
          {" · "}
          ₹
          {Number(
            item?.priceAtPurchase ||
              0
          ).toFixed(
            2
          )}
          {" / "}
          {item?.unit ||
            "unit"}
        </p>

      </div>

      <div className="text-right">

        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
          Value
        </p>

        <p className="mt-1 text-sm font-black text-slate-900">
          ₹
          {formatMoney(
            subtotal
          )}
        </p>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PAYMENT PILL
|--------------------------------------------------------------------------
*/

function PaymentPill({
  status
}) {
  const normalized =
    normalizeStatus(
      status
    );

  const config =
    normalized ===
    "paid"
      ? {
          label:
            "Paid",
          className:
            "bg-emerald-100 text-emerald-700"
        }
      : normalized ===
        "failed"
      ? {
          label:
            "Failed",
          className:
            "bg-red-100 text-red-700"
        }
      : normalized ===
        "refunded"
      ? {
          label:
            "Refunded",
          className:
            "bg-violet-100 text-violet-700"
        }
      : {
          label:
            "Pending",
          className:
            "bg-amber-100 text-amber-700"
        };

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| SKELETON
|--------------------------------------------------------------------------
*/

function OrdersSkeleton() {
  return (
    <div className="space-y-4">

      {[1, 2, 3].map(
        (
          item
        ) => (
          <div
            key={
              item
            }
            className="animate-pulse rounded-[28px] border border-slate-200 bg-white p-6"
          >

            <div className="flex gap-4">

              <div className="h-12 w-12 rounded-2xl bg-slate-100" />

              <div className="flex-1">

                <div className="h-4 w-40 rounded-full bg-slate-100" />

                <div className="mt-2 h-3 w-28 rounded-full bg-slate-100" />

              </div>

            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">

              <div className="h-16 rounded-2xl bg-slate-100" />
              <div className="h-16 rounded-2xl bg-slate-100" />
              <div className="h-16 rounded-2xl bg-slate-100" />

            </div>

            <div className="mt-4 h-14 rounded-2xl bg-slate-100" />

          </div>
        )
      )}

    </div>
  );
}