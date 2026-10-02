import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { Link } from "react-router-dom";
import { io } from "socket.io-client";

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

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API_URL.replace(/\/api\/?$/, "");

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
    response =
      await fetch(
        `${API_URL}${url}`,
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

            ...(options.headers ||
              {})
          },

          cache:
            "no-store"
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
      .catch(
        () => ({})
      );

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
| FORMAT MONEY
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
| SAFE NUMBER
|--------------------------------------------------------------------------
*/

function safeNumber(
  value
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

/*
|--------------------------------------------------------------------------
| DASHBOARD SNAPSHOT
|--------------------------------------------------------------------------
*/

function createDashboardSnapshot(
  data
) {
  const users =
    data?.users || {};

  const sellers =
    data?.sellers || {};

  const products =
    data?.products || {};

  const orders =
    data?.orders || {};

  return {
    totalUsers:
      safeNumber(
        users.total
      ),

    customers:
      safeNumber(
        users.customers
      ),

    sellers:
      safeNumber(
        users.sellers
      ),

    pendingSellers:
      safeNumber(
        sellers.pending
      ),

    approvedSellers:
      safeNumber(
        sellers.approved
      ),

    totalProducts:
      safeNumber(
        products.total
      ),

    pendingProducts:
      safeNumber(
        products.pending
      ),

    approvedProducts:
      safeNumber(
        products.approved
      ),

    outOfStock:
      safeNumber(
        products.outOfStock
      ),

    totalOrders:
      safeNumber(
        orders.total
      ),

    activeOrders:
      safeNumber(
        orders.active
      ),

    deliveredOrders:
      safeNumber(
        orders.delivered
      ),

    revenue:
      safeNumber(
        data?.revenue
      )
  };
}

/*
|--------------------------------------------------------------------------
| ADMIN DASHBOARD
|--------------------------------------------------------------------------
*/

export default function AdminDashboard() {
  const [
    dashboard,
    setDashboard
  ] = useState(null);

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

  const socketRefreshTimerRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD DASHBOARD
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

          const response =
            await request(
              "/api/admin/dashboard"
            );

          const data =
            response.data ||
            response.stats ||
            response.dashboard ||
            {};

          setDashboard(
            data
          );
        } catch (
          err
        ) {
          console.error(
            "Admin dashboard loading error:",
            err
          );

          const message =
            err.message ||
            "Unable to load dashboard.";

          setError(
            message
          );

          // Initial-load errors are already shown in the dashboard error bar.
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
  | REAL-TIME ADMIN SOCKET
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      return undefined;
    }

    const socket = io(
      SOCKET_URL,
      {
        auth: {
          token
        },

        transports: [
          "websocket",
          "polling"
        ]
      }
    );

    const scheduleDashboardRefresh = () => {
      if (
        socketRefreshTimerRef.current
      ) {
        clearTimeout(
          socketRefreshTimerRef.current
        );
      }

      socketRefreshTimerRef.current =
        setTimeout(() => {
          loadDashboard(true);

          socketRefreshTimerRef.current =
            null;
        }, 500);
    };

    const handleProductUpdate = () => {
      scheduleDashboardRefresh();
    };

    const handleSellerUpdate = () => {
      scheduleDashboardRefresh();
    };

    const handleOrderUpdate = () => {
      scheduleDashboardRefresh();
    };

    socket.on(
      "product:status-updated",
      handleProductUpdate
    );

    socket.on(
      "seller:approval-updated",
      handleSellerUpdate
    );

    socket.on(
      "seller:status-updated",
      handleSellerUpdate
    );

    socket.on(
      "order:status-updated",
      handleOrderUpdate
    );

    socket.on(
      "order:updated",
      handleOrderUpdate
    );

    socket.on(
      "connect_error",
      (socketError) => {
        console.warn(
          "Admin dashboard Socket.IO connection error:",
          socketError?.message ||
            socketError
        );
      }
    );

    return () => {
      socket.off(
        "product:status-updated",
        handleProductUpdate
      );

      socket.off(
        "seller:approval-updated",
        handleSellerUpdate
      );

      socket.off(
        "seller:status-updated",
        handleSellerUpdate
      );

      socket.off(
        "order:status-updated",
        handleOrderUpdate
      );

      socket.off(
        "order:updated",
        handleOrderUpdate
      );

      socket.disconnect();

      if (
        socketRefreshTimerRef.current
      ) {
        clearTimeout(
          socketRefreshTimerRef.current
        );

        socketRefreshTimerRef.current =
          null;
      }
    };
  }, [
    loadDashboard
  ]);

  /*
  |--------------------------------------------------------------------------
  | AUTO REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timer =
      setInterval(
        () => {
          loadDashboard(
            true
          );
        },
        15000
      );

    return () =>
      clearInterval(
        timer
      );
  }, [
    loadDashboard
  ]);

  /*
  |--------------------------------------------------------------------------
  | NORMALIZED DASHBOARD DATA
  |--------------------------------------------------------------------------
  */

  const stats =
    useMemo(
      () =>
        createDashboardSnapshot(
          dashboard || {}
        ),
      [
        dashboard
      ]
    );

  const sellerApprovalRate =
    stats.sellers > 0
      ? Math.round(
          (stats.approvedSellers /
            stats.sellers) *
            100
        )
      : 0;

  const productApprovalRate =
    stats.totalProducts > 0
      ? Math.round(
          (stats.approvedProducts /
            stats.totalProducts) *
            100
        )
      : 0;

  const deliveryRate =
    stats.totalOrders > 0
      ? Math.round(
          (stats.deliveredOrders /
            stats.totalOrders) *
            100
        )
      : 0;

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030807] text-white">

      {/* ================================================================ */}
      {/* AMBIENT LIGHT                                                    */}
      {/* ================================================================ */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div className="absolute -left-40 top-[-120px] h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-[140px]" />

        <div className="absolute right-[-120px] top-[12%] h-[520px] w-[520px] rounded-full bg-cyan-400/8 blur-[140px]" />

        <div className="absolute bottom-[-180px] left-[30%] h-[520px] w-[520px] rounded-full bg-violet-400/7 blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.9) 1px, transparent 1px)",

            backgroundSize:
              "44px 44px"
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

          <div className="relative">

            <AdminHeader
              title="Admin Command Center"
              subtitle="Monitor marketplace sellers, products, orders and revenue in real time."
              onRefresh={() =>
                loadDashboard(
                  true
                )
              }
              refreshing={
                refreshing
              }
            />

          </div>

          {/* ============================================================ */}
          {/* SIGNAL BAR                                                    */}
          {/* ============================================================ */}

          <section className="mt-5 flex flex-col justify-between gap-4 rounded-[24px] border border-white/8 bg-white/[0.035] px-5 py-4 backdrop-blur-xl sm:flex-row sm:items-center">

            <div className="flex items-center gap-3">

              <div className="relative flex h-3 w-3">

                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400/50" />

                <span className="relative h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,1)]" />

              </div>

              <div>

                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-white/25">
                  Commerce Network
                </p>

                <p className="mt-1 text-xs font-bold text-emerald-300">
                  Live monitoring active
                </p>

              </div>

            </div>

            <div className="flex flex-wrap items-center gap-3 text-[8px] font-black uppercase tracking-[0.16em] text-white/20">

              <span>
                AUTO SYNC 15S
              </span>

              <span>
                •
              </span>

              <span>
                {stats.totalUsers} USERS
              </span>

              <span>
                •
              </span>

              <span>
                {stats.totalProducts} PRODUCTS
              </span>

              <span>
                •
              </span>

              <span>
                {stats.totalOrders} ORDERS
              </span>

            </div>

          </section>

          {/* ============================================================ */}
          {/* ERROR                                                         */}
          {/* ============================================================ */}

          {error && (
            <section className="mt-5 rounded-[24px] border border-red-400/20 bg-red-500/[0.07] px-5 py-4">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-sm font-black text-red-200">
                    Dashboard stream error
                  </p>

                  <p className="mt-1 text-xs text-red-200/50">
                    {error}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    loadDashboard()
                  }
                  className="w-fit rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-2.5 text-xs font-black text-red-100 transition hover:bg-red-500/20"
                >
                  Retry
                </button>

              </div>

            </section>
          )}

          {/* ============================================================ */}
          {/* LOADING                                                       */}
          {/* ============================================================ */}

          {loading && (
            <section className="mt-5 rounded-[30px] border border-white/8 bg-white/[0.025] p-16 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] text-2xl text-cyan-300">
                ⚡
              </div>

              <p className="mt-5 text-sm font-black text-white/75">
                Synchronizing admin command center...
              </p>

              <p className="mt-2 text-xs text-white/25">
                Pulling the latest marketplace statistics.
              </p>

            </section>
          )}

          {!loading && (
            <>
              {/* ======================================================== */}
              {/* TOP METRICS                                               */}
              {/* ======================================================== */}

              <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

                <MetricCard
                  label="Total Users"
                  value={
                    stats.totalUsers
                  }
                  icon="◎"
                  accent="cyan"
                />

                <MetricCard
                  label="Sellers"
                  value={
                    stats.sellers
                  }
                  icon="👨‍🌾"
                  accent="emerald"
                />

                <MetricCard
                  label="Products"
                  value={
                    stats.totalProducts
                  }
                  icon="🥬"
                  accent="violet"
                />

                <MetricCard
                  label="Orders"
                  value={
                    stats.totalOrders
                  }
                  icon="▣"
                  accent="amber"
                />

                <MetricCard
                  label="Revenue"
                  value={`₹${formatMoney(
                    stats.revenue
                  )}`}
                  icon="₹"
                  accent="emerald"
                />

              </section>

              {/* ======================================================== */}
              {/* MARKETPLACE OVERVIEW                                      */}
              {/* ======================================================== */}

              <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">

                <div className="relative overflow-hidden rounded-[32px] border border-emerald-300/10 bg-gradient-to-br from-[#071714] via-[#04110e] to-[#020706] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.38)] sm:p-8">

                  <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-[100px]" />

                  <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-[100px]" />

                  <div className="relative">

                    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">

                      <div>

                        <div className="flex items-center gap-3">

                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl text-emerald-300">
                            ₹
                          </div>

                          <div>

                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300/45">
                              Marketplace revenue
                            </p>

                            <p className="mt-1 text-xs text-white/25">
                              Paid commerce throughput
                            </p>

                          </div>

                        </div>

                        <p className="mt-6 text-4xl font-black tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                          ₹
                          {formatMoney(
                            stats.revenue
                          )}
                        </p>

                        <p className="mt-3 text-xs text-white/25">
                          Revenue reported by the admin dashboard endpoint.
                        </p>

                      </div>

                      <div className="rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.05] px-5 py-4">

                        <p className="text-[8px] font-black uppercase tracking-[0.17em] text-white/25">
                          Delivery ratio
                        </p>

                        <p className="mt-2 text-2xl font-black text-cyan-300">
                          {deliveryRate}%
                        </p>

                        <p className="mt-1 text-[10px] text-cyan-300/40">
                          delivered / total orders
                        </p>

                      </div>

                    </div>

                    <div className="mt-9 grid gap-4 sm:grid-cols-3">

                      <OverviewTile
                        label="Active orders"
                        value={
                          stats.activeOrders
                        }
                        text="Orders moving through fulfilment"
                        accent="cyan"
                      />

                      <OverviewTile
                        label="Delivered"
                        value={
                          stats.deliveredOrders
                        }
                        text="Completed customer deliveries"
                        accent="emerald"
                      />

                      <OverviewTile
                        label="Out of stock"
                        value={
                          stats.outOfStock
                        }
                        text="Products requiring stock attention"
                        accent="amber"
                      />

                    </div>

                  </div>

                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <SignalCard
                    label="Pending sellers"
                    value={
                      stats.pendingSellers
                    }
                    text="Seller applications waiting for review."
                    icon="⏳"
                    accent="amber"
                  />

                  <SignalCard
                    label="Approved sellers"
                    value={
                      stats.approvedSellers
                    }
                    text="Sellers currently approved in the marketplace."
                    icon="✓"
                    accent="emerald"
                  />

                  <SignalCard
                    label="Pending products"
                    value={
                      stats.pendingProducts
                    }
                    text="Products waiting for admin review."
                    icon="◌"
                    accent="violet"
                  />

                  <SignalCard
                    label="Approval coverage"
                    value={`${sellerApprovalRate}%`}
                    text="Approved sellers relative to total sellers."
                    icon="%"
                    accent="cyan"
                  />

                </div>

              </section>

              {/* ======================================================== */}
              {/* OPERATIONAL HEALTH                                       */}
              {/* ======================================================== */}

              <section className="mt-5 rounded-[30px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl">

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

                  <div>

                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-300/35">
                      Operational intelligence
                    </p>

                    <h2 className="mt-2 text-xl font-black text-white">
                      Marketplace health
                    </h2>

                    <p className="mt-1 text-xs text-white/25">
                      Current platform ratios derived from live admin statistics.
                    </p>

                  </div>

                  <span className="rounded-xl border border-emerald-300/10 bg-emerald-400/[0.04] px-3 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-emerald-300/60">
                    Monitoring
                  </span>

                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-3">

                  <ProgressCard
                    label="Seller approval"
                    value={
                      sellerApprovalRate
                    }
                    detail={`${stats.approvedSellers} approved of ${stats.sellers} sellers`}
                    accent="emerald"
                  />

                  <ProgressCard
                    label="Product approval"
                    value={
                      productApprovalRate
                    }
                    detail={`${stats.approvedProducts} approved of ${stats.totalProducts} products`}
                    accent="cyan"
                  />

                  <ProgressCard
                    label="Order completion"
                    value={
                      deliveryRate
                    }
                    detail={`${stats.deliveredOrders} delivered of ${stats.totalOrders} orders`}
                    accent="violet"
                  />

                </div>

              </section>

              {/* ======================================================== */}
              {/* QUICK ACTIONS                                             */}
              {/* ======================================================== */}

              <section className="mt-5">

                <div className="mb-4">

                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                    Command shortcuts
                  </p>

                  <h2 className="mt-1 text-2xl font-black tracking-tight">
                    Marketplace management
                  </h2>

                </div>

                <div className="grid gap-4 md:grid-cols-3">

                  <QuickAction
                    to="/admin/sellers"
                    icon="👨‍🌾"
                    title="Manage Sellers"
                    text={`${stats.pendingSellers} pending seller approval${stats.pendingSellers === 1 ? "" : "s"}.`}
                    accent="emerald"
                  />

                  <QuickAction
                    to="/admin/products"
                    icon="🥬"
                    title="Manage Products"
                    text={`${stats.pendingProducts} product${stats.pendingProducts === 1 ? "" : "s"} waiting for review.`}
                    accent="cyan"
                  />

                  <QuickAction
                    to="/admin/orders"
                    icon="▣"
                    title="Manage Orders"
                    text={`${stats.activeOrders} active order${stats.activeOrders === 1 ? "" : "s"} currently in fulfilment.`}
                    accent="violet"
                  />

                </div>

              </section>

              {/* ======================================================== */}
              {/* BOTTOM INTELLIGENCE                                      */}
              {/* ======================================================== */}

              <section className="mt-5 grid gap-4 md:grid-cols-3">

                <InsightCard
                  label="Customer layer"
                  value={
                    stats.customers
                  }
                  text="Registered customer accounts currently recorded."
                  accent="cyan"
                />

                <InsightCard
                  label="Stock layer"
                  value={
                    stats.outOfStock
                  }
                  text="Products currently marked out of stock."
                  accent="amber"
                />

                <InsightCard
                  label="Commerce layer"
                  value={
                    stats.revenue
                      ? `₹${formatMoney(
                          stats.revenue
                        )}`
                      : "₹0.00"
                  }
                  text="Aggregate paid revenue returned by the backend."
                  accent="emerald"
                />

              </section>

            </>
          )}

        </div>

      </main>

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
      "border-cyan-300/10 bg-cyan-400/[0.04] text-cyan-300",

    amber:
      "border-amber-300/10 bg-amber-400/[0.04] text-amber-300",

    violet:
      "border-violet-300/10 bg-violet-400/[0.04] text-violet-300",

    emerald:
      "border-emerald-300/10 bg-emerald-400/[0.04] text-emerald-300"
  };

  return (
    <div
      className={`rounded-[24px] border p-5 backdrop-blur-xl ${
        accents[accent] ||
        "border-white/10 bg-white/[0.025] text-white"
      }`}
    >

      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="text-[8px] font-black uppercase tracking-[0.16em] opacity-40">
            {label}
          </p>

          <p className="mt-3 truncate text-2xl font-black sm:text-3xl">
            {value}
          </p>

        </div>

        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white/[0.045] text-lg">
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
      "border-amber-300/10 bg-amber-400/[0.035] text-amber-300",

    emerald:
      "border-emerald-300/10 bg-emerald-400/[0.035] text-emerald-300",

    cyan:
      "border-cyan-300/10 bg-cyan-400/[0.035] text-cyan-300",

    violet:
      "border-violet-300/10 bg-violet-400/[0.035] text-violet-300"
  };

  return (
    <div
      className={`rounded-[26px] border p-5 backdrop-blur-xl ${
        accents[accent] ||
        "border-white/10 bg-white/[0.025] text-white"
      }`}
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
| OVERVIEW TILE
|--------------------------------------------------------------------------
*/

function OverviewTile({
  label,
  value,
  text,
  accent
}) {
  const accents = {
    cyan:
      "border-cyan-300/10 bg-cyan-400/[0.035] text-cyan-300",

    emerald:
      "border-emerald-300/10 bg-emerald-400/[0.035] text-emerald-300",

    amber:
      "border-amber-300/10 bg-amber-400/[0.035] text-amber-300"
  };

  return (
    <div
      className={`rounded-2xl border p-5 ${
        accents[accent] ||
        "border-white/10 bg-white/[0.025] text-white"
      }`}
    >

      <p className="text-[8px] font-black uppercase tracking-[0.17em] opacity-45">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>

      <p className="mt-2 text-[10px] leading-5 text-white/25">
        {text}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PROGRESS CARD
|--------------------------------------------------------------------------
*/

function ProgressCard({
  label,
  value,
  detail,
  accent
}) {
  const barMap = {
    emerald:
      "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.55)]",

    cyan:
      "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.55)]",

    violet:
      "bg-violet-300 shadow-[0_0_14px_rgba(196,181,253,0.55)]"
  };

  const textMap = {
    emerald:
      "text-emerald-300",

    cyan:
      "text-cyan-300",

    violet:
      "text-violet-300"
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-5">

      <div className="flex items-center justify-between gap-4">

        <p className="text-xs font-black text-white/70">
          {label}
        </p>

        <p
          className={`text-xl font-black ${
            textMap[accent] ||
            "text-white"
          }`}
        >
          {value}%
        </p>

      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">

        <div
          className={`h-full rounded-full transition-all duration-700 ${
            barMap[accent] ||
            "bg-white"
          }`}
          style={{
            width: `${Math.min(
              Math.max(
                safeNumber(
                  value
                ),
                0
              ),
              100
            )}%`
          }}
        />

      </div>

      <p className="mt-3 text-[10px] leading-5 text-white/25">
        {detail}
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
  text,
  accent
}) {
  const map = {
    emerald:
      "border-emerald-300/10 bg-emerald-400/[0.03] hover:border-emerald-300/20 hover:bg-emerald-400/[0.05] text-emerald-300",

    cyan:
      "border-cyan-300/10 bg-cyan-400/[0.03] hover:border-cyan-300/20 hover:bg-cyan-400/[0.05] text-cyan-300",

    violet:
      "border-violet-300/10 bg-violet-400/[0.03] hover:border-violet-300/20 hover:bg-violet-400/[0.05] text-violet-300"
  };

  return (
    <Link
      to={to}
      className={`group rounded-[24px] border p-5 transition duration-300 ${
        map[accent] ||
        "border-white/10 bg-white/[0.025] text-white"
      }`}
    >

      <div className="flex items-start justify-between gap-4">

        <div>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.045] text-lg">
            {icon}
          </div>

          <h3 className="mt-5 text-sm font-black text-white">
            {title}
          </h3>

          <p className="mt-2 text-[10px] leading-5 text-white/25">
            {text}
          </p>

        </div>

        <span className="text-white/20 transition group-hover:translate-x-1 group-hover:text-current">
          →
        </span>

      </div>

    </Link>
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
      "border-emerald-300/10 bg-emerald-400/[0.03] text-emerald-300",

    cyan:
      "border-cyan-300/10 bg-cyan-400/[0.03] text-cyan-300",

    amber:
      "border-amber-300/10 bg-amber-400/[0.03] text-amber-300"
  };

  return (
    <div
      className={`rounded-[24px] border p-5 ${
        map[accent] ||
        "border-white/10 bg-white/[0.025] text-white"
      }`}
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