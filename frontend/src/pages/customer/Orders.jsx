import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link,
  useNavigate
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
| STATUS OPTIONS
|--------------------------------------------------------------------------
*/

const statuses = [
  "",
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

const request = async (
  url,
  options = {}
) => {
  const token =
    localStorage.getItem(
      "token"
    );

  if (!token) {
    throw new Error(
      "Please login to continue."
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
            "Content-Type":
              "application/json",

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
      "Unable to connect to the backend."
    );
  }

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
};

/*
|--------------------------------------------------------------------------
| NORMALIZE STATUS
|--------------------------------------------------------------------------
*/

const normalizeStatus = (
  value
) =>
  String(
    value || ""
  )
    .trim()
    .toLowerCase();

/*
|--------------------------------------------------------------------------
| FORMAT STATUS
|--------------------------------------------------------------------------
*/

const formatStatus = (
  value
) => {
  if (!value) {
    return "Pending";
  }

  return String(value)
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

/*
|--------------------------------------------------------------------------
| ORDER STATUS VISUAL
|--------------------------------------------------------------------------
*/

const getOrderStatusVisual = (
  status
) => {
  switch (
    normalizeStatus(status)
  ) {
    case "pending":
      return {
        label:
          "Pending",
        icon:
          "◌",
        dot:
          "bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,1)]",
        badge:
          "border-amber-300/20 bg-amber-400/[0.07] text-amber-200",
        accent:
          "from-amber-300/60"
      };

    case "confirmed":
      return {
        label:
          "Confirmed",
        icon:
          "✓",
        dot:
          "bg-sky-300 shadow-[0_0_16px_rgba(125,211,252,1)]",
        badge:
          "border-sky-300/20 bg-sky-400/[0.07] text-sky-200",
        accent:
          "from-sky-300/60"
      };

    case "processing":
      return {
        label:
          "Processing",
        icon:
          "↻",
        dot:
          "bg-violet-300 shadow-[0_0_16px_rgba(196,181,253,1)]",
        badge:
          "border-violet-300/20 bg-violet-400/[0.07] text-violet-200",
        accent:
          "from-violet-300/60"
      };

    case "packed":
      return {
        label:
          "Packed",
        icon:
          "▣",
        dot:
          "bg-fuchsia-300 shadow-[0_0_16px_rgba(240,171,252,1)]",
        badge:
          "border-fuchsia-300/20 bg-fuchsia-400/[0.07] text-fuchsia-200",
        accent:
          "from-fuchsia-300/60"
      };

    case "out_for_delivery":
      return {
        label:
          "Out for Delivery",
        icon:
          "➜",
        dot:
          "bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,1)]",
        badge:
          "border-cyan-300/20 bg-cyan-400/[0.07] text-cyan-200",
        accent:
          "from-cyan-300/60"
      };

    case "delivered":
      return {
        label:
          "Delivered",
        icon:
          "✓",
        dot:
          "bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,1)]",
        badge:
          "border-emerald-300/20 bg-emerald-400/[0.07] text-emerald-200",
        accent:
          "from-emerald-300/60"
      };

    case "cancelled":
      return {
        label:
          "Cancelled",
        icon:
          "×",
        dot:
          "bg-red-300 shadow-[0_0_16px_rgba(252,165,165,1)]",
        badge:
          "border-red-300/20 bg-red-400/[0.07] text-red-200",
        accent:
          "from-red-300/60"
      };

    case "returned":
      return {
        label:
          "Returned",
        icon:
          "↩",
        dot:
          "bg-orange-300 shadow-[0_0_16px_rgba(253,186,116,1)]",
        badge:
          "border-orange-300/20 bg-orange-400/[0.07] text-orange-200",
        accent:
          "from-orange-300/60"
      };

    default:
      return {
        label:
          "Unknown",
        icon:
          "?",
        dot:
          "bg-white/40",
        badge:
          "border-white/10 bg-white/[0.03] text-white/55",
        accent:
          "from-white/30"
      };
  }
};

/*
|--------------------------------------------------------------------------
| PAYMENT VISUAL
|--------------------------------------------------------------------------
*/

const getPaymentVisual = (
  status
) => {
  switch (
    normalizeStatus(status)
  ) {
    case "paid":
      return {
        label:
          "Paid",
        icon:
          "✓",
        badge:
          "border-emerald-300/20 bg-emerald-400/[0.07] text-emerald-200"
      };

    case "failed":
      return {
        label:
          "Failed",
        icon:
          "×",
        badge:
          "border-red-300/20 bg-red-400/[0.07] text-red-200"
      };

    case "refunded":
      return {
        label:
          "Refunded",
        icon:
          "↩",
        badge:
          "border-violet-300/20 bg-violet-400/[0.07] text-violet-200"
      };

    default:
      return {
        label:
          "Pending",
        icon:
          "◌",
        badge:
          "border-amber-300/20 bg-amber-400/[0.07] text-amber-200"
      };
  }
};

/*
|--------------------------------------------------------------------------
| ORDERS PAGE
|--------------------------------------------------------------------------
*/

export default function Orders() {
  const navigate =
    useNavigate();

  const [
    orders,
    setOrders
  ] = useState([]);

  const [
    status,
    setStatus
  ] = useState("");

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

  /*
  |--------------------------------------------------------------------------
  | LOAD ORDERS
  |--------------------------------------------------------------------------
  */

  const loadOrders =
    async (
      background = false
    ) => {
      try {
        if (background) {
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
          new URLSearchParams({
            page:
              "1",
            limit:
              "50"
          });

        if (status) {
          params.set(
            "status",
            status
          );
        }

        const response =
          await request(
            `/api/orders/my-orders?${params.toString()}`
          );

        setOrders(
          Array.isArray(
            response.data
          )
            ? response.data
            : []
        );
      } catch (err) {
        console.error(
          "Customer orders error:",
          err
        );

        setError(
          err.message ||
            "Unable to load orders."
        );
      } finally {
        setLoading(
          false
        );

        setRefreshing(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !localStorage.getItem(
        "token"
      )
    ) {
      navigate(
        "/login",
        {
          replace:
            true
        }
      );

      return;
    }

    loadOrders();
  }, [
    status
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
          if (
            localStorage.getItem(
              "token"
            )
          ) {
            loadOrders(
              true
            );
          }
        },
        15000
      );

    return () =>
      clearInterval(
        timer
      );
  }, [
    status
  ]);

  /*
  |--------------------------------------------------------------------------
  | CANCEL ORDER
  |--------------------------------------------------------------------------
  */

  const cancelOrder =
    async (
      order
    ) => {
      const reason =
        window.prompt(
          "Reason for cancellation:"
        );

      if (
        reason ===
        null
      ) {
        return;
      }

      try {
        setError("");

        await request(
          `/api/orders/${order._id}/cancel`,
          {
            method:
              "PATCH",

            body:
              JSON.stringify({
                cancellationReason:
                  reason.trim()
              })
          }
        );

        await loadOrders(
          true
        );
      } catch (err) {
        console.error(
          "Cancel order error:",
          err
        );

        setError(
          err.message ||
            "Unable to cancel order."
        );
      }
    };

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

        const active =
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
              [
                "cancelled",
                "returned"
              ].includes(
                normalizeStatus(
                  order.orderStatus
                )
              )
          ).length;

        const paid =
          orders.filter(
            (order) =>
              normalizeStatus(
                order.paymentStatus
              ) ===
              "paid"
          ).length;

        const totalValue =
          orders.reduce(
            (
              sum,
              order
            ) =>
              sum +
              Number(
                order.totalAmount ||
                  0
              ),
            0
          );

        return {
          total,
          active,
          delivered,
          cancelled,
          paid,
          totalValue
        };
      },
      [
        orders
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <FutureShell>

        <div className="mx-auto flex min-h-[75vh] max-w-3xl items-center justify-center px-6">

          <div className="w-full rounded-[38px] border border-white/10 bg-white/[0.04] p-12 text-center shadow-[0_30px_110px_rgba(0,0,0,0.4)] backdrop-blur-2xl">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-emerald-300/15 bg-emerald-400/[0.06] text-3xl text-emerald-300">

              <span className="animate-pulse">
                ⚡
              </span>

            </div>

            <p className="mt-6 text-xl font-black text-white">
              Loading your order network
            </p>

            <p className="mt-2 text-xs text-white/30">
              Synchronizing the latest commerce activity...
            </p>

            <div className="mx-auto mt-7 h-1.5 max-w-sm overflow-hidden rounded-full bg-white/5">

              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-violet-300" />

            </div>

          </div>

        </div>

      </FutureShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <FutureShell>

      <main className="relative mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

        {/* ============================================================ */}
        {/* TOP BAR                                                       */}
        {/* ============================================================ */}

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] px-5 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-2xl">

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.05] text-xl text-emerald-300">
                ◇
              </div>

              <div>

                <p className="text-[8px] font-black uppercase tracking-[0.24em] text-emerald-300/45">
                  RuralFresh / Customer
                </p>

                <h1 className="mt-1 text-xl font-black text-white">
                  My Orders
                </h1>

              </div>

            </div>

            <div className="flex flex-wrap items-center gap-3">

              <Link
                to="/products"
                className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-[9px] font-black uppercase tracking-wide text-white/50 transition hover:border-emerald-300/20 hover:text-emerald-300"
              >
                Shop Vegetables
              </Link>

              <button
                type="button"
                onClick={() =>
                  loadOrders(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="rounded-xl border border-cyan-300/10 bg-cyan-400/[0.04] px-4 py-2.5 text-[9px] font-black uppercase tracking-wide text-cyan-300/70 transition hover:border-cyan-300/25 hover:text-cyan-300 disabled:opacity-40"
              >
                {refreshing
                  ? "Syncing..."
                  : "↻ Refresh"}
              </button>

            </div>

          </div>

        </section>

        {/* ============================================================ */}
        {/* LIVE NETWORK BAR                                              */}
        {/* ============================================================ */}

        <section className="mt-5 flex flex-col justify-between gap-4 rounded-[24px] border border-white/8 bg-white/[0.025] px-5 py-4 backdrop-blur-xl sm:flex-row sm:items-center">

          <div className="flex items-center gap-3">

            <div className="relative flex h-3 w-3">

              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/50" />

              <span className="relative h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,1)]" />

            </div>

            <div>

              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                Commerce telemetry
              </p>

              <p className="mt-1 text-xs font-bold text-emerald-300">
                Order network connected
              </p>

            </div>

          </div>

          <div className="flex flex-wrap gap-3 text-[8px] font-black uppercase tracking-[0.17em] text-white/20">

            <span>
              LIVE
            </span>

            <span>
              •
            </span>

            <span>
              AUTO SYNC 15S
            </span>

            <span>
              •
            </span>

            <span>
              {orders.length} ORDERS
            </span>

          </div>

        </section>

        {/* ============================================================ */}
        {/* ERROR                                                         */}
        {/* ============================================================ */}

        {error && (
          <section className="mt-5 rounded-[24px] border border-red-300/15 bg-red-500/[0.06] px-5 py-4">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-xs font-black text-red-200">
                  Commerce sync warning
                </p>

                <p className="mt-1 text-[10px] text-red-200/50">
                  {error}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                className="w-fit rounded-xl border border-red-300/15 bg-white/[0.03] px-3 py-2 text-[9px] font-black uppercase tracking-wide text-red-200/70"
              >
                Dismiss
              </button>

            </div>

          </section>
        )}

        {/* ============================================================ */}
        {/* HERO                                                         */}
        {/* ============================================================ */}

        <section className="relative mt-5 overflow-hidden rounded-[38px] border border-emerald-300/10 bg-gradient-to-br from-[#091a15] via-[#06120f] to-[#030807] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.42)] sm:p-8 lg:p-10">

          <div className="pointer-events-none absolute -right-28 -top-32 h-[430px] w-[430px] rounded-full bg-cyan-400/8 blur-[120px]" />

          <div className="pointer-events-none absolute bottom-[-180px] left-[25%] h-[420px] w-[420px] rounded-full bg-emerald-400/10 blur-[120px]" />

          <div className="relative">

            <div className="grid gap-8 xl:grid-cols-[1.35fr_0.65fr]">

              <div>

                <p className="text-[8px] font-black uppercase tracking-[0.24em] text-emerald-300/45">
                  Customer commerce center
                </p>

                <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl">
                  Every purchase.
                  <span className="text-emerald-300">
                    {" "}One live timeline.
                  </span>
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/30">
                  Track your fresh vegetable purchases,
                  monitor fulfilment progress and
                  access your complete transaction history.
                </p>

              </div>

              {/* ====================================================== */}
              {/* STATS                                                    */}
              {/* ====================================================== */}

              <div className="grid grid-cols-2 gap-3">

                <QuickStat
                  label="Orders"
                  value={
                    metrics.total
                  }
                  icon="▣"
                  tone="cyan"
                />

                <QuickStat
                  label="Active"
                  value={
                    metrics.active
                  }
                  icon="↗"
                  tone="violet"
                />

                <QuickStat
                  label="Delivered"
                  value={
                    metrics.delivered
                  }
                  icon="✓"
                  tone="emerald"
                />

                <QuickStat
                  label="Paid"
                  value={
                    metrics.paid
                  }
                  icon="₹"
                  tone="lime"
                />

              </div>

            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">

              <HeroMetric
                label="Commerce value"
                value={`₹${metrics.totalValue.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits:
                      2,
                    maximumFractionDigits:
                      2
                  }
                )}`}
              />

              <HeroMetric
                label="Completed"
                value={
                  metrics.total >
                  0
                    ? `${Math.round(
                        (metrics.delivered /
                          metrics.total) *
                          100
                      )}%`
                    : "0%"
                }
              />

              <HeroMetric
                label="Exceptions"
                value={
                  metrics.cancelled
                }
              />

            </div>

          </div>

        </section>

        {/* ============================================================ */}
        {/* FILTER PANEL                                                   */}
        {/* ============================================================ */}

        <section className="mt-5 rounded-[30px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.23)] backdrop-blur-2xl">

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

            <div>

              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-300/35">
                Order query
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                Filter your order stream
              </h2>

              <p className="mt-1 text-[10px] text-white/25">
                View orders by their current fulfilment state.
              </p>

            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <select
                value={
                  status
                }
                onChange={(
                  event
                ) =>
                  setStatus(
                    event.target.value
                  )
                }
                className="min-w-[230px] rounded-2xl border border-white/10 bg-[#07110f] px-4 py-3.5 text-sm font-semibold text-white/75 outline-none transition focus:border-cyan-300/30"
              >

                <option value="">
                  All Orders
                </option>

                {statuses
                  .filter(Boolean)
                  .map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {formatStatus(
                          item
                        )}
                      </option>
                    )
                  )}

              </select>

              <button
                type="button"
                onClick={() =>
                  setStatus(
                    ""
                  )
                }
                className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-3.5 text-xs font-black text-white/45 transition hover:border-emerald-300/20 hover:text-emerald-300"
              >
                Reset
              </button>

            </div>

          </div>

        </section>

        {/* ============================================================ */}
        {/* RESULTS HEADER                                                  */}
        {/* ============================================================ */}

        <section className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

          <div>

            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
              Transaction stream
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
              {orders.length}{" "}
              order
              {orders.length ===
              1
                ? ""
                : "s"}
            </h2>

          </div>

          <div className="text-[9px] font-black uppercase tracking-[0.17em] text-white/20">
            {refreshing
              ? "Synchronizing..."
              : "Network synchronized"}
          </div>

        </section>

        {/* ============================================================ */}
        {/* EMPTY                                                         */}
        {/* ============================================================ */}

        {!loading &&
          orders.length ===
            0 && (
            <section className="mt-5 rounded-[34px] border border-dashed border-white/10 bg-white/[0.02] p-16 text-center">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-emerald-300/10 bg-emerald-400/[0.04] text-4xl">
                📦
              </div>

              <h2 className="mt-6 text-2xl font-black text-white">
                No orders detected
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/30">
                Your transaction network is currently
                empty for this filter configuration.
              </p>

              <Link
                to="/products"
                className="mt-7 inline-flex rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-black text-white shadow-[0_12px_35px_rgba(16,185,129,0.22)] transition hover:-translate-y-0.5 hover:bg-emerald-400"
              >
                Start Shopping →
              </Link>

            </section>
          )}

        {/* ============================================================ */}
        {/* ORDERS                                                        */}
        {/* ============================================================ */}

        {!loading &&
          orders.length >
            0 && (
            <div className="mt-5 space-y-4">

              {orders.map(
                (
                  order
                ) => {

                  const orderStatus =
                    normalizeStatus(
                      order.orderStatus ||
                        "pending"
                    );

                  const paymentStatus =
                    normalizeStatus(
                      order.paymentStatus ||
                        "pending"
                    );

                  const statusVisual =
                    getOrderStatusVisual(
                      orderStatus
                    );

                  const paymentVisual =
                    getPaymentVisual(
                      paymentStatus
                    );

                  const itemCount =
                    Array.isArray(
                      order.items
                    )
                      ? order.items.length
                      : 0;

                  const total =
                    Number(
                      order.totalAmount ||
                        0
                    );

                  const canCancel =
                    [
                      "pending",
                      "confirmed",
                      "processing"
                    ].includes(
                      orderStatus
                    );

                  return (
                    <article
                      key={
                        order._id
                      }
                      className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.035] shadow-[0_22px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-white/15"
                    >

                      {/* ================================================= */}
                      {/* GLOW RAIL                                           */}
                      {/* ================================================= */}

                      <div
                        className={`absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b ${statusVisual.accent} via-transparent to-transparent opacity-70`}
                      />

                      <div className="p-5 sm:p-6 lg:p-7">

                        {/* ================================================= */}
                        {/* TOP                                                 */}
                        {/* ================================================= */}

                        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">

                          <div className="flex min-w-0 items-start gap-4">

                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border border-white/8 bg-white/[0.035] text-xl text-cyan-300 transition group-hover:border-cyan-300/15 group-hover:bg-cyan-400/[0.05]">

                              ⚡

                            </div>

                            <div className="min-w-0">

                              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/20">
                                Order identity
                              </p>

                              <h3 className="mt-1 truncate text-lg font-black text-white sm:text-xl">

                                #
                                {order.orderNumber ||
                                  String(
                                    order._id
                                  ).slice(
                                    -10
                                  )}

                              </h3>

                              <p className="mt-1 text-[10px] text-white/25">

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

                          <div className="flex flex-wrap gap-2">

                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[8px] font-black uppercase tracking-wide ${statusVisual.badge}`}
                            >

                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusVisual.dot}`}
                              />

                              {statusVisual.label}

                            </span>

                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[8px] font-black uppercase tracking-wide ${paymentVisual.badge}`}
                            >

                              <span>
                                {
                                  paymentVisual.icon
                                }
                              </span>

                              {
                                paymentVisual.label
                              }

                            </span>

                          </div>

                        </div>

                        {/* ================================================= */}
                        {/* METADATA GRID                                       */}
                        {/* ================================================= */}

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                          <OrderDataCard
                            label="Items"
                            value={`${itemCount} item${
                              itemCount ===
                              1
                                ? ""
                                : "s"
                            }`}
                            icon="▣"
                          />

                          <OrderDataCard
                            label="Payment method"
                            value={
                              formatStatus(
                                order.paymentMethod ||
                                  "Not specified"
                              )
                            }
                            icon="◇"
                          />

                          <OrderDataCard
                            label="Payment state"
                            value={
                              formatStatus(
                                order.paymentStatus ||
                                  "pending"
                              )
                            }
                            icon="₹"
                          />

                          <OrderDataCard
                            label="Transaction value"
                            value={`₹${total.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits:
                                  2,
                                maximumFractionDigits:
                                  2
                              }
                            )}`}
                            icon="↗"
                            highlight
                          />

                        </div>

                        {/* ================================================= */}
                        {/* ACTIONS                                             */}
                        {/* ================================================= */}

                        <div className="mt-6 flex flex-col gap-3 border-t border-white/6 pt-5 sm:flex-row sm:items-center sm:justify-between">

                          <div className="flex items-center gap-2">

                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,1)]" />

                            <span className="text-[8px] font-black uppercase tracking-[0.16em] text-white/20">
                              Secured commerce record
                            </span>

                          </div>

                          <div className="flex flex-wrap gap-2">

                            {canCancel && (
                              <button
                                type="button"
                                onClick={() =>
                                  cancelOrder(
                                    order
                                  )
                                }
                                className="rounded-xl border border-red-300/15 bg-red-400/[0.04] px-4 py-2.5 text-[9px] font-black uppercase tracking-wide text-red-200/70 transition hover:border-red-300/25 hover:bg-red-400/[0.08] hover:text-red-200"
                              >
                                Cancel Order
                              </button>
                            )}

                            <Link
                              to={`/orders/${order._id}`}
                              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-[9px] font-black uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(16,185,129,0.18)] transition hover:-translate-y-0.5 hover:bg-emerald-400"
                            >
                              View Details →
                            </Link>

                          </div>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        {/* ============================================================ */}
        {/* BOTTOM STATUS                                                 */}
        {/* ============================================================ */}

        <section className="mt-6 grid gap-4 md:grid-cols-3">

          <InsightCard
            label="Active fulfilment"
            value={
              metrics.active
            }
            text="Orders currently moving through the delivery network."
            tone="cyan"
          />

          <InsightCard
            label="Completed commerce"
            value={
              metrics.delivered
            }
            text="Orders successfully delivered to your destination."
            tone="emerald"
          />

          <InsightCard
            label="Exceptions"
            value={
              metrics.cancelled
            }
            text="Cancelled or returned transactions in your history."
            tone="red"
          />

        </section>

      </main>

    </FutureShell>
  );
}

/*
|--------------------------------------------------------------------------
| FUTURE SHELL
|--------------------------------------------------------------------------
*/

function FutureShell({
  children
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020706] text-white">

      {/* AMBIENT LIGHT */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div className="absolute -left-48 -top-48 h-[620px] w-[620px] rounded-full bg-emerald-400/10 blur-[150px]" />

        <div className="absolute right-[-180px] top-[8%] h-[600px] w-[600px] rounded-full bg-cyan-400/7 blur-[150px]" />

        <div className="absolute bottom-[-220px] left-[28%] h-[580px] w-[580px] rounded-full bg-violet-400/6 blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.026]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.75) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.75) 1px, transparent 1px)",
            backgroundSize:
              "46px 46px"
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,.9) 1px, transparent 0)",
            backgroundSize:
              "24px 24px"
          }}
        />

      </div>

      {/* TOP LIGHT */}

      <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-px bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent" />

      <div className="relative">
        {children}
      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| QUICK STAT
|--------------------------------------------------------------------------
*/

function QuickStat({
  label,
  value,
  icon,
  tone
}) {
  const tones = {
    cyan:
      "border-cyan-300/10 bg-cyan-400/[0.04] text-cyan-300",

    violet:
      "border-violet-300/10 bg-violet-400/[0.04] text-violet-300",

    emerald:
      "border-emerald-300/10 bg-emerald-400/[0.04] text-emerald-300",

    lime:
      "border-lime-300/10 bg-lime-400/[0.04] text-lime-300"
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${
        tones[tone] ||
        "border-white/10 bg-white/[0.025] text-white"
      }`}
    >

      <div className="flex items-start justify-between">

        <div>

          <p className="text-[8px] font-black uppercase tracking-[0.16em] opacity-40">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black">
            {value}
          </p>

        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.045] text-sm">
          {icon}
        </div>

      </div>

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
    <div className="rounded-2xl border border-white/7 bg-white/[0.025] p-4">

      <p className="text-[8px] font-black uppercase tracking-[0.17em] text-white/20">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-white/85">
        {value}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ORDER DATA CARD
|--------------------------------------------------------------------------
*/

function OrderDataCard({
  label,
  value,
  icon,
  highlight = false
}) {
  return (
    <div className="rounded-2xl border border-white/7 bg-white/[0.025] p-4">

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="text-[7px] font-black uppercase tracking-[0.16em] text-white/20">
            {label}
          </p>

          <p
            className={`mt-2 truncate text-xs font-black ${
              highlight
                ? "text-emerald-300"
                : "text-white/70"
            }`}
          >
            {value}
          </p>

        </div>

        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-xs text-cyan-300/70">
          {icon}
        </div>

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
  tone
}) {
  const tones = {
    cyan:
      "border-cyan-300/10 bg-cyan-400/[0.03] text-cyan-300",

    emerald:
      "border-emerald-300/10 bg-emerald-400/[0.03] text-emerald-300",

    red:
      "border-red-300/10 bg-red-400/[0.03] text-red-300"
  };

  return (
    <div
      className={`rounded-[26px] border p-5 ${
        tones[tone] ||
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