import {
  useCallback,
  useEffect,
  useMemo,
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
      "Unable to connect to the backend. Please make sure the backend is running."
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
| STATUS FORMAT
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
| NORMALIZE
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
| ORDER STATUS VISUAL
|--------------------------------------------------------------------------
*/

const getStatusVisual = (
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
          "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,1)]",
        badge:
          "border-amber-300/20 bg-amber-400/[0.08] text-amber-200",
        glow:
          "shadow-[0_0_30px_rgba(245,158,11,0.10)]",
        line:
          "bg-amber-300"
      };

    case "confirmed":
      return {
        label:
          "Confirmed",
        icon:
          "✓",
        dot:
          "bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,1)]",
        badge:
          "border-sky-300/20 bg-sky-400/[0.08] text-sky-200",
        glow:
          "shadow-[0_0_30px_rgba(56,189,248,0.10)]",
        line:
          "bg-sky-300"
      };

    case "processing":
      return {
        label:
          "Processing",
        icon:
          "↻",
        dot:
          "bg-violet-300 shadow-[0_0_18px_rgba(196,181,253,1)]",
        badge:
          "border-violet-300/20 bg-violet-400/[0.08] text-violet-200",
        glow:
          "shadow-[0_0_30px_rgba(139,92,246,0.10)]",
        line:
          "bg-violet-300"
      };

    case "packed":
      return {
        label:
          "Packed",
        icon:
          "▣",
        dot:
          "bg-fuchsia-300 shadow-[0_0_18px_rgba(240,171,252,1)]",
        badge:
          "border-fuchsia-300/20 bg-fuchsia-400/[0.08] text-fuchsia-200",
        glow:
          "shadow-[0_0_30px_rgba(217,70,239,0.10)]",
        line:
          "bg-fuchsia-300"
      };

    case "out_for_delivery":
      return {
        label:
          "Out for Delivery",
        icon:
          "➜",
        dot:
          "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,1)]",
        badge:
          "border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-200",
        glow:
          "shadow-[0_0_30px_rgba(34,211,238,0.10)]",
        line:
          "bg-cyan-300"
      };

    case "delivered":
      return {
        label:
          "Delivered",
        icon:
          "✓",
        dot:
          "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,1)]",
        badge:
          "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-200",
        glow:
          "shadow-[0_0_30px_rgba(16,185,129,0.14)]",
        line:
          "bg-emerald-300"
      };

    case "cancelled":
      return {
        label:
          "Cancelled",
        icon:
          "×",
        dot:
          "bg-red-300 shadow-[0_0_18px_rgba(252,165,165,1)]",
        badge:
          "border-red-300/20 bg-red-400/[0.08] text-red-200",
        glow:
          "shadow-[0_0_30px_rgba(239,68,68,0.10)]",
        line:
          "bg-red-300"
      };

    case "returned":
      return {
        label:
          "Returned",
        icon:
          "↩",
        dot:
          "bg-orange-300 shadow-[0_0_18px_rgba(253,186,116,1)]",
        badge:
          "border-orange-300/20 bg-orange-400/[0.08] text-orange-200",
        glow:
          "shadow-[0_0_30px_rgba(249,115,22,0.10)]",
        line:
          "bg-orange-300"
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
          "border-white/10 bg-white/[0.03] text-white/60",
        glow:
          "",
        line:
          "bg-white/40"
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
        wrapper:
          "border-emerald-300/20 bg-emerald-400/[0.08]",
        text:
          "text-emerald-200"
      };

    case "failed":
      return {
        label:
          "Failed",
        icon:
          "×",
        wrapper:
          "border-red-300/20 bg-red-400/[0.08]",
        text:
          "text-red-200"
      };

    case "refunded":
      return {
        label:
          "Refunded",
        icon:
          "↩",
        wrapper:
          "border-violet-300/20 bg-violet-400/[0.08]",
        text:
          "text-violet-200"
      };

    default:
      return {
        label:
          "Pending",
        icon:
          "◌",
        wrapper:
          "border-amber-300/20 bg-amber-400/[0.08]",
        text:
          "text-amber-200"
      };
  }
};

/*
|--------------------------------------------------------------------------
| TRACKING
|--------------------------------------------------------------------------
*/

const TRACKING_STEPS = [
  "confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivered"
];

/*
|--------------------------------------------------------------------------
| ORDER DETAILS
|--------------------------------------------------------------------------
*/

export default function OrderDetails() {
  const {
    id
  } = useParams();

  const navigate =
    useNavigate();

  const [
    order,
    setOrder
  ] = useState(
    null
  );

  const [
    loading,
    setLoading
  ] = useState(
    true
  );

  const [
    refreshing,
    setRefreshing
  ] = useState(
    false
  );

  const [
    error,
    setError
  ] = useState(
    ""
  );

  const [
    cancelling,
    setCancelling
  ] = useState(
    false
  );

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
              `/api/orders/${id}`
            );

          const latestOrder =
            response.data ||
            null;

          console.log(
            "Latest order status:",
            {
              orderId:
                latestOrder?._id,

              orderStatus:
                latestOrder?.orderStatus,

              paymentMethod:
                latestOrder?.paymentMethod,

              paymentStatus:
                latestOrder?.paymentStatus
            }
          );

          setOrder(
            latestOrder
          );
        } catch (
          err
        ) {
          console.error(
            "Order details error:",
            err
          );

          setError(
            err.message ||
              "Unable to load order."
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
      [id]
    );

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

    loadOrder();
  }, [
    id,
    navigate,
    loadOrder
  ]);

  /*
  |--------------------------------------------------------------------------
  | REFRESH RULE
  |--------------------------------------------------------------------------
  */

  const shouldKeepRefreshing =
    useMemo(
      () => {
        if (!order) {
          return true;
        }

        const isDelivered =
          order.orderStatus ===
          "delivered";

        const isCancelled =
          order.orderStatus ===
          "cancelled";

        const isReturned =
          order.orderStatus ===
          "returned";

        const isDeliveredCodPending =
          isDelivered &&
          order.paymentMethod ===
            "cod" &&
          order.paymentStatus !==
            "paid";

        if (
          isCancelled ||
          isReturned
        ) {
          return false;
        }

        if (
          isDeliveredCodPending
        ) {
          return true;
        }

        if (isDelivered) {
          return false;
        }

        return true;
      },
      [order]
    );

  /*
  |--------------------------------------------------------------------------
  | AUTO REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !localStorage.getItem(
        "token"
      )
    ) {
      return;
    }

    if (
      !shouldKeepRefreshing
    ) {
      return;
    }

    const interval =
      setInterval(
        () => {
          loadOrder(
            true
          );
        },
        5000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [
    shouldKeepRefreshing,
    loadOrder
  ]);

  /*
  |--------------------------------------------------------------------------
  | PAGE FOCUS REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleFocus =
      () => {
        if (
          localStorage.getItem(
            "token"
          )
        ) {
          loadOrder(
            true
          );
        }
      };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [
    loadOrder
  ]);

  /*
  |--------------------------------------------------------------------------
  | CANCEL ORDER
  |--------------------------------------------------------------------------
  */

  const cancelOrder =
    async () => {
      const reason =
        window.prompt(
          "Enter a reason for cancelling this order:"
        );

      if (
        reason ===
        null
      ) {
        return;
      }

      try {
        setCancelling(
          true
        );

        setError("");

        const response =
          await request(
            `/api/orders/${id}/cancel`,
            {
              method:
                "PATCH",

              body:
                JSON.stringify(
                  {
                    cancellationReason:
                      reason.trim()
                  }
                )
            }
          );

        setOrder(
          response.data ||
            null
        );
      } catch (
        err
      ) {
        console.error(
          "Cancel order error:",
          err
        );

        setError(
          err.message ||
            "Unable to cancel order."
        );
      } finally {
        setCancelling(
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
      <FutureShell>

        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">

          <div className="w-full rounded-[36px] border border-white/10 bg-white/[0.045] p-12 text-center shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-emerald-300/15 bg-emerald-400/[0.06] text-3xl text-emerald-300">

              <span className="animate-pulse">
                ⚡
              </span>

            </div>

            <p className="mt-6 text-lg font-black text-white">
              Synchronizing order
            </p>

            <p className="mt-2 text-sm text-white/30">
              Connecting to the live commerce layer...
            </p>

            <div className="mx-auto mt-7 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/5">

              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-violet-300" />

            </div>

          </div>

        </div>

      </FutureShell>
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
      <FutureShell>

        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6">

          <div className="w-full rounded-[36px] border border-red-300/15 bg-red-500/[0.055] p-10 text-center shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl">

            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-2xl border border-red-300/15 bg-red-400/[0.08] text-3xl text-red-300">
              !
            </div>

            <p className="mt-6 text-2xl font-black text-white">
              Order unavailable
            </p>

            <p className="mt-3 text-sm leading-6 text-red-200/60">
              {error}
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">

              <button
                type="button"
                onClick={() =>
                  loadOrder()
                }
                className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-emerald-400"
              >
                Retry sync
              </button>

              <Link
                to="/orders"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-black text-white/70 transition hover:border-cyan-300/20 hover:text-cyan-300"
              >
                ← My Orders
              </Link>

            </div>

          </div>

        </div>

      </FutureShell>
    );
  }

  if (!order) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | ORDER DATA
  |--------------------------------------------------------------------------
  */

  const orderStatus =
    normalizeStatus(
      order.orderStatus ||
        "pending"
    );

  const backendPaymentStatus =
    normalizeStatus(
      order.paymentStatus ||
        "pending"
    );

  const paymentMethod =
    normalizeStatus(
      order.paymentMethod ||
        ""
    );

  /*
  |--------------------------------------------------------------------------
  | COD DISPLAY RULE
  |--------------------------------------------------------------------------
  */

  const effectivePaymentStatus =
    paymentMethod ===
      "cod" &&
    orderStatus ===
      "delivered"
      ? "paid"
      : backendPaymentStatus;

  /*
  |--------------------------------------------------------------------------
  | CAN CANCEL
  |--------------------------------------------------------------------------
  */

  const canCancel =
    [
      "pending",
      "confirmed",
      "processing"
    ].includes(
      orderStatus
    );

  /*
  |--------------------------------------------------------------------------
  | TRACKING INDEX
  |--------------------------------------------------------------------------
  */

  const currentTrackingIndex =
    TRACKING_STEPS.indexOf(
      orderStatus
    );

  /*
  |--------------------------------------------------------------------------
  | ITEMS
  |--------------------------------------------------------------------------
  */

  const orderItems =
    Array.isArray(
      order.items
    )
      ? order.items
      : [];

  const totalItems =
    orderItems.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item?.quantity ||
            0
        ),
      0
    );

  /*
  |--------------------------------------------------------------------------
  | SHIPPING
  |--------------------------------------------------------------------------
  */

  const shipping =
    order.shippingAddress ||
    {};

  const statusVisual =
    getStatusVisual(
      orderStatus
    );

  const paymentVisual =
    getPaymentVisual(
      effectivePaymentStatus
    );

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <FutureShell>

      <main className="relative mx-auto max-w-[1550px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

        {/* ============================================================ */}
        {/* TOP NAV                                                       */}
        {/* ============================================================ */}

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] px-5 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:px-6">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div className="flex items-center gap-3">

              <Link
                to="/orders"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-lg text-white/60 transition hover:-translate-y-0.5 hover:border-cyan-300/20 hover:text-cyan-300"
              >
                ←
              </Link>

              <div>

                <p className="text-[8px] font-black uppercase tracking-[0.24em] text-emerald-300/50">
                  RuralFresh / Commerce
                </p>

                <p className="mt-1 text-sm font-black text-white">
                  Order intelligence
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <div className="relative h-2.5 w-2.5">

                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />

                <span className="relative block h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_15px_rgba(110,231,183,1)]" />

              </div>

              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300">
                Live
              </span>

              {refreshing && (
                <span className="ml-2 text-[8px] font-bold uppercase tracking-wide text-white/25">
                  Syncing
                </span>
              )}

              <button
                type="button"
                onClick={() =>
                  loadOrder(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="ml-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[9px] font-black uppercase tracking-wide text-white/45 transition hover:border-cyan-300/20 hover:text-cyan-300 disabled:opacity-40"
              >
                {refreshing
                  ? "Syncing"
                  : "Refresh"}
              </button>

            </div>

          </div>

        </section>

        {/* ============================================================ */}
        {/* ERROR                                                         */}
        {/* ============================================================ */}

        {error && (
          <section className="mt-5 rounded-[24px] border border-red-300/15 bg-red-500/[0.06] px-5 py-4">

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-xs font-black text-red-200">
                  Live synchronization warning
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
                className="w-fit rounded-xl border border-red-300/15 bg-white/[0.025] px-3 py-2 text-[9px] font-black uppercase tracking-wide text-red-200/70"
              >
                Dismiss
              </button>

            </div>

          </section>
        )}

        {/* ============================================================ */}
        {/* HERO ORDER ID                                                 */}
        {/* ============================================================ */}

        <section className="relative mt-5 overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-[#091a15] via-[#06110e] to-[#030807] p-6 shadow-[0_30px_110px_rgba(0,0,0,0.42)] sm:p-8 lg:p-10">

          <div className="pointer-events-none absolute -right-28 -top-28 h-[420px] w-[420px] rounded-full bg-emerald-400/10 blur-[120px]" />

          <div className="pointer-events-none absolute bottom-[-180px] left-[32%] h-[400px] w-[400px] rounded-full bg-cyan-400/7 blur-[120px]" />

          <div className="relative">

            <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">

              <div>

                <p className="text-[8px] font-black uppercase tracking-[0.24em] text-emerald-300/45">
                  Transaction ID
                </p>

                <h1 className="mt-2 break-all text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl">
                  #
                  {order.orderNumber ||
                    String(
                      order._id
                    ).slice(
                      -10
                    )}
                </h1>

                <p className="mt-3 text-xs text-white/30">
                  Created{" "}
                  {order.createdAt
                    ? new Date(
                        order.createdAt
                      ).toLocaleString(
                        "en-IN"
                      )
                    : "—"}
                </p>

              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.1em] ${statusVisual.badge} ${statusVisual.glow}`}
                >

                  <span
                    className={`h-1.5 w-1.5 rounded-full ${statusVisual.dot}`}
                  />

                  {statusVisual.label}

                </div>

                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.1em] ${paymentVisual.wrapper} ${paymentVisual.text}`}
                >

                  <span>
                    {paymentVisual.icon}
                  </span>

                  Payment{" "}
                  {paymentVisual.label}

                </div>

              </div>

            </div>

            {/* ======================================================== */}
            {/* TRACKING                                                   */}
            {/* ======================================================== */}

            <div className="mt-10">

              <div className="mb-4 flex items-center justify-between">

                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/25">
                  Delivery protocol
                </p>

                <p className="text-[9px] font-black text-emerald-300/60">
                  {orderStatus ===
                  "cancelled"
                    ? "TERMINATED"
                    : orderStatus ===
                      "returned"
                    ? "RETURNED"
                    : `${Math.max(
                        currentTrackingIndex,
                        -1
                      ) + 1}/5 COMPLETE`}
                </p>

              </div>

              <div className="hidden lg:block">

                <div className="relative">

                  <div className="absolute left-[10%] right-[10%] top-5 h-px bg-white/8" />

                  <div
                    className={`absolute left-[10%] top-5 h-px transition-all duration-700 ${statusVisual.line}`}
                    style={{
                      width:
                        currentTrackingIndex >=
                          0 &&
                        orderStatus !==
                          "cancelled"
                          ? `${Math.min(
                              currentTrackingIndex /
                                4,
                              1
                            ) * 80}%`
                          : "0%"
                    }}
                  />

                  <div className="relative grid grid-cols-5 gap-2">

                    {TRACKING_STEPS.map(
                      (
                        step,
                        index
                      ) => {

                        const completed =
                          orderStatus !==
                            "cancelled" &&
                          currentTrackingIndex >=
                            0 &&
                          index <=
                            currentTrackingIndex;

                        const current =
                          step ===
                          orderStatus;

                        const visual =
                          getStatusVisual(
                            step
                          );

                        return (
                          <div
                            key={
                              step
                            }
                            className="text-center"
                          >

                            <div className="mx-auto flex h-10 w-10 items-center justify-center">

                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 ${
                                  completed
                                    ? `${visual.badge} border-current`
                                    : "border-white/10 bg-white/[0.03] text-white/25"
                                } ${
                                  current
                                    ? "scale-110 ring-4 ring-white/[0.025]"
                                    : ""
                                }`}
                              >
                                {completed
                                  ? visual.icon
                                  : index +
                                    1}
                              </div>

                            </div>

                            <p
                              className={`mt-3 text-[9px] font-black ${
                                completed
                                  ? "text-white/75"
                                  : "text-white/25"
                              }`}
                            >
                              {formatStatus(
                                step
                              )}
                            </p>

                            {current && (
                              <p className="mt-1 text-[7px] font-black uppercase tracking-[0.15em] text-emerald-300">
                                Current
                              </p>
                            )}

                          </div>
                        );
                      }
                    )}

                  </div>

                </div>

              </div>

              <div className="space-y-3 lg:hidden">

                {TRACKING_STEPS.map(
                  (
                    step,
                    index
                  ) => {

                    const completed =
                      orderStatus !==
                        "cancelled" &&
                      currentTrackingIndex >=
                        0 &&
                      index <=
                        currentTrackingIndex;

                    const current =
                      step ===
                      orderStatus;

                    const visual =
                      getStatusVisual(
                        step
                      );

                    return (
                      <div
                        key={
                          step
                        }
                        className={`flex items-center gap-3 rounded-2xl border p-3 ${
                          completed
                            ? visual.badge
                            : "border-white/8 bg-white/[0.025]"
                        }`}
                      >

                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                            completed
                              ? "bg-white/[0.08]"
                              : "bg-white/[0.035] text-white/25"
                          }`}
                        >
                          {completed
                            ? visual.icon
                            : index +
                              1}
                        </div>

                        <div className="min-w-0 flex-1">

                          <p
                            className={`text-xs font-black ${
                              completed
                                ? "text-white"
                                : "text-white/30"
                            }`}
                          >
                            {formatStatus(
                              step
                            )}
                          </p>

                          {current && (
                            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.15em] text-emerald-300">
                              Current stage
                            </p>
                          )}

                        </div>

                        {completed && (
                          <span className="text-[9px] font-black text-white/40">
                            COMPLETE
                          </span>
                        )}

                      </div>
                    );
                  }
                )}

              </div>

            </div>

            {/* ======================================================== */}
            {/* CANCELLED                                                  */}
            {/* ======================================================== */}

            {orderStatus ===
              "cancelled" && (
              <div className="mt-7 rounded-2xl border border-red-300/15 bg-red-500/[0.06] p-4">

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-300">
                    ×
                  </div>

                  <div>

                    <p className="text-xs font-black text-red-200">
                      Transaction terminated
                    </p>

                    {order.cancellationReason && (
                      <p className="mt-1 text-[10px] leading-5 text-red-200/50">
                        Reason:{" "}
                        {
                          order.cancellationReason
                        }
                      </p>
                    )}

                  </div>

                </div>

              </div>
            )}

          </div>

        </section>

        {/* ============================================================ */}
        {/* MAIN CONTENT                                                   */}
        {/* ============================================================ */}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">

          {/* ========================================================== */}
          {/* LEFT                                                        */}
          {/* ========================================================== */}

          <div className="space-y-5">

            {/* ======================================================== */}
            {/* ORDER ITEMS                                                */}
            {/* ======================================================== */}

            <section className="rounded-[32px] border border-white/10 bg-white/[0.035] shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-2xl">

              <PanelHeading
                eyebrow="Commerce payload"
                title="Ordered items"
                description={`${totalItems} item${
                  totalItems ===
                  1
                    ? ""
                    : "s"
                } in this transaction`}
                icon="▣"
              />

              <div className="divide-y divide-white/6">

                {orderItems.map(
                  (
                    item,
                    index
                  ) => {

                    const image =
                      item.productImage ||
                      item.product
                        ?.images?.[0]
                        ?.url;

                    const itemPrice =
                      Number(
                        item.priceAtPurchase ||
                          0
                      );

                    const quantity =
                      Number(
                        item.quantity ||
                          0
                      );

                    const subtotal =
                      Number(
                        item.subtotal ||
                          itemPrice *
                            quantity
                      );

                    const sellerName =
                      item.seller
                        ?.sellerProfile
                        ?.businessName ||
                      item.seller
                        ?.name ||
                      "Local Seller";

                    return (
                      <div
                        key={`${item.product?._id || item.product || index}`}
                        className="group p-5 sm:p-6"
                      >

                        <div className="flex flex-col gap-5 sm:flex-row">

                          {/* IMAGE */}

                          <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04]">

                            {image ? (
                              <img
                                src={
                                  image
                                }
                                alt={
                                  item.productName ||
                                  "Product"
                                }
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-4xl">
                                🥬
                              </div>
                            )}

                          </div>

                          {/* DETAILS */}

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-col justify-between gap-4 sm:flex-row">

                              <div>

                                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-300/45">
                                  Product
                                </p>

                                <h3 className="mt-1 text-lg font-black text-white">
                                  {item.productName ||
                                    "Product"}
                                </h3>

                                <p className="mt-2 text-xs text-white/35">
                                  Supplier ·{" "}
                                  {sellerName}
                                </p>

                              </div>

                              <div className="text-left sm:text-right">

                                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/20">
                                  Line value
                                </p>

                                <p className="mt-1 text-xl font-black text-emerald-300">
                                  ₹
                                  {subtotal.toLocaleString(
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

                            <div className="mt-5 grid gap-3 sm:grid-cols-3">

                              <InfoPill
                                label="Quantity"
                                value={`${quantity} ${item.unit || ""}`}
                              />

                              <InfoPill
                                label="Unit price"
                                value={`₹${itemPrice.toLocaleString(
                                  "en-IN",
                                  {
                                    minimumFractionDigits:
                                      2,
                                    maximumFractionDigits:
                                      2
                                  }
                                )}`}
                              />

                              <InfoPill
                                label="Seller"
                                value="Verified seller"
                                success
                              />

                            </div>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </section>

            {/* ======================================================== */}
            {/* DELIVERY ADDRESS                                           */}
            {/* ======================================================== */}

            <section className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:p-7">

              <PanelHeading
                eyebrow="Destination node"
                title="Delivery address"
                description="Current destination for this order"
                icon="⌖"
              />

              <div className="mt-6 grid gap-5 md:grid-cols-2">

                <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">

                  <p className="text-[8px] font-black uppercase tracking-[0.17em] text-white/20">
                    Recipient
                  </p>

                  <p className="mt-2 text-base font-black text-white">
                    {shipping.name ||
                      "—"}
                  </p>

                  <p className="mt-1 text-xs text-white/35">
                    {shipping.phone ||
                      "Phone unavailable"}
                  </p>

                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">

                  <p className="text-[8px] font-black uppercase tracking-[0.17em] text-white/20">
                    Postal code
                  </p>

                  <p className="mt-2 text-base font-black text-white">
                    {shipping.pincode ||
                      "—"}
                  </p>

                  <p className="mt-1 text-xs text-white/35">
                    Delivery area
                  </p>

                </div>

              </div>

              <div className="mt-4 rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.035] p-5">

                <p className="text-[8px] font-black uppercase tracking-[0.17em] text-cyan-300/45">
                  Address coordinates
                </p>

                <div className="mt-3 space-y-1 text-sm leading-6 text-white/55">

                  {shipping.addressLine1 && (
                    <p className="font-bold text-white/85">
                      {
                        shipping.addressLine1
                      }
                    </p>
                  )}

                  {shipping.addressLine2 && (
                    <p>
                      {
                        shipping.addressLine2
                      }
                    </p>
                  )}

                  {shipping.village && (
                    <p>
                      {
                        shipping.village
                      }
                    </p>
                  )}

                  {(shipping.district ||
                    shipping.state) && (
                    <p>
                      {
                        shipping.district
                      }

                      {shipping.district &&
                        shipping.state &&
                        ", "}

                      {
                        shipping.state
                      }
                    </p>
                  )}

                </div>

              </div>

            </section>

            {/* ======================================================== */}
            {/* TIMELINE                                                   */}
            {/* ======================================================== */}

            {(order.createdAt ||
              order.deliveredAt ||
              order.cancelledAt) && (
              <section className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:p-7">

                <PanelHeading
                  eyebrow="Audit trail"
                  title="Order timeline"
                  description="Recorded lifecycle events"
                  icon="⌁"
                />

                <div className="relative mt-7 space-y-5 pl-6">

                  <div className="absolute bottom-3 left-[7px] top-3 w-px bg-gradient-to-b from-emerald-300/50 via-cyan-300/20 to-transparent" />

                  {order.createdAt && (
                    <TimelineEvent
                      label="Order placed"
                      value={new Date(
                        order.createdAt
                      ).toLocaleString(
                        "en-IN"
                      )}
                      color="emerald"
                    />
                  )}

                  {order.deliveredAt && (
                    <TimelineEvent
                      label="Order delivered"
                      value={new Date(
                        order.deliveredAt
                      ).toLocaleString(
                        "en-IN"
                      )}
                      color="cyan"
                    />
                  )}

                  {order.cancelledAt && (
                    <TimelineEvent
                      label="Order cancelled"
                      value={new Date(
                        order.cancelledAt
                      ).toLocaleString(
                        "en-IN"
                      )}
                      color="red"
                    />
                  )}

                </div>

              </section>
            )}

          </div>

          {/* ========================================================== */}
          {/* RIGHT                                                       */}
          {/* ========================================================== */}

          <aside className="h-fit space-y-5 xl:sticky xl:top-5">

            {/* ======================================================== */}
            {/* ORDER VALUE                                                */}
            {/* ======================================================== */}

            <section className="relative overflow-hidden rounded-[32px] border border-emerald-300/10 bg-gradient-to-br from-[#092019] via-[#06120f] to-[#030807] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.40)]">

              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-[100px]" />

              <div className="relative">

                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300/45">
                  Financial layer
                </p>

                <h2 className="mt-2 text-xl font-black text-white">
                  Order summary
                </h2>

                <div className="mt-7 space-y-4">

                  <SummaryRow
                    label="Subtotal"
                    value={`₹${Number(
                      order.subtotal ||
                        0
                    ).toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits:
                          2,
                        maximumFractionDigits:
                          2
                      }
                    )}`}
                  />

                  <SummaryRow
                    label="Delivery"
                    value={
                      Number(
                        order.deliveryCharge ||
                          0
                      ) === 0
                        ? "FREE"
                        : `₹${Number(
                            order.deliveryCharge
                          ).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits:
                                2,
                              maximumFractionDigits:
                                2
                            }
                          )}`
                    }
                    highlight={
                      Number(
                        order.deliveryCharge ||
                          0
                      ) === 0
                    }
                  />

                  <SummaryRow
                    label="Discount"
                    value={`₹${Number(
                      order.discount ||
                        0
                    ).toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits:
                          2,
                        maximumFractionDigits:
                          2
                      }
                    )}`}
                  />

                </div>

                <div className="mt-6 border-t border-white/10 pt-6">

                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/25">
                    Total payable
                  </p>

                  <p className="mt-2 text-4xl font-black tracking-[-0.05em] text-emerald-300">
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
                  </p>

                </div>

              </div>

            </section>

            {/* ======================================================== */}
            {/* PAYMENT                                                    */}
            {/* ======================================================== */}

            <section className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-2xl">

              <PanelHeading
                eyebrow="Payment layer"
                title="Transaction status"
                description="Current payment information"
                icon="◇"
              />

              <div className="mt-6 space-y-4">

                <InfoRow
                  label="Method"
                  value={
                    paymentMethod
                      ? paymentMethod.toUpperCase()
                      : "—"
                  }
                />

                <InfoRow
                  label="Status"
                  value={
                    paymentVisual.label
                  }
                  badge={
                    true
                  }
                  badgeClass={`${paymentVisual.wrapper} ${paymentVisual.text}`}
                />

                {paymentMethod ===
                  "cod" && (
                  <div
                    className={`rounded-2xl border p-4 ${
                      orderStatus ===
                      "delivered"
                        ? "border-emerald-300/10 bg-emerald-400/[0.045]"
                        : "border-amber-300/10 bg-amber-400/[0.045]"
                    }`}
                  >

                    <p
                      className={`text-xs font-black ${
                        orderStatus ===
                        "delivered"
                          ? "text-emerald-300"
                          : "text-amber-300"
                      }`}
                    >
                      {orderStatus ===
                      "delivered"
                        ? "COD collection complete"
                        : "COD collection pending"}
                    </p>

                    <p className="mt-2 text-[10px] leading-5 text-white/35">
                      {orderStatus ===
                      "delivered"
                        ? "The order has been delivered and the cash-on-delivery amount is treated as collected."
                        : "Cash is expected when the order is delivered."}
                    </p>

                  </div>
                )}

                {paymentMethod ===
                  "razorpay" &&
                  effectivePaymentStatus ===
                    "paid" && (
                    <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.045] p-4">

                      <div className="flex items-start gap-3">

                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                          ✓
                        </div>

                        <div className="min-w-0">

                          <p className="text-xs font-black text-emerald-300">
                            Online payment verified
                          </p>

                          {order.razorpay
                            ?.paymentId && (
                            <p className="mt-2 break-all font-mono text-[9px] leading-5 text-white/30">
                              {
                                order
                                  .razorpay
                                  .paymentId
                              }
                            </p>
                          )}

                        </div>

                      </div>

                    </div>
                  )}

                {paymentMethod ===
                  "razorpay" &&
                  effectivePaymentStatus ===
                    "failed" && (
                    <div className="rounded-2xl border border-red-300/10 bg-red-400/[0.045] p-4">

                      <p className="text-xs font-black text-red-300">
                        Payment failed
                      </p>

                      <p className="mt-2 text-[10px] leading-5 text-white/35">
                        The online payment was
                        not completed successfully.
                      </p>

                    </div>
                  )}

              </div>

            </section>

            {/* ======================================================== */}
            {/* ORDER CONTROL                                              */}
            {/* ======================================================== */}

            {canCancel && (
              <section className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-2xl">

                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-red-300/45">
                  Customer controls
                </p>

                <h2 className="mt-2 text-lg font-black text-white">
                  Cancel transaction
                </h2>

                <p className="mt-2 text-[10px] leading-5 text-white/30">
                  Cancellation is available while
                  the order is still within its
                  active processing stages.
                </p>

                <button
                  type="button"
                  onClick={
                    cancelOrder
                  }
                  disabled={
                    cancelling
                  }
                  className="mt-5 w-full rounded-2xl border border-red-300/15 bg-red-500/[0.06] px-5 py-3.5 text-xs font-black text-red-200 transition hover:-translate-y-0.5 hover:border-red-300/25 hover:bg-red-500/[0.10] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {cancelling
                    ? "Cancelling..."
                    : "Cancel Order"}
                </button>

              </section>
            )}

            {/* ======================================================== */}
            {/* STATUS CARD                                                */}
            {/* ======================================================== */}

            {!canCancel && (
              <section className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-2xl">

                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                  Order state
                </p>

                <div
                  className={`mt-4 rounded-2xl border p-5 ${statusVisual.badge}`}
                >

                  <div className="flex items-center gap-3">

                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.07] text-lg`}
                    >
                      {
                        statusVisual.icon
                      }
                    </span>

                    <div>

                      <p className="text-[9px] font-black uppercase tracking-wide opacity-50">
                        Current status
                      </p>

                      <p className="mt-1 text-base font-black">
                        {
                          statusVisual.label
                        }
                      </p>

                    </div>

                  </div>

                </div>

              </section>
            )}

            {/* ======================================================== */}
            {/* TRUST                                                        */}
            {/* ======================================================== */}

            <section className="rounded-[30px] border border-white/8 bg-white/[0.025] p-5 backdrop-blur-xl">

              <div className="grid gap-3">

                <MiniTrust
                  icon="🔒"
                  title="Protected"
                  text="Commerce request layer"
                />

                <MiniTrust
                  icon="⚡"
                  title="Live sync"
                  text="Order state refresh enabled"
                />

                <MiniTrust
                  icon="🌱"
                  title="RuralFresh"
                  text="Local produce marketplace"
                />

              </div>

            </section>

          </aside>

        </div>

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

      {/* ================================================================ */}
      {/* AMBIENT LIGHT                                                    */}
      {/* ================================================================ */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div className="absolute -left-44 -top-44 h-[620px] w-[620px] rounded-full bg-emerald-400/10 blur-[150px]" />

        <div className="absolute right-[-180px] top-[8%] h-[580px] w-[580px] rounded-full bg-cyan-400/7 blur-[150px]" />

        <div className="absolute bottom-[-180px] left-[25%] h-[560px] w-[560px] rounded-full bg-violet-400/6 blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.028]"
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

      {/* ================================================================ */}
      {/* TOP SCAN LINE                                                   */}
      {/* ================================================================ */}

      <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />

      <div className="relative">
        {children}
      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PANEL HEADING
|--------------------------------------------------------------------------
*/

function PanelHeading({
  eyebrow,
  title,
  description,
  icon
}) {
  return (
    <div className="border-b border-white/6 px-6 py-6 sm:px-7">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.035] text-lg text-cyan-300">
          {icon}
        </div>

        <div>

          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300/45">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-lg font-black text-white">
            {title}
          </h2>

        </div>

      </div>

      {description && (
        <p className="mt-3 text-[10px] leading-5 text-white/25">
          {description}
        </p>
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INFO PILL
|--------------------------------------------------------------------------
*/

function InfoPill({
  label,
  value,
  success = false
}) {
  return (
    <div className="rounded-xl border border-white/7 bg-white/[0.025] px-3 py-3">

      <p className="text-[7px] font-black uppercase tracking-[0.16em] text-white/20">
        {label}
      </p>

      <p
        className={`mt-1 text-[10px] font-black ${
          success
            ? "text-emerald-300"
            : "text-white/70"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SUMMARY ROW
|--------------------------------------------------------------------------
*/

function SummaryRow({
  label,
  value,
  highlight = false
}) {
  return (
    <div className="flex items-center justify-between gap-4">

      <span className="text-xs text-white/35">
        {label}
      </span>

      <span
        className={`text-sm font-black ${
          highlight
            ? "text-emerald-300"
            : "text-white/75"
        }`}
      >
        {value}
      </span>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INFO ROW
|--------------------------------------------------------------------------
*/

function InfoRow({
  label,
  value,
  badge = false,
  badgeClass = ""
}) {
  return (
    <div className="flex items-center justify-between gap-4">

      <span className="text-xs text-white/35">
        {label}
      </span>

      {badge ? (
        <span
          className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-wide ${badgeClass}`}
        >
          {value}
        </span>
      ) : (
        <span className="text-xs font-black text-white/75">
          {value}
        </span>
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TIMELINE EVENT
|--------------------------------------------------------------------------
*/

function TimelineEvent({
  label,
  value,
  color
}) {
  const colors = {
    emerald:
      "bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]",
    cyan:
      "bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]",
    red:
      "bg-red-300 shadow-[0_0_16px_rgba(252,165,165,0.9)]"
  };

  return (
    <div className="relative">

      <span
        className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full ${colors[color] || colors.emerald}`}
      />

      <p className="text-xs font-black text-white">
        {label}
      </p>

      <p className="mt-1 text-[10px] text-white/30">
        {value}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| MINI TRUST
|--------------------------------------------------------------------------
*/

function MiniTrust({
  icon,
  title,
  text
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/7 bg-white/[0.025] p-3">

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.045] text-sm">
        {icon}
      </div>

      <div>

        <p className="text-[9px] font-black text-white/70">
          {title}
        </p>

        <p className="mt-0.5 text-[8px] text-white/25">
          {text}
        </p>

      </div>

    </div>
  );
}