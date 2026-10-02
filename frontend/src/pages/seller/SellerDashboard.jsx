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
import SellerStatCard from "../../components/seller/SellerStatCard.jsx";
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
      "Seller authentication token is missing. Please login again."
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
| GET SELLER ITEMS
|--------------------------------------------------------------------------
*/

function getSellerItems(
  order
) {
  return Array.isArray(
    order?.items
  )
    ? order.items
    : [];
}

/*
|--------------------------------------------------------------------------
| GET ITEM SUBTOTAL
|--------------------------------------------------------------------------
*/

function getItemSubtotal(
  item
) {
  const subtotal =
    Number(
      item?.subtotal
    );

  if (
    Number.isFinite(
      subtotal
    )
  ) {
    return subtotal;
  }

  const quantity =
    Number(
      item?.quantity || 0
    );

  const price =
    Number(
      item?.priceAtPurchase ??
        item?.price ??
        item?.unitPrice ??
        item?.product
          ?.price ??
        0
    );

  if (
    !Number.isFinite(
      quantity
    ) ||
    !Number.isFinite(
      price
    )
  ) {
    return 0;
  }

  return (
    quantity *
    price
  );
}

/*
|--------------------------------------------------------------------------
| SELLER SALES CALCULATION
|--------------------------------------------------------------------------
|
| PAYMENT CHANNELS
|
| Delivered + Razorpay + Paid
|   => UPI / ONLINE
|
| Delivered + Seller QR + Seller Payment Paid
|   => SELLER QR
|
| Delivered + COD + Paid
|   => CASH / COD
|
| IMPORTANT:
| Seller QR orders can contain multiple sellers. The parent order's
| paymentStatus becomes "paid" only after every seller payment is paid.
| Therefore Seller QR sales must be read from this seller's embedded
| sellerPayments record instead of relying on order.paymentStatus.
|
| TOTAL SALES
|   = UPI / ONLINE
|   + SELLER QR
|   + CASH / COD
|
|--------------------------------------------------------------------------
*/

function calculateSellerSales(
  orders
) {
  return orders.reduce(
    (
      sales,
      order
    ) => {
      const orderStatus =
        normalizeStatus(
          order?.orderStatus
        );

      const paymentMethod =
        normalizeStatus(
          order?.paymentMethod
        );

      const paymentStatus =
        normalizeStatus(
          order?.paymentStatus
        );

      /*
      |--------------------------------------------------------------------------
      | ONLY COMPLETED DELIVERED ORDERS
      |--------------------------------------------------------------------------
      */

      if (
        orderStatus !==
        "delivered"
      ) {
        return sales;
      }

      /*
      |--------------------------------------------------------------------------
      | SELLER ITEM VALUE
      |--------------------------------------------------------------------------
      |
      | The seller-order endpoint already filters the order items to the
      | authenticated seller.
      |
      */

      const sellerItems =
        getSellerItems(
          order
        );

      const sellerSubtotal =
        sellerItems.reduce(
          (
            total,
            item
          ) =>
            total +
            getItemSubtotal(
              item
            ),
          0
        );

      /*
      |--------------------------------------------------------------------------
      | UPI / ONLINE - RAZORPAY
      |--------------------------------------------------------------------------
      */

      if (
        paymentMethod ===
          "razorpay" &&
        paymentStatus ===
          "paid"
      ) {
        sales.upi +=
          sellerSubtotal;
      }

      /*
      |--------------------------------------------------------------------------
      | CASH / COD
      |--------------------------------------------------------------------------
      */

      else if (
        paymentMethod ===
          "cod" &&
        paymentStatus ===
          "paid"
      ) {
        sales.cash +=
          sellerSubtotal;
      }

      /*
      |--------------------------------------------------------------------------
      | SELLER QR
      |--------------------------------------------------------------------------
      |
      | Find the payment record belonging to this seller.
      | Count it only when that specific seller payment has been verified.
      |
      */

      else if (
        paymentMethod ===
        "seller_qr"
      ) {
        const sellerId =
          sellerItems.length > 0
            ? String(
                sellerItems[0]?.seller?._id ||
                  sellerItems[0]?.seller ||
                  ""
              )
            : "";

        const sellerPayment =
          Array.isArray(
            order?.sellerPayments
          )
            ? order.sellerPayments.find(
                (
                  payment
                ) =>
                  String(
                    payment?.seller?._id ||
                      payment?.seller ||
                      ""
                  ) ===
                  sellerId
              )
            : null;

        const sellerPaymentStatus =
          normalizeStatus(
            sellerPayment?.status
          );

        if (
          sellerPayment &&
          sellerPaymentStatus ===
            "paid"
        ) {
          const recordedAmount =
            Number(
              sellerPayment.amount
            );

          const sellerQrAmount =
            Number.isFinite(
              recordedAmount
            ) && recordedAmount >= 0
              ? recordedAmount
              : sellerSubtotal;

          sales.sellerQr +=
            sellerQrAmount;
        }
      }

      return sales;
    },
    {
      upi: 0,
      sellerQr: 0,
      cash: 0
    }
  );
}

/*
|--------------------------------------------------------------------------
| MONEY FORMATTER
|--------------------------------------------------------------------------
*/

function formatMoney(
  value
) {
  const amount =
    Number(value) || 0;

  return amount.toLocaleString(
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
| PERCENTAGE
|--------------------------------------------------------------------------
*/

function percentage(
  part,
  total
) {
  if (
    !total ||
    total <= 0
  ) {
    return 0;
  }

  return Math.round(
    (part / total) *
      100
  );
}

/*
|--------------------------------------------------------------------------
| SELLER DASHBOARD
|--------------------------------------------------------------------------
*/

export default function SellerDashboard() {
  const [products, setProducts] =
    useState([]);

  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD DATA
  |--------------------------------------------------------------------------
  */

  const loadDashboard =
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

          const [
            productResponse,
            orderResponse
          ] =
            await Promise.all([
              apiRequest(
                "/api/products/seller/my-products?limit=100"
              ),

              apiRequest(
                "/api/order-management/seller?limit=100"
              )
            ]);

          const loadedProducts =
            Array.isArray(
              productResponse.products
            )
              ? productResponse.products
              : Array.isArray(
                  productResponse.data
                )
              ? productResponse.data
              : [];

          const loadedOrders =
            Array.isArray(
              orderResponse.data
            )
              ? orderResponse.data
              : Array.isArray(
                  orderResponse.orders
                )
              ? orderResponse.orders
              : [];

          setProducts(
            loadedProducts
          );

          setOrders(
            loadedOrders
          );
        } catch (
          err
        ) {
          console.error(
            "Seller dashboard error:",
            err
          );

          setError(
            err.message ||
              "Unable to load seller dashboard."
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
    loadDashboard();
  }, [
    loadDashboard
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
          loadDashboard(
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
    loadDashboard
  ]);

  /*
  |--------------------------------------------------------------------------
  | STATS
  |--------------------------------------------------------------------------
  */

  const stats =
    useMemo(
      () => {
        const approved =
          products.filter(
            (product) =>
              normalizeStatus(
                product?.status
              ) ===
              "approved"
          ).length;

        const pending =
          products.filter(
            (product) =>
              normalizeStatus(
                product?.status
              ) ===
              "pending"
          ).length;

        const rejected =
          products.filter(
            (product) =>
              normalizeStatus(
                product?.status
              ) ===
              "rejected"
          ).length;

        const outOfStock =
          products.filter(
            (product) =>
              normalizeStatus(
                product?.status
              ) ===
                "out_of_stock" ||
              Number(
                product?.stockQuantity
              ) <= 0
          ).length;

        const activeOrders =
          orders.filter(
            (order) =>
              [
                "pending",
                "confirmed",
                "processing",
                "packed",
                "out_for_delivery"
              ].includes(
                normalizeStatus(
                  order?.orderStatus
                )
              )
          ).length;

        const deliveredOrders =
          orders.filter(
            (order) =>
              normalizeStatus(
                order?.orderStatus
              ) ===
              "delivered"
          ).length;

        const cancelledOrders =
          orders.filter(
            (order) =>
              normalizeStatus(
                order?.orderStatus
              ) ===
              "cancelled"
          ).length;

        const sales =
          calculateSellerSales(
            orders
          );

        const totalSales =
          Number(
            (
              sales.upi +
              sales.sellerQr +
              sales.cash
            ).toFixed(2)
          );

        return {
          totalProducts:
            products.length,

          approved,

          pending,

          rejected,

          outOfStock,

          totalOrders:
            orders.length,

          activeOrders,

          deliveredOrders,

          cancelledOrders,

          upiSales:
            Number(
              sales.upi.toFixed(2)
            ),

          sellerQrSales:
            Number(
              sales.sellerQr.toFixed(2)
            ),

          cashSales:
            Number(
              sales.cash.toFixed(2)
            ),

          totalSales,

          approvalRate:
            percentage(
              approved,
              products.length
            ),

          deliveryRate:
            percentage(
              deliveredOrders,
              orders.length
            )
        };
      },
      [
        products,
        orders
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | LOW STOCK
  |--------------------------------------------------------------------------
  */

  const lowStockProducts =
    useMemo(
      () =>
        products
          .filter(
            (product) => {
              const stock =
                Number(
                  product?.stockQuantity ||
                    0
                );

              const threshold =
                Number(
                  product?.lowStockThreshold ??
                    10
                );

              return (
                stock > 0 &&
                stock <=
                  threshold
              );
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              Number(
                a.stockQuantity
              ) -
              Number(
                b.stockQuantity
              )
          )
          .slice(
            0,
            5
          ),
      [products]
    );

  /*
  |--------------------------------------------------------------------------
  | RECENT ORDERS
  |--------------------------------------------------------------------------
  */

  const recentOrders =
    useMemo(
      () =>
        [...orders]
          .sort(
            (
              a,
              b
            ) =>
              new Date(
                b?.createdAt ||
                  0
              ) -
              new Date(
                a?.createdAt ||
                  0
              )
          )
          .slice(
            0,
            6
          ),
      [orders]
    );

  /*
  |--------------------------------------------------------------------------
  | SALES CHANNEL PERCENTAGES
  |--------------------------------------------------------------------------
  */

  const upiPercentage =
    percentage(
      stats.upiSales,
      stats.totalSales
    );

  const sellerQrPercentage =
    percentage(
      stats.sellerQrSales,
      stats.totalSales
    );

  const cashPercentage =
    percentage(
      stats.cashSales,
      stats.totalSales
    );

  /*
  |--------------------------------------------------------------------------
  | GREETING
  |--------------------------------------------------------------------------
  */

  let sellerName =
    "Seller";

  try {
    const user =
      JSON.parse(
        localStorage.getItem(
          "user"
        ) || "null"
      );

    if (
      user?.name
    ) {
      sellerName =
        user.name.split(
          " "
        )[0];
    }
  } catch {
    sellerName =
      "Seller";
  }

  return (
    <div className="min-h-screen bg-[#f5f8f7] text-slate-900">

      {/* ================================================================ */}
      {/* SIDEBAR                                                          */}
      {/* ================================================================ */}

      <SellerSidebar />

      {/* ================================================================ */}
      {/* MAIN                                                             */}
      {/* ================================================================ */}

      <main className="lg:ml-72">

        <div className="mx-auto max-w-[1700px] px-4 py-4 sm:px-6 lg:px-8 lg:py-7">

          {/* ============================================================ */}
          {/* HEADER                                                       */}
          {/* ============================================================ */}

          <SellerHeader
            title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${sellerName} 👋`}
            subtitle="Here is your marketplace pulse — sales, inventory and orders at a glance."
            onRefresh={() =>
              loadDashboard(
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
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm font-black text-red-800">
                  Dashboard update failed
                </p>

                <p className="mt-1 text-xs text-red-600">
                  {error}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  loadDashboard()
                }
                className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700"
              >
                Try Again
              </button>

            </div>
          )}

          {/* ============================================================ */}
          {/* HERO KPI                                                      */}
          {/* ============================================================ */}

          <section className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">

            {/* ========================================================== */}
            {/* SALES HERO                                                  */}
            {/* ========================================================== */}

            <div className="relative overflow-hidden rounded-[30px] bg-[#07130f] p-6 text-white shadow-[0_25px_80px_rgba(5,20,14,0.16)] sm:p-8 lg:p-10">

              <div className="pointer-events-none absolute inset-0">

                <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

                <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-teal-300/10 blur-3xl" />

                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-emerald-400/[0.05] to-transparent" />

              </div>

              <div className="relative">

                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">

                  <div>

                    <div className="flex items-center gap-2">

                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-lg">
                        ₹
                      </span>

                      <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/70">
                        Completed Sales
                      </span>

                    </div>

                    <p className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                      ₹
                      {formatMoney(
                        stats.totalSales
                      )}
                    </p>

                    <p className="mt-2 text-sm text-white/45">
                      Sales from delivered and paid orders
                    </p>

                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 backdrop-blur-xl">

                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                      Delivered
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {
                        stats.deliveredOrders
                      }
                    </p>

                    <p className="mt-1 text-xs text-emerald-300">
                      completed orders
                    </p>

                  </div>

                </div>

                {/* SALES CHANNELS */}

                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                  {/* ====================================================== */}
                  {/* UPI / ONLINE                                           */}
                  {/* ====================================================== */}

                  <div className="rounded-2xl border border-blue-300/10 bg-blue-400/[0.07] p-5">

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10 text-lg">
                          📱
                        </div>

                        <div>

                          <p className="text-xs font-bold text-blue-200/70">
                            UPI / ONLINE
                          </p>

                          <p className="mt-1 text-xl font-black">
                            ₹
                            {formatMoney(
                              stats.upiSales
                            )}
                          </p>

                        </div>

                      </div>

                      <span className="rounded-full bg-blue-400/10 px-2.5 py-1 text-[10px] font-black text-blue-200">
                        {upiPercentage}%
                      </span>

                    </div>

                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">

                      <div
                        className="h-full rounded-full bg-blue-400 transition-all duration-700"
                        style={{
                          width: `${upiPercentage}%`
                        }}
                      />

                    </div>

                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200/40">
                      Razorpay completed
                    </p>

                  </div>

                  {/* ====================================================== */}
                  {/* SELLER QR                                               */}
                  {/* ====================================================== */}

                  <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.07] p-5">

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-lg">
                          ▣
                        </div>

                        <div>

                          <p className="text-xs font-bold text-emerald-200/70">
                            SELLER QR
                          </p>

                          <p className="mt-1 text-xl font-black">
                            ₹
                            {formatMoney(
                              stats.sellerQrSales
                            )}
                          </p>

                        </div>

                      </div>

                      <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-200">
                        {sellerQrPercentage}%
                      </span>

                    </div>

                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">

                      <div
                        className="h-full rounded-full bg-emerald-300 transition-all duration-700"
                        style={{
                          width: `${sellerQrPercentage}%`
                        }}
                      />

                    </div>

                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/40">
                      Verified seller QR payments
                    </p>

                  </div>

                  {/* ====================================================== */}
                  {/* CASH / COD                                              */}
                  {/* ====================================================== */}

                  <div className="rounded-2xl border border-amber-300/10 bg-amber-400/[0.07] p-5">

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-lg">
                          💵
                        </div>

                        <div>

                          <p className="text-xs font-bold text-amber-200/70">
                            CASH / COD
                          </p>

                          <p className="mt-1 text-xl font-black">
                            ₹
                            {formatMoney(
                              stats.cashSales
                            )}
                          </p>

                        </div>

                      </div>

                      <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-black text-amber-200">
                        {cashPercentage}%
                      </span>

                    </div>

                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">

                      <div
                        className="h-full rounded-full bg-amber-300 transition-all duration-700"
                        style={{
                          width: `${cashPercentage}%`
                        }}
                      />

                    </div>

                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/40">
                      Completed COD collections
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* ========================================================== */}
            {/* QUICK HEALTH                                                */}
            {/* ========================================================== */}

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">

              <div className="rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-[0_15px_50px_rgba(15,23,42,0.05)]">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Order Flow
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {
                        stats.activeOrders
                      }
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      active orders
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                    🚚
                  </div>

                </div>

                <div className="mt-5 flex items-center justify-between text-xs">

                  <span className="font-semibold text-slate-400">
                    {stats.deliveryRate}% delivered
                  </span>

                  <span className="font-bold text-emerald-600">
                    {stats.deliveredOrders} completed
                  </span>

                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-700"
                    style={{
                      width: `${stats.deliveryRate}%`
                    }}
                  />

                </div>

              </div>

              <div className="rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-[0_15px_50px_rgba(15,23,42,0.05)]">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Inventory
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {
                        stats.totalProducts
                      }
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      products listed
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-50 text-xl">
                    🥬
                  </div>

                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">

                  <MiniMetric
                    label="Live"
                    value={
                      stats.approved
                    }
                    className="text-emerald-600"
                  />

                  <MiniMetric
                    label="Pending"
                    value={
                      stats.pending
                    }
                    className="text-amber-600"
                  />

                  <MiniMetric
                    label="Low"
                    value={
                      lowStockProducts.length
                    }
                    className="text-orange-600"
                  />

                </div>

              </div>

            </div>

          </section>

          {/* ============================================================ */}
          {/* STANDARD STATS                                                */}
          {/* ============================================================ */}

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <SellerStatCard
              title="Total Products"
              value={
                stats.totalProducts
              }
              icon="◈"
              description="Products listed by you"
              loading={
                loading
              }
            />

            <SellerStatCard
              title="Approved"
              value={
                stats.approved
              }
              icon="✓"
              description={`${stats.approvalRate}% of listed products`}
              loading={
                loading
              }
            />

            <SellerStatCard
              title="Active Orders"
              value={
                stats.activeOrders
              }
              icon="↗"
              description="Orders currently moving"
              loading={
                loading
              }
            />

            <SellerStatCard
              title="Cancelled"
              value={
                stats.cancelledOrders
              }
              icon="×"
              description="Orders cancelled"
              loading={
                loading
              }
            />

          </section>

          {/* ============================================================ */}
          {/* MAIN CONTENT                                                  */}
          {/* ============================================================ */}

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">

            {/* ========================================================== */}
            {/* RECENT ORDERS                                               */}
            {/* ========================================================== */}

            <div className="overflow-hidden rounded-[30px] border border-slate-200/70 bg-white shadow-[0_15px_50px_rgba(15,23,42,0.05)]">

              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:px-7">

                <div>

                  <div className="flex items-center gap-2">

                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg">
                      ▣
                    </span>

                    <h2 className="text-lg font-black text-slate-950">
                      Recent Orders
                    </h2>

                  </div>

                  <p className="mt-2 text-sm text-slate-400">
                    Latest activity across your products
                  </p>

                </div>

                <Link
                  to="/seller/orders"
                  className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  View all
                  <span>
                    →
                  </span>
                </Link>

              </div>

              {recentOrders.length ===
              0 ? (

                <EmptyState
                  icon="📦"
                  title="No orders yet"
                  text="Orders containing your products will appear here."
                />

              ) : (

                <div className="divide-y divide-slate-100">

                  {recentOrders.map(
                    (
                      order
                    ) => {

                      const items =
                        getSellerItems(
                          order
                        );

                      const itemTotal =
                        items.reduce(
                          (
                            total,
                            item
                          ) =>
                            total +
                            getItemSubtotal(
                              item
                            ),
                          0
                        );

                      const status =
                        normalizeStatus(
                          order?.orderStatus
                        );

                      return (
                        <div
                          key={
                            order._id
                          }
                          className="group flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-7"
                        >

                          <div className="flex min-w-0 items-center gap-4">

                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg transition group-hover:scale-105">
                              📦
                            </div>

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <p className="font-black text-slate-900">
                                  #
                                  {order.orderNumber ||
                                    String(
                                      order._id
                                    ).slice(
                                      -8
                                    )}
                                </p>

                                <SellerStatusBadge
                                  status={
                                    status
                                  }
                                />

                              </div>

                              <p className="mt-1 text-xs text-slate-400">

                                {items.length}{" "}
                                item
                                {items.length ===
                                1
                                  ? ""
                                  : "s"}

                                {" • "}

                                {order.createdAt
                                  ? new Date(
                                      order.createdAt
                                    ).toLocaleDateString(
                                      "en-IN"
                                    )
                                  : ""}

                              </p>

                            </div>

                          </div>

                          <div className="flex items-center justify-between gap-6 sm:justify-end">

                            <div className="text-right">

                              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                                Your value
                              </p>

                              <p className="mt-1 text-base font-black text-slate-900">
                                ₹
                                {formatMoney(
                                  itemTotal
                                )}
                              </p>

                            </div>

                            <Link
                              to={`/seller/orders/${order._id}`}
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              →
                            </Link>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

            {/* ========================================================== */}
            {/* INVENTORY                                                   */}
            {/* ========================================================== */}

            <div className="overflow-hidden rounded-[30px] border border-slate-200/70 bg-white shadow-[0_15px_50px_rgba(15,23,42,0.05)]">

              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

                <div>

                  <div className="flex items-center gap-2">

                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-lg">
                      !
                    </span>

                    <h2 className="text-lg font-black text-slate-950">
                      Inventory Health
                    </h2>

                  </div>

                  <p className="mt-2 text-sm text-slate-400">
                    Products needing attention
                  </p>

                </div>

                <Link
                  to="/seller/products"
                  className="text-xs font-black text-emerald-700 hover:text-emerald-800"
                >
                  Manage
                </Link>

              </div>

              {lowStockProducts.length ===
              0 ? (

                <div className="px-6 py-12 text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                    ✓
                  </div>

                  <p className="mt-4 text-sm font-black text-slate-900">
                    Inventory looks healthy
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    No products are currently below their low-stock threshold.
                  </p>

                </div>

              ) : (

                <div className="divide-y divide-slate-100">

                  {lowStockProducts.map(
                    (
                      product
                    ) => {

                      const stock =
                        Number(
                          product?.stockQuantity ||
                            0
                        );

                      const threshold =
                        Number(
                          product?.lowStockThreshold ??
                            10
                        );

                      const stockPercentage =
                        Math.min(
                          Math.max(
                            (stock /
                              Math.max(
                                threshold,
                                1
                              )) *
                              100,
                            5
                          ),
                          100
                        );

                      return (
                        <div
                          key={
                            product._id
                          }
                          className="px-6 py-5"
                        >

                          <div className="flex items-center justify-between gap-4">

                            <div className="flex min-w-0 items-center gap-3">

                              {product.images?.[0]
                                ?.url ? (

                                <img
                                  src={
                                    product
                                      .images[0]
                                      .url
                                  }
                                  alt={
                                    product.name
                                  }
                                  className="h-12 w-12 rounded-2xl object-cover"
                                />

                              ) : (

                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                                  🥬
                                </div>

                              )}

                              <div className="min-w-0">

                                <p className="truncate text-sm font-black text-slate-900">
                                  {
                                    product.name
                                  }
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  ₹
                                  {formatMoney(
                                    product.price
                                  )}
                                  {" / "}
                                  {
                                    product.unit
                                  }
                                </p>

                              </div>

                            </div>

                            <div className="text-right">

                              <p className="text-sm font-black text-orange-600">
                                {stock}
                              </p>

                              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                left
                              </p>

                            </div>

                          </div>

                          <div className="mt-4 flex items-center gap-3">

                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">

                              <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-300 to-orange-500"
                                style={{
                                  width: `${stockPercentage}%`
                                }}
                              />

                            </div>

                            <span className="text-[10px] font-bold text-slate-400">
                              threshold{" "}
                              {threshold}
                            </span>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

          </section>

          {/* ============================================================ */}
          {/* SALES BREAKDOWN DETAIL                                        */}
          {/* ============================================================ */}

          <section className="mt-6 overflow-hidden rounded-[30px] border border-slate-200/70 bg-white shadow-[0_15px_50px_rgba(15,23,42,0.05)]">

            <div className="flex flex-col justify-between gap-4 px-6 py-6 sm:flex-row sm:items-center sm:px-8">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Revenue Mix
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Where your sales come from
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Only completed delivered payments are included.
                </p>

                <p className="mt-2 text-xs font-semibold text-slate-400">
                  Seller QR uses the verified seller payment amount. UPI / Online and COD use your seller item value.
                </p>

              </div>

              <Link
                to="/seller/orders"
                className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700"
              >
                Review orders
                <span>
                  →
                </span>
              </Link>

            </div>

            <div className="grid gap-4 border-t border-slate-100 p-6 sm:grid-cols-2 xl:grid-cols-4 sm:p-8">

              {/* TOTAL */}

              <div className="rounded-2xl bg-slate-950 p-6 text-white">

                <p className="text-xs font-black uppercase tracking-[0.15em] text-white/35">
                  Total
                </p>

                <p className="mt-3 text-3xl font-black">
                  ₹
                  {formatMoney(
                    stats.totalSales
                  )}
                </p>

                <p className="mt-2 text-xs text-white/40">
                  UPI + seller QR + cash collections
                </p>

              </div>

              {/* UPI */}

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">

                <div className="flex items-start justify-between">

                  <div>

                    <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-500">
                      UPI / Online
                    </p>

                    <p className="mt-3 text-3xl font-black text-blue-900">
                      ₹
                      {formatMoney(
                        stats.upiSales
                      )}
                    </p>

                    <p className="mt-2 text-xs text-blue-600">
                      {upiPercentage}% of sales
                    </p>

                  </div>

                  <span className="text-2xl">
                    📱
                  </span>

                </div>

              </div>

              {/* SELLER QR */}

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">

                <div className="flex items-start justify-between">

                  <div>

                    <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-600">
                      Seller QR
                    </p>

                    <p className="mt-3 text-3xl font-black text-emerald-900">
                      ₹
                      {formatMoney(
                        stats.sellerQrSales
                      )}
                    </p>

                    <p className="mt-2 text-xs text-emerald-600">
                      {sellerQrPercentage}% of sales
                    </p>

                  </div>

                  <span className="text-2xl">
                    ▣
                  </span>

                </div>

              </div>

              {/* CASH */}

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">

                <div className="flex items-start justify-between">

                  <div>

                    <p className="text-xs font-black uppercase tracking-[0.15em] text-amber-500">
                      Cash / COD
                    </p>

                    <p className="mt-3 text-3xl font-black text-amber-900">
                      ₹
                      {formatMoney(
                        stats.cashSales
                      )}
                    </p>

                    <p className="mt-2 text-xs text-amber-600">
                      {cashPercentage}% of sales
                    </p>

                  </div>

                  <span className="text-2xl">
                    💵
                  </span>

                </div>

              </div>

            </div>

          </section>

          {/* ============================================================ */}
          {/* QUICK ACTIONS                                                 */}
          {/* ============================================================ */}

          <section className="mt-6 grid gap-4 md:grid-cols-3">

            <QuickAction
              to="/seller/products/add"
              icon="＋"
              title="Add Product"
              text="List a fresh vegetable with real images and harvest information."
            />

            <QuickAction
              to="/seller/products"
              icon="◈"
              title="Manage Inventory"
              text="Update stock, prices, harvest dates and product details."
            />

            <QuickAction
              to="/seller/orders"
              icon="▣"
              title="Manage Orders"
              text="Process orders and move deliveries through the correct workflow."
            />

          </section>

        </div>

      </main>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| MINI METRIC
|--------------------------------------------------------------------------
*/

function MiniMetric({
  label,
  value,
  className = ""
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">

      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-black ${className}`}
      >
        {value}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| EMPTY STATE
|--------------------------------------------------------------------------
*/

function EmptyState({
  icon,
  title,
  text
}) {
  return (
    <div className="px-6 py-14 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
        {icon}
      </div>

      <h3 className="mt-5 text-base font-black text-slate-900">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
        {text}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| QUICK ACTION
|--------------------------------------------------------------------------
*/

function QuickAction({
  to,
  icon,
  title,
  text
}) {
  return (
    <Link
      to={to}
      className="group rounded-[26px] border border-slate-200/70 bg-white p-6 shadow-[0_15px_50px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_20px_60px_rgba(16,185,129,0.10)]"
    >

      <div className="flex items-start justify-between gap-4">

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white transition group-hover:bg-emerald-600">
          {icon}
        </div>

        <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600">
          →
        </span>

      </div>

      <h3 className="mt-6 text-lg font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {text}
      </p>

    </Link>
  );
}