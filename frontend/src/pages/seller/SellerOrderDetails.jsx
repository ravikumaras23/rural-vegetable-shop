
import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  Link,
  useNavigate,
  useParams
} from "react-router-dom";

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
          "Content-Type":
            "application/json",

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
      .catch(
        () => ({})
      );

  if (!response.ok) {
    const error =
      new Error(
        data.message ||
          `Request failed with status ${response.status}`
      );

    error.code =
      data.code;

    throw error;
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| STATUS FORMATTER
|--------------------------------------------------------------------------
*/

function formatStatus(
  value
) {
  if (!value) {
    return "Unknown";
  }

  return String(
    value
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
| ORDER STATUS COLORS
|--------------------------------------------------------------------------
*/

function getOrderStatusClass(
  status
) {
  switch (
    String(
      status || ""
    ).toLowerCase()
  ) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";

    case "confirmed":
      return "bg-blue-100 text-blue-800";

    case "processing":
      return "bg-indigo-100 text-indigo-800";

    case "packed":
      return "bg-purple-100 text-purple-800";

    case "out_for_delivery":
      return "bg-cyan-100 text-cyan-800";

    case "delivered":
      return "bg-green-100 text-green-800";

    case "cancelled":
      return "bg-red-100 text-red-800";

    case "returned":
      return "bg-orange-100 text-orange-800";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

/*
|--------------------------------------------------------------------------
| PAYMENT STATUS COLORS
|--------------------------------------------------------------------------
*/

function getPaymentStatusClass(
  status
) {
  switch (
    String(
      status || ""
    ).toLowerCase()
  ) {
    case "paid":
      return "bg-green-100 text-green-700";

    case "submitted":
      return "bg-blue-100 text-blue-700";

    case "failed":
      return "bg-red-100 text-red-700";

    case "refunded":
      return "bg-purple-100 text-purple-700";

    case "pending":
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

/*
|--------------------------------------------------------------------------
| PAYMENT STATUS ICON
|--------------------------------------------------------------------------
*/

function getPaymentStatusIcon(
  status
) {
  switch (
    String(
      status || ""
    ).toLowerCase()
  ) {
    case "paid":
      return "✓";

    case "submitted":
      return "↗";

    case "failed":
      return "✕";

    case "refunded":
      return "↩";

    case "pending":
    default:
      return "○";
  }
}

/*
|--------------------------------------------------------------------------
| INDIA DATE
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

      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(date);
}

/*
|--------------------------------------------------------------------------
| HARVEST DATE
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
| HARVEST DATE DISPLAY
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
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  );
}

/*
|--------------------------------------------------------------------------
| HARVEST READINESS
|--------------------------------------------------------------------------
*/

function getHarvestReadiness(
  harvestDate
) {
  const harvestKey =
    getHarvestDateKey(
      harvestDate
    );

  if (!harvestKey) {
    return {
      type: "ready",

      title:
        "Harvest date not specified",

      message:
        "No harvest-date restriction applies.",

      ready: true
    };
  }

  const today =
    getIndiaDateKey();

  if (
    harvestKey ===
    today
  ) {
    return {
      type: "ready",

      title:
        "Harvest is today",

      message:
        "This product is ready to be packed today.",

      ready: true
    };
  }

  if (
    harvestKey >
    today
  ) {
    return {
      type: "future",

      title:
        "Harvest not ready",

      message:
        `This product will be harvested on ${formatHarvestDate(
          harvestDate
        )}.`,

      ready: false
    };
  }

  return {
    type: "ready",

    title:
      "Harvest completed",

    message:
      `Harvest date was ${formatHarvestDate(
        harvestDate
      )}.`,

    ready: true
  };
}

/*
|--------------------------------------------------------------------------
| COPY TRANSACTION REFERENCE
|--------------------------------------------------------------------------
*/

async function copyTransactionReference(
  value
) {
  const reference =
    String(
      value || ""
    ).trim();

  if (!reference) {
    return;
  }

  try {
    await navigator.clipboard.writeText(
      reference
    );

    window.alert(
      "Transaction ID copied."
    );
  } catch {
    window.alert(
      "Unable to copy transaction ID."
    );
  }
}

/*
|--------------------------------------------------------------------------
| SELLER ORDER DETAILS
|--------------------------------------------------------------------------
*/

export default function SellerOrderDetails() {
  const {
    id
  } = useParams();

  const navigate =
    useNavigate();

  const [
    order,
    setOrder
  ] =
    useState(null);

  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing
  ] =
    useState(false);

  const [
    updating,
    setUpdating
  ] =
    useState(false);

  const [
    verifyingPayment,
    setVerifyingPayment
  ] =
    useState(false);

  const [
    error,
    setError
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD ORDER
  |--------------------------------------------------------------------------
  */

  const loadOrder =
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

          const response =
            await apiRequest(
              `/api/order-management/seller/${id}`
            );

          setOrder(
            response.data ||
              null
          );
        } catch (
          err
        ) {
          console.error(
            "Seller order details error:",
            err
          );

          setError(
            err.message ||
              "Unable to load order details."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [id]
    );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      loadOrder();
    },
    [
      loadOrder
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | AUTO REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      const interval =
        setInterval(
          () => {
            loadOrder(true);
          },
          10000
        );

      return () => {
        clearInterval(
          interval
        );
      };
    },
    [
      loadOrder
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | SELLER ITEMS
  |--------------------------------------------------------------------------
  */

  const sellerItems =
    Array.isArray(
      order?.items
    )
      ? order.items
      : [];

  /*
  |--------------------------------------------------------------------------
  | SELLER PAYMENT
  |--------------------------------------------------------------------------
  |
  | Backend should return only this seller's payment record.
  |
  */

  const sellerPayments =
    Array.isArray(
      order?.sellerPayments
    )
      ? order.sellerPayments
      : [];

  const sellerPayment =
    sellerPayments.length >
    0
      ? sellerPayments[0]
      : null;

  /*
  |--------------------------------------------------------------------------
  | UPDATE ORDER STATUS
  |--------------------------------------------------------------------------
  */

  const updateStatus =
    async (
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
        "packed"
      ) {
        const blockedProducts =
          sellerItems.filter(
            (item) =>
              !getHarvestReadiness(
                item.product
                  ?.harvestDate
              ).ready
          );

        if (
          blockedProducts.length >
          0
        ) {
          const productNames =
            blockedProducts
              .map(
                (item) =>
                  item.productName ||
                  item.product
                    ?.name ||
                  "Product"
              )
              .join(
                ", "
              );

          window.alert(
            `Cannot pack this order yet.\n\n${productNames}\n\nThe harvest date has not been reached.`
          );

          return;
        }
      }

      /*
      |--------------------------------------------------------------------------
      | DELIVERY CONFIRMATION
      |--------------------------------------------------------------------------
      */

      let deliveryCode = "";

      if (
        nextStatus ===
        "delivered"
      ) {
        const confirmed =
          window.confirm(
            "Are you sure you want to mark this order as delivered?"
          );

        if (!confirmed) {
          return;
        }

        deliveryCode =
          window.prompt(
            "Enter the 6-digit delivery verification code provided by the customer:"
          );

        if (
          deliveryCode ===
            null ||
          !/^\d{6}$/.test(
            String(
              deliveryCode
            ).trim()
          )
        ) {
          window.alert(
            "Delivery cannot be completed without a valid 6-digit customer verification code."
          );

          return;
        }

        deliveryCode =
          String(
            deliveryCode
          ).trim();
      }

      try {
        setUpdating(true);
        setError("");

        await apiRequest(
          `/api/order-management/seller/${order._id}/status`,
          {
            method:
              "PATCH",

            body:
              JSON.stringify({
                status:
                  nextStatus,

                ...(nextStatus ===
                "delivered"
                  ? {
                      deliveryCode
                    }
                  : {})
              })
          }
        );

        await loadOrder(
          true
        );
      } catch (
        err
      ) {
        console.error(
          "Seller order update error:",
          err
        );

        window.alert(
          err.message ||
            "Unable to update order status."
        );

        await loadOrder(
          true
        );
      } finally {
        setUpdating(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | VERIFY SELLER QR PAYMENT
  |--------------------------------------------------------------------------
  */

  const verifySellerQrPayment =
    async () => {
      if (
        !order ||
        !sellerPayment
      ) {
        return;
      }

      const paymentId =
        String(
          sellerPayment._id ||
            sellerPayment.paymentId ||
            ""
        ).trim();

      if (!paymentId) {
        window.alert(
          "Seller payment ID is missing."
        );

        return;
      }

      if (
        sellerPayment.status !==
        "submitted"
      ) {
        window.alert(
          "There is no submitted transaction awaiting verification."
        );

        return;
      }

      const transactionReference =
        String(
          sellerPayment.transactionReference ||
            ""
        ).trim();

      if (
        !transactionReference
      ) {
        window.alert(
          "Transaction ID / UTR is missing."
        );

        return;
      }

      const amount =
        Number(
          sellerPayment.amount ||
            0
        );

      const confirmed =
        window.confirm(
          `Verify this seller payment?\n\nTransaction ID: ${transactionReference}\n\nAmount: ₹${amount.toLocaleString(
            "en-IN",
            {
              minimumFractionDigits:
                2,

              maximumFractionDigits:
                2
            }
          )}`
        );

      if (!confirmed) {
        return;
      }

      try {
        setVerifyingPayment(
          true
        );

        setError("");

        /*
        |--------------------------------------------------------------------------
        | IMPORTANT:
        | Correct backend route
        |--------------------------------------------------------------------------
        |
        | POST /api/seller/qr-payments/:orderId/:paymentId/verify
        |
        */

        await apiRequest(
          `/api/seller/qr-payments/${order._id}/${paymentId}/verify`,
          {
            method:
              "POST"
          }
        );

        await loadOrder(
          true
        );

      } catch (
        err
      ) {
        console.error(
          "Seller QR payment verification error:",
          err
        );

        window.alert(
          err.message ||
            "Unable to verify seller payment."
        );

        await loadOrder(
          true
        );
      } finally {
        setVerifyingPayment(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12">

        <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">

          <div className="text-6xl">
            📦
          </div>

          <p className="mt-5 text-lg font-semibold text-gray-600">
            Loading seller order...
          </p>

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR
  |--------------------------------------------------------------------------
  */

  if (
    error &&
    !order
  ) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12">

        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">

          <div className="text-5xl">
            ⚠️
          </div>

          <h1 className="mt-5 text-2xl font-black text-gray-900">
            Unable to load order
          </h1>

          <p className="mt-3 text-red-600">
            {error}
          </p>

          <div className="mt-7 flex justify-center gap-3">

            <button
              type="button"
              onClick={() =>
                loadOrder()
              }
              className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700"
            >
              Try Again
            </button>

            <Link
              to="/seller/orders"
              className="rounded-xl border border-gray-300 px-6 py-3 font-bold text-gray-700 hover:bg-gray-50"
            >
              ← Seller Orders
            </Link>

          </div>

        </div>

      </div>
    );
  }

  if (!order) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | TOTAL SELLER SALES
  |--------------------------------------------------------------------------
  */

  const sellerSubtotal =
    sellerItems.reduce(
      (
        total,
        item
      ) => {
        const subtotal =
          Number(
            item.subtotal ||
              Number(
                item.priceAtPurchase ||
                  0
              ) *
                Number(
                  item.quantity ||
                    0
                )
          );

        return (
          total +
          (
            Number.isFinite(
              subtotal
            )
              ? subtotal
              : 0
          )
        );
      },
      0
    );

  /*
  |--------------------------------------------------------------------------
  | FUTURE HARVEST PRODUCTS
  |--------------------------------------------------------------------------
  */

  const futureHarvestProducts =
    sellerItems.filter(
      (item) =>
        !getHarvestReadiness(
          item.product
            ?.harvestDate
        ).ready
    );

  const hasFutureHarvest =
    futureHarvestProducts.length >
    0;

  /*
  |--------------------------------------------------------------------------
  | CURRENT ORDER STATUS
  |--------------------------------------------------------------------------
  */

  const orderStatus =
    normalizeStatus(
      order.orderStatus
    );

  /*
  |--------------------------------------------------------------------------
  | NEXT STATUS
  |--------------------------------------------------------------------------
  */

  const nextStatus =
    getNextStatus(
      orderStatus
    );

  /*
  |--------------------------------------------------------------------------
  | PAYMENT
  |--------------------------------------------------------------------------
  */

  const paymentMethod =
    normalizeStatus(
      order.paymentMethod
    );

  const paymentStatus =
    normalizeStatus(
      order.paymentStatus
    );

  /*
  |--------------------------------------------------------------------------
  | SELLER PAYMENT STATUS
  |--------------------------------------------------------------------------
  */

  const sellerPaymentStatus =
    normalizeStatus(
      sellerPayment?.status
    );

  const hasSubmittedPayment =
    paymentMethod ===
      "seller_qr" &&
    sellerPaymentStatus ===
      "submitted";

  const sellerPaymentVerified =
    paymentMethod ===
      "seller_qr" &&
    sellerPaymentStatus ===
      "paid";

  const hasTransactionReference =
    Boolean(
      String(
        sellerPayment?.transactionReference ||
          ""
      ).trim()
    );

  /*
  |--------------------------------------------------------------------------
  | CAN UPDATE STATUS
  |--------------------------------------------------------------------------
  */

  const canUpdate =
    Boolean(
      nextStatus
    ) &&
    ![
      "delivered",
      "cancelled",
      "returned"
    ].includes(
      orderStatus
    );

  /*
  |--------------------------------------------------------------------------
  | SELLER QR PAYMENT ACTION
  |--------------------------------------------------------------------------
  */

  const showQrVerificationAction =
    paymentMethod ===
      "seller_qr" &&
    hasSubmittedPayment;

  /*
  |--------------------------------------------------------------------------
  | PAYMENT DISPLAY STATUS
  |--------------------------------------------------------------------------
  */

  const displayedPaymentStatus =
    paymentMethod ===
      "seller_qr" &&
    sellerPayment
      ? sellerPaymentStatus
      : paymentStatus;

  /*
  |--------------------------------------------------------------------------
  | RETURN UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ================================================= */}
      {/* PAGE HEADER                                       */}
      {/* ================================================= */}

      <header className="border-b border-gray-200 bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">

          <div>

            <p className="text-sm font-bold text-green-700">
              RuralFresh
            </p>

            <h1 className="text-2xl font-black text-gray-900">
              Seller Order Details
            </h1>

          </div>

          <div className="flex items-center gap-3">

            {refreshing && (
              <span className="hidden text-xs font-semibold text-gray-500 sm:block">
                Updating...
              </span>
            )}

            <button
              type="button"
              onClick={() =>
                loadOrder(true)
              }
              disabled={
                refreshing
              }
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {refreshing
                ? "Updating..."
                : "↻ Refresh"}
            </button>

            <Link
              to="/seller/orders"
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              ← Orders
            </Link>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">

        {/* ================================================= */}
        {/* BACKGROUND ERROR                                 */}
        {/* ================================================= */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* ================================================= */}
        {/* ORDER HEADER                                     */}
        {/* ================================================= */}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Order Number
              </p>

              <h2 className="mt-1 break-all text-2xl font-black text-green-700">
                {order.orderNumber ||
                  `#${String(
                    order._id
                  ).slice(-8)}`}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {order.createdAt
                  ? new Date(
                      order.createdAt
                    ).toLocaleString(
                      "en-IN"
                    )
                  : ""}
              </p>

            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${getOrderStatusClass(
                order.orderStatus
              )}`}
            >
              {formatStatus(
                order.orderStatus
              )}
            </span>

          </div>

          {/* ================================================= */}
          {/* STATUS PROGRESS                                  */}
          {/* ================================================= */}

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">

            {[
              "confirmed",
              "processing",
              "packed",
              "out_for_delivery",
              "delivered"
            ].map(
              (
                step,
                index
              ) => {

                const currentIndex =
                  [
                    "confirmed",
                    "processing",
                    "packed",
                    "out_for_delivery",
                    "delivered"
                  ].indexOf(
                    orderStatus
                  );

                const completed =
                  currentIndex >=
                    0 &&
                  index <=
                    currentIndex;

                return (
                  <div
                    key={
                      step
                    }
                    className={`rounded-xl border p-4 text-center ${
                      completed
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >

                    <div
                      className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
                        completed
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {completed
                        ? "✓"
                        : index +
                          1}
                    </div>

                    <p
                      className={`mt-3 text-xs font-semibold ${
                        completed
                          ? "text-green-700"
                          : "text-gray-500"
                      }`}
                    >
                      {formatStatus(
                        step
                      )}
                    </p>

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* ================================================= */}
        {/* MAIN GRID                                        */}
        {/* ================================================= */}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* ================================================= */}
          {/* LEFT COLUMN                                      */}
          {/* ================================================= */}

          <div className="space-y-6">

            {/* ============================================= */}
            {/* CUSTOMER                                      */}
            {/* ============================================= */}

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <h2 className="text-xl font-black text-gray-900">
                Customer Information
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Name
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {order.customer
                      ?.name ||
                      "Customer"}
                  </p>

                </div>

                <div>

                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Email
                  </p>

                  <p className="mt-1 break-all font-semibold text-gray-900">
                    {order.customer
                      ?.email ||
                      "—"}
                  </p>

                </div>

                <div>

                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Phone
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {order.customer
                      ?.phone ||
                      order.shippingAddress
                        ?.phone ||
                      "—"}
                  </p>

                </div>

              </div>

            </section>

            {/* ============================================= */}
            {/* SELLER ITEMS                                  */}
            {/* ============================================= */}

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-xl font-black text-gray-900">
                    Your Products
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Only products belonging to your seller account
                  </p>

                </div>

                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                  {sellerItems.length} item
                  {sellerItems.length ===
                  1
                    ? ""
                    : "s"}
                </span>

              </div>

              <div className="mt-6 divide-y divide-gray-100">

                {sellerItems.map(
                  (
                    item,
                    index
                  ) => {

                    const harvest =
                      getHarvestReadiness(
                        item.product
                          ?.harvestDate
                      );

                    return (
                      <div
                        key={`${item.product?._id || item.product || index}`}
                        className="py-5"
                      >

                        <div className="flex flex-col gap-5 sm:flex-row sm:justify-between">

                          <div className="flex gap-4">

                            {item.productImage ||
                            item.product
                              ?.images?.[0]
                              ?.url ? (
                              <img
                                src={
                                  item.productImage ||
                                  item.product
                                    ?.images?.[0]
                                    ?.url
                                }
                                alt={
                                  item.productName ||
                                  "Product"
                                }
                                className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-4xl">
                                🥬
                              </div>
                            )}

                            <div>

                              <h3 className="text-lg font-bold text-gray-900">
                                {item.productName ||
                                  item.product
                                    ?.name ||
                                  "Product"}
                              </h3>

                              <p className="mt-1 text-sm text-gray-500">
                                Quantity:{" "}
                                {item.quantity}{" "}
                                {item.unit}
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                Price: ₹
                                {Number(
                                  item.priceAtPurchase ||
                                    0
                                ).toFixed(
                                  2
                                )}{" "}
                                /{" "}
                                {item.unit}
                              </p>

                            </div>

                          </div>

                          <div className="text-right">

                            <p className="text-xs text-gray-500">
                              Item subtotal
                            </p>

                            <p className="mt-1 text-xl font-black text-green-700">
                              ₹
                              {Number(
                                item.subtotal ||
                                  0
                              ).toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits:
                                    2,

                                  maximumFractionDigits:
                                    2
                                }
                              )}
                            </p>

                          </div>

                        </div>

                        {/* HARVEST */}

                        <div
                          className={`mt-4 rounded-xl border p-4 ${
                            harvest.ready
                              ? "border-green-200 bg-green-50"
                              : "border-amber-200 bg-amber-50"
                          }`}
                        >

                          <div className="flex items-start gap-3">

                            <span className="text-xl">
                              {harvest.ready
                                ? "✅"
                                : "🌱"}
                            </span>

                            <div>

                              <p
                                className={`text-sm font-black ${
                                  harvest.ready
                                    ? "text-green-800"
                                    : "text-amber-800"
                                }`}
                              >
                                {
                                  harvest.title
                                }
                              </p>

                              <p
                                className={`mt-1 text-xs leading-5 ${
                                  harvest.ready
                                    ? "text-green-700"
                                    : "text-amber-700"
                                }`}
                              >
                                {
                                  harvest.message
                                }
                              </p>

                            </div>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </section>

            {/* ============================================= */}
            {/* DELIVERY ADDRESS                              */}
            {/* ============================================= */}

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <h2 className="text-xl font-black text-gray-900">
                Delivery Address
              </h2>

              <div className="mt-5 space-y-1 text-sm leading-6 text-gray-600">

                {order.shippingAddress
                  ?.name && (
                  <p className="font-bold text-gray-900">
                    {
                      order
                        .shippingAddress
                        .name
                    }
                  </p>
                )}

                {order.shippingAddress
                  ?.phone && (
                  <p>
                    {
                      order
                        .shippingAddress
                        .phone
                    }
                  </p>
                )}

                {order.shippingAddress
                  ?.addressLine1 && (
                  <p>
                    {
                      order
                        .shippingAddress
                        .addressLine1
                    }
                  </p>
                )}

                {order.shippingAddress
                  ?.addressLine2 && (
                  <p>
                    {
                      order
                        .shippingAddress
                        .addressLine2
                    }
                  </p>
                )}

                {order.shippingAddress
                  ?.village && (
                  <p>
                    {
                      order
                        .shippingAddress
                        .village
                    }
                  </p>
                )}

                {(order.shippingAddress
                  ?.district ||
                  order.shippingAddress
                    ?.state) && (
                  <p>

                    {
                      order
                        .shippingAddress
                        ?.district
                    }

                    {order.shippingAddress
                      ?.district &&
                      order.shippingAddress
                        ?.state &&
                      ", "}

                    {
                      order
                        .shippingAddress
                        ?.state
                    }

                  </p>
                )}

                {order.shippingAddress
                  ?.pincode && (
                  <p className="font-semibold text-gray-900">
                    {
                      order
                        .shippingAddress
                        .pincode
                    }
                  </p>
                )}

              </div>

            </section>

          </div>

          {/* ================================================= */}
          {/* RIGHT COLUMN                                     */}
          {/* ================================================= */}

          <aside className="h-fit space-y-6">

            {/* ============================================= */}
            {/* ORDER TOTAL                                   */}
            {/* ============================================= */}

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <h2 className="text-lg font-black text-gray-900">
                Seller Order Total
              </h2>

              <div className="mt-5 space-y-4">

                <div className="flex justify-between text-sm">

                  <span className="text-gray-500">
                    Your item subtotal
                  </span>

                  <span className="font-bold text-gray-900">
                    ₹
                    {sellerSubtotal.toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits:
                          2,

                        maximumFractionDigits:
                          2
                      }
                    )}
                  </span>

                </div>

                <div className="border-t pt-4">

                  <div className="flex justify-between">

                    <span className="font-black">
                      Order Total
                    </span>

                    <span className="text-2xl font-black text-green-700">
                      ₹
                      {Number(
                        order.totalAmount ||
                          0
                      ).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits:
                            2,

                          maximumFractionDigits:
                            2
                        }
                      )}
                    </span>

                  </div>

                </div>

                <p className="text-xs leading-5 text-gray-500">
                  The order total can include
                  products from other sellers.
                  Your seller subtotal represents
                  the value of your own products.
                </p>

              </div>

            </section>

            {/* ============================================= */}
            {/* PAYMENT                                       */}
            {/* ============================================= */}

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <div className="flex items-center justify-between gap-3">

                <h2 className="text-lg font-black text-gray-900">
                  Payment
                </h2>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${getPaymentStatusClass(
                    displayedPaymentStatus
                  )}`}
                >
                  {getPaymentStatusIcon(
                    displayedPaymentStatus
                  )}{" "}
                  {formatStatus(
                    displayedPaymentStatus
                  )}
                </span>

              </div>

              <div className="mt-5 space-y-4">

                {/* PAYMENT METHOD */}

                <div className="flex justify-between gap-4 text-sm">

                  <span className="text-gray-500">
                    Method
                  </span>

                  <span className="font-black uppercase text-gray-900">
                    {paymentMethod ||
                      "—"}
                  </span>

                </div>

                {/* ========================================= */}
                {/* SELLER QR PAYMENT                         */}
                {/* ========================================= */}

                {paymentMethod ===
                  "seller_qr" && (
                  <div className="space-y-4">

                    {/* PAYMENT AMOUNT */}

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                      <div className="flex items-center justify-between gap-4">

                        <div>

                          <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                            Your payment amount
                          </p>

                          <p className="mt-1 text-xl font-black text-gray-900">
                            ₹
                            {Number(
                              sellerPayment?.amount ||
                                0
                            ).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits:
                                  2,

                                maximumFractionDigits:
                                  2
                              }
                            )}
                          </p>

                        </div>

                        <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm">

                          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                            Payment
                          </p>

                          <p className="text-xs font-black text-gray-800">
                            Seller QR
                          </p>

                        </div>

                      </div>

                    </div>

                    {/* TRANSACTION REFERENCE */}

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">

                      <div className="flex items-center justify-between gap-3">

                        <div>

                          <p className="text-[11px] font-black uppercase tracking-wider text-blue-500">
                            Transaction ID / UTR
                          </p>

                          <p className="mt-2 text-xs font-semibold text-blue-700">
                            Customer payment reference
                          </p>

                        </div>

                        {hasTransactionReference && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-700">
                            Submitted
                          </span>
                        )}

                      </div>

                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-white p-3">

                        <p className="min-w-0 flex-1 break-all font-mono text-sm font-black text-gray-900">
                          {hasTransactionReference
                            ? sellerPayment.transactionReference
                            : "Not submitted yet"}
                        </p>

                        {hasTransactionReference && (
                          <button
                            type="button"
                            onClick={() =>
                              copyTransactionReference(
                                sellerPayment.transactionReference
                              )
                            }
                            className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 hover:bg-gray-50"
                          >
                            Copy
                          </button>
                        )}

                      </div>

                    </div>

                    {/* SUBMISSION TIME + STATUS */}

                    {sellerPayment?.submittedAt && (
                      <div className="grid gap-3 sm:grid-cols-2">

                        <div className="rounded-xl border border-gray-200 bg-white p-4">

                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Submitted At
                          </p>

                          <p className="mt-2 text-sm font-bold text-gray-800">
                            {new Date(
                              sellerPayment.submittedAt
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </p>

                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4">

                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Payment Status
                          </p>

                          <p className="mt-2">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getPaymentStatusClass(
                                sellerPaymentStatus
                              )}`}
                            >
                              {getPaymentStatusIcon(
                                sellerPaymentStatus
                              )}{" "}
                              {formatStatus(
                                sellerPaymentStatus
                              )}
                            </span>

                          </p>

                        </div>

                      </div>
                    )}

                    {/* VERIFIED INFORMATION */}

                    {sellerPaymentVerified && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-4">

                        <div className="flex items-start gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white">
                            ✓
                          </div>

                          <div>

                            <p className="text-sm font-black text-green-800">
                              Payment verified
                            </p>

                            {sellerPayment.verifiedAt && (
                              <p className="mt-1 text-xs leading-5 text-green-700">
                                Verified on{" "}
                                {new Date(
                                  sellerPayment.verifiedAt
                                ).toLocaleString(
                                  "en-IN"
                                )}
                              </p>
                            )}

                            {sellerPayment.verifiedBy && (
                              <p className="mt-1 text-xs text-green-700">
                                Verified by{" "}
                                {sellerPayment.verifiedBy
                                  ?.name ||
                                  sellerPayment.verifiedBy
                                    ?.email ||
                                  "Seller"}
                              </p>
                            )}

                          </div>

                        </div>

                      </div>
                    )}

                    {/* REJECTION INFORMATION */}

                    {sellerPayment?.rejectionReason && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                        <p className="text-xs font-black uppercase tracking-wider text-red-500">
                          Previous rejection
                        </p>

                        <p className="mt-2 text-sm font-semibold leading-5 text-red-700">
                          {
                            sellerPayment.rejectionReason
                          }
                        </p>

                      </div>
                    )}

                    {/* PAYMENT NOT SUBMITTED */}

                    {!hasTransactionReference && (
                      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">

                        <p className="text-sm font-black text-yellow-800">
                          Waiting for customer payment
                        </p>

                        <p className="mt-1 text-xs leading-5 text-yellow-700">
                          The customer has not submitted a Transaction ID / UTR yet.
                        </p>

                      </div>
                    )}

                    {!sellerPayment && (
                      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">

                        <p className="text-sm font-black text-yellow-800">
                          Seller payment record unavailable
                        </p>

                        <p className="mt-1 text-xs leading-5 text-yellow-700">
                          Refresh the page after the order payment record has been created.
                        </p>

                      </div>
                    )}

                  </div>
                )}

                {/* ========================================= */}
                {/* COD                                       */}
                {/* ========================================= */}

                {paymentMethod ===
                  "cod" && (
                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm font-semibold text-slate-700">
                      Cash on delivery
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">

                      {orderStatus ===
                      "delivered"
                        ? "COD payment has been collected because the order is delivered."
                        : "COD payment will be collected when the order is delivered."}

                    </p>

                  </div>
                )}

                {/* ========================================= */}
                {/* RAZORPAY                                  */}
                {/* ========================================= */}

                {paymentMethod ===
                  "razorpay" &&
                  paymentStatus ===
                    "paid" && (
                  <div className="rounded-xl bg-green-50 p-4">

                    <p className="text-sm font-bold text-green-700">
                      Online payment completed.
                    </p>

                    {order.razorpay
                      ?.paymentId && (
                      <p className="mt-1 break-all text-xs text-green-600">
                        Payment ID:{" "}
                        {
                          order
                            .razorpay
                            .paymentId
                        }
                      </p>
                    )}

                  </div>
                )}

              </div>

            </section>

            {/* ============================================= */}
            {/* HARVEST BLOCK                                 */}
            {/* ============================================= */}

            {hasFutureHarvest && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">

                <div className="flex items-start gap-3">

                  <div className="text-2xl">
                    🌱
                  </div>

                  <div>

                    <h2 className="font-black text-amber-900">
                      Packing is waiting
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-amber-800">
                      This order contains one or
                      more products whose harvest
                      date has not arrived yet.
                    </p>

                    <p className="mt-3 text-sm font-bold text-amber-900">
                      You can continue processing,
                      but you cannot pack this
                      order yet.
                    </p>

                  </div>

                </div>

              </section>
            )}

            {/* ============================================= */}
            {/* NEXT ACTION                                  */}
            {/* ============================================= */}

            {showQrVerificationAction ? (

              <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">

                <div className="flex items-center justify-between gap-3">

                  <h2 className="text-lg font-black text-gray-900">
                    Payment Verification
                  </h2>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                    Action Required
                  </span>

                </div>

                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">

                  <p className="text-xs font-black uppercase tracking-wider text-blue-500">
                    Transaction ID / UTR
                  </p>

                  <p className="mt-2 break-all font-mono text-lg font-black text-gray-900">
                    {
                      sellerPayment
                        ?.transactionReference
                    }
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-3">

                    <span className="text-xs font-semibold text-blue-700">
                      Amount: ₹
                      {Number(
                        sellerPayment?.amount ||
                          0
                      ).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits:
                            2,

                          maximumFractionDigits:
                            2
                        }
                      )}
                    </span>

                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-[10px] font-black text-yellow-800">
                      Awaiting Verification
                    </span>

                  </div>

                </div>

                <p className="mt-4 text-sm leading-5 text-gray-500">
                  Check the transaction ID / UTR and payment amount before verifying the customer payment.
                </p>

                <button
                  type="button"
                  onClick={
                    verifySellerQrPayment
                  }
                  disabled={
                    verifyingPayment
                  }
                  className="mt-5 w-full rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {verifyingPayment
                    ? "Verifying Payment..."
                    : "✓ Verify Payment"}
                </button>

              </section>

            ) : canUpdate ? (

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

                <h2 className="text-lg font-black text-gray-900">
                  Next Action
                </h2>

                <p className="mt-2 text-sm text-gray-500">

                  Current status:{" "}

                  <strong>
                    {formatStatus(
                      orderStatus
                    )}
                  </strong>

                </p>

                {/* QR PAYMENT WAITING */}

                {paymentMethod ===
                  "seller_qr" &&
                  !sellerPaymentVerified &&
                  !hasSubmittedPayment && (
                  <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4">

                    <p className="text-sm font-black text-yellow-800">
                      Waiting for payment
                    </p>

                    <p className="mt-1 text-xs leading-5 text-yellow-700">
                      The customer has not submitted a Transaction ID / UTR yet.
                    </p>

                  </div>
                )}

                {/* NORMAL ORDER ACTION */}

                {!(
                  paymentMethod ===
                    "seller_qr" &&
                  !sellerPaymentVerified
                ) && (
                  <>
                    {nextStatus ===
                      "packed" &&
                    hasFutureHarvest ? (

                      <div className="mt-5">

                        <button
                          type="button"
                          disabled
                          className="w-full cursor-not-allowed rounded-xl bg-gray-200 px-5 py-3 font-bold text-gray-500"
                        >
                          🔒 Packed — Waiting for Harvest
                        </button>

                        <p className="mt-3 text-center text-xs leading-5 text-amber-700">
                          Packing will become available
                          once the harvest date is reached.
                        </p>

                      </div>

                    ) : (

                      <button
                        type="button"
                        onClick={() =>
                          updateStatus(
                            nextStatus
                          )
                        }
                        disabled={
                          updating
                        }
                        className="mt-5 w-full rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updating
                          ? "Updating..."
                          : `Mark as ${formatStatus(
                              nextStatus
                            )}`}
                      </button>

                    )}
                  </>
                )}

              </section>

            ) : (

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

                <h2 className="text-lg font-black text-gray-900">
                  Order Status
                </h2>

                <div
                  className={`mt-5 rounded-xl px-4 py-4 text-center text-sm font-bold ${getOrderStatusClass(
                    orderStatus
                  )}`}
                >
                  {formatStatus(
                    orderStatus
                  )}
                </div>

                {paymentMethod ===
                  "seller_qr" &&
                  sellerPaymentVerified &&
                  orderStatus ===
                    "confirmed" && (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-center">

                    <p className="text-sm font-black text-green-800">
                      ✓ Payment verified and order confirmed
                    </p>

                  </div>
                )}

                {paymentMethod ===
                  "seller_qr" &&
                  sellerPaymentStatus ===
                    "paid" &&
                  orderStatus !==
                    "confirmed" && (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-center">

                    <p className="text-sm font-black text-green-800">
                      ✓ Seller payment verified
                    </p>

                    <p className="mt-1 text-xs text-green-700">
                      Current order status:{" "}
                      {formatStatus(
                        orderStatus
                      )}
                    </p>

                  </div>
                )}

                {orderStatus ===
                  "delivered" && (
                  <p className="mt-3 text-center text-xs text-gray-500">
                    This order has already been
                    delivered.
                  </p>
                )}

              </section>

            )}

          </aside>

        </div>

      </main>

    </div>
  );
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
| GET NEXT STATUS
|--------------------------------------------------------------------------
*/

function getNextStatus(
  currentStatus
) {
  switch (
    currentStatus
  ) {
    case "pending":
      return "confirmed";

    case "confirmed":
      return "processing";

    case "processing":
      return "packed";

    case "packed":
      return "out_for_delivery";

    case "out_for_delivery":
      return "delivered";

    default:
      return "";
  }
}

