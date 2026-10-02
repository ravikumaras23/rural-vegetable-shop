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
| AUTH TOKEN
|--------------------------------------------------------------------------
*/

const getToken = () =>
  localStorage.getItem(
    "token"
  );

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
    getToken();

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
        "Request failed."
    );
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| MONEY FORMAT
|--------------------------------------------------------------------------
*/

function formatMoney(
  value
) {
  return (
    Number(value) || 0
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
| CART
|--------------------------------------------------------------------------
*/

export default function Cart() {
  const navigate =
    useNavigate();

  const [
    cart,
    setCart
  ] = useState({
    items: []
  });

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading
  ] = useState("");

  const [
    error,
    setError
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD CART
  |--------------------------------------------------------------------------
  */

  const loadCart =
    async () => {
      try {
        setLoading(
          true
        );

        setError("");

        const response =
          await request(
            "/api/cart"
          );

        setCart(
          response.data || {
            items: []
          }
        );
      } catch (
        err
      ) {
        console.error(
          "Cart loading error:",
          err
        );

        setError(
          err.message ||
            "Unable to load cart."
        );
      } finally {
        setLoading(
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
      !getToken()
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

    loadCart();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | UPDATE QUANTITY
  |--------------------------------------------------------------------------
  */

  const updateQuantity =
    async (
      productId,
      quantity
    ) => {
      if (
        quantity <
        1
      ) {
        return;
      }

      try {
        setActionLoading(
          `update-${productId}`
        );

        setError("");

        const response =
          await request(
            `/api/cart/items/${productId}`,
            {
              method:
                "PATCH",

              body:
                JSON.stringify({
                  quantity
                })
            }
          );

        setCart(
          response.data || {
            items: []
          }
        );
      } catch (
        err
      ) {
        console.error(
          "Cart update error:",
          err
        );

        setError(
          err.message ||
            "Unable to update quantity."
        );
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | REMOVE ITEM
  |--------------------------------------------------------------------------
  */

  const removeItem =
    async (
      productId
    ) => {
      try {
        setActionLoading(
          `remove-${productId}`
        );

        setError("");

        const response =
          await request(
            `/api/cart/items/${productId}`,
            {
              method:
                "DELETE"
            }
          );

        setCart(
          response.data || {
            items: []
          }
        );
      } catch (
        err
      ) {
        console.error(
          "Remove cart item error:",
          err
        );

        setError(
          err.message ||
            "Unable to remove item."
        );
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CLEAR CART
  |--------------------------------------------------------------------------
  */

  const clearCart =
    async () => {
      const confirmed =
        window.confirm(
          "Are you sure you want to clear your cart?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setActionLoading(
          "clear"
        );

        setError("");

        const response =
          await request(
            "/api/cart",
            {
              method:
                "DELETE"
            }
          );

        setCart(
          response.data || {
            items: []
          }
        );
      } catch (
        err
      ) {
        console.error(
          "Clear cart error:",
          err
        );

        setError(
          err.message ||
            "Unable to clear cart."
        );
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | TOTALS
  |--------------------------------------------------------------------------
  */

  const subtotal =
    useMemo(
      () =>
        (
          cart.items ||
          []
        ).reduce(
          (
            total,
            item
          ) => {
            const product =
              item?.product;

            if (!product) {
              return total;
            }

            const price =
              Number(
                product.price ||
                  0
              );

            const quantity =
              Number(
                item.quantity ||
                  0
              );

            return (
              total +
              price *
                quantity
            );
          },
          0
        ),
      [
        cart
      ]
    );

  const deliveryCharge =
    subtotal >= 500 ||
    subtotal === 0
      ? 0
      : 40;

  const total =
    subtotal +
    deliveryCharge;

  /*
  |--------------------------------------------------------------------------
  | ITEM COUNT
  |--------------------------------------------------------------------------
  */

  const totalItems =
    useMemo(
      () =>
        (
          cart.items ||
          []
        ).reduce(
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
        ),
      [
        cart
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | LOADING UI
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#edf7f2] text-slate-900">

        <AmbientBackground />

        <main className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-12">

          <div className="w-full max-w-xl rounded-[34px] border border-white/80 bg-white/75 p-10 text-center shadow-[0_30px_100px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-14">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-emerald-200 bg-emerald-50 text-4xl shadow-[0_15px_40px_rgba(16,185,129,0.12)]">

              <span className="animate-pulse">
                🛒
              </span>

            </div>

            <p className="mt-7 text-xl font-black tracking-tight text-slate-950">
              Preparing your cart
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Synchronizing your latest items...
            </p>

            <div className="mx-auto mt-7 h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100">

              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-emerald-400 to-teal-300" />

            </div>

          </div>

        </main>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | EMPTY CART
  |--------------------------------------------------------------------------
  */

  if (
    !cart.items ||
    cart.items.length ===
      0
  ) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#edf7f2] text-slate-900">

        <AmbientBackground />

        <main className="relative mx-auto flex min-h-[calc(100vh-20px)] max-w-7xl items-center justify-center px-6 py-12">

          <div className="w-full max-w-3xl rounded-[38px] border border-white/80 bg-white/80 p-10 text-center shadow-[0_30px_100px_rgba(15,23,42,0.09)] backdrop-blur-2xl sm:p-16">

            <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-[38px] border border-emerald-200 bg-emerald-50 text-6xl shadow-[0_20px_60px_rgba(16,185,129,0.12)]">

              <div className="absolute inset-0 animate-pulse rounded-[38px] border border-emerald-300/40" />

              🛒

            </div>

            <div className="mt-8">

              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">
                Cart layer
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
                Nothing waiting
                <span className="text-emerald-600">
                  {" "}in your cart.
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-500">
                Discover fresh vegetables
                from local sellers and
                build your next order.
              </p>

              <Link
                to="/products"
                className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white shadow-[0_15px_40px_rgba(15,23,42,0.16)] transition hover:-translate-y-1 hover:bg-emerald-600"
              >
                Explore Fresh Produce
                <span>
                  →
                </span>
              </Link>

            </div>

          </div>

        </main>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MAIN CART UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#edf7f2] text-slate-900">

      <AmbientBackground />

      <main className="relative mx-auto max-w-[1550px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">

        {/* ================================================================ */}
        {/* TOP BAR                                                         */}
        {/* ================================================================ */}

        <section className="relative overflow-hidden rounded-[34px] border border-white/80 bg-white/75 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.07)] backdrop-blur-2xl sm:p-8">

          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-300/20 blur-[100px]" />

          <div className="pointer-events-none absolute bottom-0 right-1/3 h-40 w-40 rounded-full bg-cyan-300/10 blur-[80px]" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">

            <div>

              <div className="flex items-center gap-3">

                <Link
                  to="/products"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-600"
                >
                  ←
                </Link>

                <div>

                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-600">
                    Smart cart
                  </p>

                  <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
                    Your
                    <span className="text-emerald-600">
                      {" "}fresh basket.
                    </span>
                  </h1>

                </div>

              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
                Review quantities, inspect
                your produce and continue
                securely to checkout.
              </p>

            </div>

            <div className="flex flex-wrap gap-3">

              <CartHeaderMetric
                label="Items"
                value={
                  totalItems
                }
                icon="◈"
              />

              <CartHeaderMetric
                label="Products"
                value={
                  cart.items.length
                }
                icon="🥬"
              />

              <CartHeaderMetric
                label="Subtotal"
                value={`₹${formatMoney(
                  subtotal
                )}`}
                icon="₹"
              />

            </div>

          </div>

        </section>

        {/* ================================================================ */}
        {/* ERROR                                                           */}
        {/* ================================================================ */}

        {error && (
          <section className="mt-5 rounded-[26px] border border-red-200 bg-red-50/90 p-5 shadow-sm">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm font-black text-red-800">
                  Cart update issue
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600">
                  {error}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                className="w-fit rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-700 transition hover:bg-red-50"
              >
                Dismiss
              </button>

            </div>

          </section>
        )}

        {/* ================================================================ */}
        {/* CONTENT GRID                                                     */}
        {/* ================================================================ */}

        <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">

          {/* ============================================================ */}
          {/* CART ITEMS                                                     */}
          {/* ============================================================ */}

          <section className="overflow-hidden rounded-[34px] border border-white/80 bg-white/75 shadow-[0_25px_80px_rgba(15,23,42,0.065)] backdrop-blur-2xl">

            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:px-7">

              <div>

                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Basket contents
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Selected produce
                </h2>

              </div>

              <button
                type="button"
                disabled={
                  actionLoading ===
                  "clear"
                }
                onClick={
                  clearCart
                }
                className="w-fit rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ===
                "clear"
                  ? "Clearing..."
                  : "Clear cart"}
              </button>

            </div>

            <div className="divide-y divide-slate-100">

              {cart.items.map(
                (
                  item
                ) => {

                  const product =
                    item.product;

                  if (
                    !product
                  ) {
                    return null;
                  }

                  const quantity =
                    Number(
                      item.quantity ||
                        1
                    );

                  const price =
                    Number(
                      product.price ||
                        0
                    );

                  const itemTotal =
                    price *
                    quantity;

                  const stock =
                    Number(
                      product.stockQuantity ||
                        0
                    );

                  const isUpdating =
                    actionLoading ===
                    `update-${product._id}`;

                  const isRemoving =
                    actionLoading ===
                    `remove-${product._id}`;

                  const image =
                    product
                      .images?.[0]
                      ?.url;

                  return (
                    <article
                      key={
                        product._id
                      }
                      className="group p-5 transition duration-300 hover:bg-emerald-50/30 sm:p-7"
                    >

                      <div className="flex flex-col gap-5 sm:flex-row">

                        {/* ================================================= */}
                        {/* IMAGE                                             */}
                        {/* ================================================= */}

                        <div className="relative h-32 w-full flex-shrink-0 overflow-hidden rounded-[24px] bg-slate-100 sm:h-32 sm:w-32">

                          {image ? (
                            <img
                              src={
                                image
                              }
                              alt={
                                product.name
                              }
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-5xl">
                              🥬
                            </div>
                          )}

                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent px-3 pb-2 pt-6">

                            {product.isOrganic && (
                              <span className="rounded-full border border-white/50 bg-white/85 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-emerald-700 backdrop-blur-md">
                                Organic
                              </span>
                            )}

                          </div>

                        </div>

                        {/* ================================================= */}
                        {/* DETAILS                                            */}
                        {/* ================================================= */}

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-col justify-between gap-3 sm:flex-row">

                            <div>

                              <p className="text-[8px] font-black uppercase tracking-[0.17em] text-emerald-600/70">
                                {product.category ||
                                  "Fresh produce"}
                              </p>

                              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                                {product.name}
                              </h3>

                              <p className="mt-1 text-xs text-slate-400">
                                ₹
                                {formatMoney(
                                  price
                                )}
                                {" / "}
                                {product.unit ||
                                  "unit"}
                              </p>

                            </div>

                            <button
                              type="button"
                              disabled={
                                isRemoving ||
                                isUpdating
                              }
                              onClick={() =>
                                removeItem(
                                  product._id
                                )
                              }
                              className="w-fit rounded-xl px-3 py-2 text-xs font-black text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                            >
                              {isRemoving
                                ? "Removing..."
                                : "Remove"}
                            </button>

                          </div>

                          {/* STOCK */}

                          <div className="mt-4 flex items-center gap-2">

                            <span
                              className={`h-2 w-2 rounded-full ${
                                stock > 0
                                  ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.65)]"
                                  : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.65)]"
                              }`}
                            />

                            <span className="text-[10px] font-bold text-slate-400">

                              {stock > 0
                                ? `${stock} ${product.unit || "units"} available`
                                : "Currently unavailable"}

                            </span>

                          </div>

                          {/* CONTROLS */}

                          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

                            <div>

                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Quantity
                              </p>

                              <div className="mt-2 inline-flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                                <button
                                  type="button"
                                  disabled={
                                    isUpdating ||
                                    quantity <= 1
                                  }
                                  onClick={() =>
                                    updateQuantity(
                                      product._id,
                                      quantity -
                                        1
                                    )
                                  }
                                  className="flex h-11 w-11 items-center justify-center text-xl font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  −
                                </button>

                                <div className="flex h-11 min-w-[54px] items-center justify-center border-x border-slate-100 px-3 text-sm font-black text-slate-950">
                                  {isUpdating
                                    ? "..."
                                    : quantity}
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    isUpdating ||
                                    quantity >=
                                      stock
                                  }
                                  onClick={() =>
                                    updateQuantity(
                                      product._id,
                                      quantity +
                                        1
                                    )
                                  }
                                  className="flex h-11 w-11 items-center justify-center text-xl font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  +
                                </button>

                              </div>

                            </div>

                            <div className="sm:text-right">

                              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Item total
                              </p>

                              <p className="mt-1 text-2xl font-black tracking-tight text-emerald-700">
                                ₹
                                {formatMoney(
                                  itemTotal
                                )}
                              </p>

                            </div>

                          </div>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

            {/* BOTTOM INFO */}

            <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-7">

              <div className="grid gap-3 sm:grid-cols-3">

                <TrustSignal
                  icon="✓"
                  title="Fresh produce"
                  text="Source-focused marketplace"
                />

                <TrustSignal
                  icon="⚡"
                  title="Live stock"
                  text="Inventory checked on update"
                />

                <TrustSignal
                  icon="🔒"
                  title="Secure checkout"
                  text="Protected payment flow"
                />

              </div>

            </div>

          </section>

          {/* ============================================================ */}
          {/* ORDER SUMMARY                                                  */}
          {/* ============================================================ */}

          <aside className="h-fit xl:sticky xl:top-6">

            <section className="relative overflow-hidden rounded-[34px] border border-slate-800 bg-[#07120f] p-6 text-white shadow-[0_30px_100px_rgba(3,15,10,0.22)] sm:p-7">

              <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-[100px]" />

              <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/8 blur-[100px]" />

              <div className="relative">

                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300/60">
                  Checkout preview
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Order summary
                </h2>

                <p className="mt-2 text-xs leading-5 text-white/35">
                  Your current basket
                  totals are calculated
                  from live cart data.
                </p>

                {/* SUMMARY ROWS */}

                <div className="mt-8 space-y-4">

                  <SummaryRow
                    label={`Subtotal (${totalItems} items)`}
                    value={`₹${formatMoney(
                      subtotal
                    )}`}
                  />

                  <SummaryRow
                    label="Delivery"
                    value={
                      deliveryCharge ===
                      0
                        ? "FREE"
                        : `₹${formatMoney(
                            deliveryCharge
                          )}`
                    }
                    highlight={
                      deliveryCharge ===
                      0
                    }
                  />

                </div>

                {/* FREE DELIVERY */}

                {subtotal <
                  500 && (
                  <div className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.05] p-4">

                    <div className="flex items-start gap-3">

                      <span className="text-lg">
                        🚚
                      </span>

                      <div>

                        <p className="text-xs font-black text-emerald-300">
                          Unlock free delivery
                        </p>

                        <p className="mt-1 text-[10px] leading-5 text-white/35">
                          Add ₹
                          {formatMoney(
                            500 -
                              subtotal
                          )}{" "}
                          more to
                          reach the
                          free
                          delivery
                          threshold.
                        </p>

                      </div>

                    </div>

                  </div>
                )}

                {subtotal >=
                  500 && (
                  <div className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.05] p-4">

                    <div className="flex items-center gap-3">

                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-sm">
                        ✓
                      </span>

                      <div>

                        <p className="text-xs font-black text-emerald-300">
                          Free delivery unlocked
                        </p>

                        <p className="mt-1 text-[10px] text-white/35">
                          Your basket qualifies.
                        </p>

                      </div>

                    </div>

                  </div>
                )}

                {/* TOTAL */}

                <div className="mt-7 border-t border-white/10 pt-5">

                  <div className="flex items-end justify-between gap-4">

                    <div>

                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
                        Total payable
                      </p>

                      <p className="mt-2 text-3xl font-black tracking-tight text-white">
                        ₹
                        {formatMoney(
                          total
                        )}
                      </p>

                    </div>

                    <span className="rounded-full border border-emerald-300/10 bg-emerald-400/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-emerald-300">
                      Ready
                    </span>

                  </div>

                </div>

                {/* CTA */}

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/checkout"
                    )
                  }
                  className="mt-7 w-full rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black text-white shadow-[0_15px_35px_rgba(16,185,129,0.20)] transition hover:-translate-y-1 hover:bg-emerald-400"
                >
                  Continue to Checkout
                  <span className="ml-2">
                    →
                  </span>
                </button>

                <Link
                  to="/products"
                  className="mt-3 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3.5 text-xs font-black text-white/50 transition hover:border-emerald-300/15 hover:bg-white/[0.05] hover:text-emerald-300"
                >
                  Continue shopping
                </Link>

              </div>

            </section>

          </aside>

        </div>

      </main>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| AMBIENT BACKGROUND
|--------------------------------------------------------------------------
*/

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">

      <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-300/18 blur-[140px]" />

      <div className="absolute right-[-180px] top-[15%] h-[540px] w-[540px] rounded-full bg-cyan-300/14 blur-[150px]" />

      <div className="absolute bottom-[-180px] left-[25%] h-[500px] w-[500px] rounded-full bg-lime-300/12 blur-[140px]" />

      <div
        className="absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,.75) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.75) 1px, transparent 1px)",
          backgroundSize:
            "44px 44px"
        }}
      />

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| CART HEADER METRIC
|--------------------------------------------------------------------------
*/

function CartHeaderMetric({
  label,
  value,
  icon
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm text-emerald-600">
          {icon}
        </div>

        <div>

          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-sm font-black text-slate-950">
            {value}
          </p>

        </div>

      </div>

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

      <span className="text-xs text-white/45">
        {label}
      </span>

      <span
        className={`text-sm font-black ${
          highlight
            ? "text-emerald-300"
            : "text-white"
        }`}
      >
        {value}
      </span>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TRUST SIGNAL
|--------------------------------------------------------------------------
*/

function TrustSignal({
  icon,
  title,
  text
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">

      <div className="flex items-start gap-3">

        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-600">
          {icon}
        </div>

        <div>

          <p className="text-xs font-black text-slate-800">
            {title}
          </p>

          <p className="mt-1 text-[10px] leading-4 text-slate-400">
            {text}
          </p>

        </div>

      </div>

    </div>
  );
}