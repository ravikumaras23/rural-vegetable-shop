import {
  useCallback,
  useEffect,
  useState
} from "react";

import { Link } from "react-router-dom";

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
    localStorage.getItem("token");

  const isFormData =
    options.body instanceof FormData;

  const headers = {
    ...(isFormData
      ? {}
      : {
          "Content-Type":
            "application/json"
        }),

    ...(token
      ? {
          Authorization:
            `Bearer ${token}`
        }
      : {}),

    ...(options.headers || {})
  };

  let response;

  try {
    response = await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers,
        cache: "no-store"
      }
    );
  } catch (error) {
    throw new Error(
      "Unable to connect to the backend. Make sure the backend is running on http://localhost:5000."
    );
  }

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message ||
        data.error ||
        `Request failed with status ${response.status}`
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| DATE HELPERS
|--------------------------------------------------------------------------
*/

function dateOnly(value) {
  if (!value) {
    return null;
  }

  const text = String(value);

  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

/*
|--------------------------------------------------------------------------
| TODAY
|--------------------------------------------------------------------------
*/

function getTodayKey() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
|--------------------------------------------------------------------------
| ADD DAYS
|--------------------------------------------------------------------------
*/

function addDaysToKey(
  key,
  days
) {
  if (!key) {
    return null;
  }

  const [
    year,
    month,
    day
  ] = key
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  date.setDate(
    date.getDate() + days
  );

  const newYear = date.getFullYear();

  const newMonth = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const newDay = String(
    date.getDate()
  ).padStart(2, "0");

  return `${newYear}-${newMonth}-${newDay}`;
}

/*
|--------------------------------------------------------------------------
| HARVEST INFORMATION
|--------------------------------------------------------------------------
*/

function getHarvestInfo(
  harvestDate
) {
  const harvestKey = dateOnly(
    harvestDate
  );

  if (!harvestKey) {
    return {
      type: "none",
      label: "",
      message: "",
      date: null
    };
  }

  const todayKey = getTodayKey();

  const tomorrowKey = addDaysToKey(
    todayKey,
    1
  );

  if (harvestKey === todayKey) {
    return {
      type: "today",
      label: "Fresh harvest today",
      message:
        "Freshly harvested today.",
      date: harvestKey
    };
  }

  if (
    harvestKey === tomorrowKey
  ) {
    return {
      type: "tomorrow",
      label:
        "Fresh harvest tomorrow",
      message:
        "Freshly harvested tomorrow. Advance orders are available.",
      date: harvestKey
    };
  }

  if (harvestKey > todayKey) {
    const formatted =
      formatHarvestDate(
        harvestKey
      );

    return {
      type: "future",
      label: `Harvest ${formatted}`,
      message:
        `Scheduled harvest on ${formatted}. Advance orders are available.`,
      date: harvestKey
    };
  }

  return {
    type: "past",
    label: "Harvested",
    message:
      "Harvest completed.",
    date: harvestKey
  };
}

/*
|--------------------------------------------------------------------------
| FORMAT PRICE
|--------------------------------------------------------------------------
*/

function formatPrice(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString(
        "en-IN",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )
    : "0.00";
}

/*
|--------------------------------------------------------------------------
| GET PRODUCT IMAGE
|--------------------------------------------------------------------------
*/

function getProductImage(
  product
) {
  const images = Array.isArray(
    product?.images
  )
    ? product.images
    : [];

  for (const item of images) {
    if (typeof item === "string" && item.trim()) {
      return item.trim();
    }

    if (
      item &&
      typeof item === "object"
    ) {
      const url =
        item.url ||
        item.secure_url ||
        item.src;

      if (
        typeof url === "string" &&
        url.trim()
      ) {
        return url.trim();
      }
    }
  }

  if (
    typeof product?.image === "string" &&
    product.image.trim()
  ) {
    return product.image.trim();
  }

  return "";
}

/*
|--------------------------------------------------------------------------
| PRODUCT RESPONSE NORMALIZER
|--------------------------------------------------------------------------
*/

function normalizeProductsResponse(
  response
) {
  if (
    Array.isArray(
      response?.products
    )
  ) {
    return response.products;
  }

  if (
    Array.isArray(
      response?.data?.products
    )
  ) {
    return response.data.products;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| NORMALIZE CART COUNT
|--------------------------------------------------------------------------
*/

function normalizeCartCount(
  response
) {
  const cart =
    response?.data ||
    response?.cart ||
    response;

  if (!cart) {
    return 0;
  }

  if (
    Number.isFinite(
      Number(cart.itemCount)
    )
  ) {
    return Math.max(
      Number(cart.itemCount),
      0
    );
  }

  const items = Array.isArray(
    cart.items
  )
    ? cart.items
    : [];

  return items.reduce(
    (total, item) => {
      const quantity = Number(
        item?.quantity || 0
      );

      return (
        total +
        (Number.isFinite(quantity)
          ? Math.max(quantity, 0)
          : 0)
      );
    },
    0
  );
}

/*
|--------------------------------------------------------------------------
| FORMAT HARVEST DATE
|--------------------------------------------------------------------------
*/

function formatHarvestDate(value) {
  const key = dateOnly(value);

  if (!key) {
    return "the scheduled date";
  }

  const [
    year,
    month,
    day
  ] = key
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "the scheduled date";
  }

  return date.toLocaleDateString(
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
| PRODUCTS PAGE
|--------------------------------------------------------------------------
*/

export default function Products() {
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
    success,
    setSuccess
  ] = useState("");

  const [
    addingProductId,
    setAddingProductId
  ] = useState("");

  const [
    cartCount,
    setCartCount
  ] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | LOAD PRODUCTS
  |--------------------------------------------------------------------------
  */

  const loadProducts =
    useCallback(
      async ({ silent = false } = {}) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          const response =
            await apiRequest(
              "/api/products"
            );

          const loadedProducts =
            normalizeProductsResponse(
              response
            );

          setProducts(
            loadedProducts
          );

          setError("");
        } catch (err) {
          console.error(
            "Products loading error:",
            err
          );

          setError(
            err.message ||
              "Unable to load products."
          );
        } finally {
          if (silent) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | LOAD CART COUNT
  |--------------------------------------------------------------------------
  */

  const loadCartCount =
    useCallback(
      async () => {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          setCartCount(0);
          return;
        }

        try {
          const user = JSON.parse(
            localStorage.getItem(
              "user"
            ) || "null"
          );

          if (
            user?.role &&
            user.role !== "customer"
          ) {
            setCartCount(0);
            return;
          }
        } catch {
          // The backend remains the source of truth.
        }

        try {
          const response =
            await apiRequest(
              "/api/cart"
            );

          setCartCount(
            normalizeCartCount(
              response
            )
          );
        } catch (err) {
          // Do not break the catalogue when the optional cart-count request fails.
          console.warn(
            "Cart count loading error:",
            err
          );
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD + LIVE REFRESH FALLBACK
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadProducts();
    loadCartCount();

    const refreshInterval =
      window.setInterval(() => {
        loadProducts({
          silent: true
        });
        loadCartCount();
      }, 15000);

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadProducts({
          silent: true
        });
        loadCartCount();
      }
    };

    const handleCartUpdated = () => {
      loadCartCount();
    };

    const handleStorage = (event) => {
      if (
        event.key === "token" ||
        event.key === "user"
      ) {
        loadCartCount();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    window.addEventListener(
      "ruralfresh:cart-updated",
      handleCartUpdated
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.clearInterval(
        refreshInterval
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      window.removeEventListener(
        "ruralfresh:cart-updated",
        handleCartUpdated
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, [
    loadProducts,
    loadCartCount
  ]);

  /*
  |--------------------------------------------------------------------------
  | ADD TO CART
  |--------------------------------------------------------------------------
  */

  const handleAddToCart =
    async (product) => {
      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {
        window.alert(
          "Please login as a customer before adding products to your cart."
        );

        window.location.href =
          "/login";

        return;
      }

      let user = null;

      try {
        user = JSON.parse(
          localStorage.getItem(
            "user"
          ) || "null"
        );
      } catch {
        user = null;
      }

      if (
        user?.role &&
        user.role !== "customer"
      ) {
        window.alert(
          "Only customer accounts can add vegetables to the cart."
        );

        return;
      }

      const stock = Number(
        product?.stockQuantity || 0
      );

      const reserved = Number(
        product?.reservedQuantity || 0
      );

      const availableStock =
        Math.max(
          stock - reserved,
          0
        );

      if (
        !Number.isFinite(
          availableStock
        ) ||
        availableStock <= 0
      ) {
        window.alert(
          "This product is currently out of stock."
        );

        return;
      }

      const harvestInfo =
        getHarvestInfo(
          product.harvestDate
        );

      /*
      |--------------------------------------------------------------------------
      | HARVEST WARNINGS
      |--------------------------------------------------------------------------
      */

      if (
        harvestInfo.type ===
        "tomorrow"
      ) {
        const confirmed =
          window.confirm(
            `🌱 FRESH HARVEST TOMORROW\n\n${product.name} will be freshly harvested tomorrow.\n\nDo you want to add it to your cart?`
          );

        if (!confirmed) {
          return;
        }
      }

      if (
        harvestInfo.type ===
        "future"
      ) {
        const confirmed =
          window.confirm(
            `🌿 ADVANCE HARVEST\n\n${product.name} is scheduled for harvest on ${formatHarvestDate(
              product.harvestDate
            )}.\n\nDo you want to add it to your cart?`
          );

        if (!confirmed) {
          return;
        }
      }

      try {
        setAddingProductId(
          product._id
        );

        setError("");
        setSuccess("");

        const response =
          await apiRequest(
            "/api/cart/items",
            {
              method: "POST",
              body: JSON.stringify({
                productId:
                  product._id,
                quantity: 1
              })
            }
          );

        await loadCartCount();

        window.dispatchEvent(
          new Event(
            "ruralfresh:cart-updated"
          )
        );

        setSuccess(
          response.message ||
            `${product.name} added to your cart.`
        );

        window.setTimeout(() => {
          setSuccess("");
        }, 3500);
      } catch (err) {
        console.error(
          "Add to cart error:",
          err
        );

        if (err.status === 401) {
          localStorage.removeItem(
            "token"
          );

          localStorage.removeItem(
            "user"
          );

          window.location.href =
            "/login";

          return;
        }

        setError(
          err.message ||
            "Unable to add product to cart."
        );
      } finally {
        setAddingProductId("");
      }
    };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#03100b] text-white">
      {/* ================================================================ */}
      {/* 2040 AMBIENT SYSTEM                                             */}
      {/* ================================================================ */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-40 h-[620px] w-[620px] rounded-full bg-emerald-400/[0.10] blur-[150px]" />

        <div className="absolute right-[-180px] top-[8%] h-[580px] w-[580px] rounded-full bg-cyan-400/[0.08] blur-[150px]" />

        <div className="absolute bottom-[-220px] left-[28%] h-[600px] w-[600px] rounded-full bg-lime-400/[0.06] blur-[160px]" />

        <div className="absolute bottom-[8%] right-[18%] h-[360px] w-[360px] rounded-full bg-violet-400/[0.04] blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
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
      {/* TOP LIGHT RAIL                                                  */}
      {/* ================================================================ */}

      <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-px bg-gradient-to-r from-transparent via-emerald-300/80 to-cyan-300/50" />

      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}

      <section className="relative border-b border-white/[0.07] bg-black/20 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] text-lg text-emerald-300">
                  ◈
                </span>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.26em] text-emerald-300/45">
                    RuralFresh / Marketplace
                  </p>

                  <p className="mt-1 text-xs font-bold text-white/35">
                    Fresh produce intelligence network
                  </p>
                </div>
              </div>

              <h1 className="mt-7 text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
                Fresh
                <span className="text-emerald-300">
                  {" "}
                  vegetables.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/30 sm:text-base">
                Discover market-ready vegetables supplied
                by approved rural sellers, with live stock
                and harvest visibility.
              </p>
            </div>

            <Link
              to="/cart"
              className="group inline-flex w-fit items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] px-5 py-3.5 text-sm font-black text-emerald-200 shadow-[0_15px_45px_rgba(16,185,129,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-emerald-400/[0.12]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-300 text-sm text-[#032019]">
                🛒
              </span>

              <span>View Cart</span>

              {cartCount > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-[10px] font-black text-emerald-700">
                  {cartCount}
                </span>
              )}

              <span className="transition group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SIGNAL STRIP                                                     */}
      {/* ================================================================ */}

      <div className="relative mx-auto max-w-[1600px] px-4 pt-5 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 rounded-[24px] border border-white/[0.07] bg-white/[0.025] px-5 py-4 shadow-[0_20px_80px_rgba(0,0,0,0.2)] backdrop-blur-2xl sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />
              <span className="relative h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,1)]" />
            </span>

            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.22em] text-white/20">
                Product network
              </p>

              <p className="mt-1 text-xs font-bold text-emerald-300">
                Live marketplace catalogue
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-[8px] font-black uppercase tracking-[0.18em] text-white/20">
            <span>LIVE INVENTORY</span>

            <span>•</span>

            <span>
              {products.length} LISTINGS
            </span>

            <span>•</span>

            <span>HARVEST AWARE</span>

            {refreshing && (
              <>
                <span>•</span>

                <span className="text-emerald-300/60">
                  SYNCING
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MESSAGES                                                         */}
      {/* ================================================================ */}

      <div className="relative mx-auto max-w-[1600px] px-4 pt-5 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-[22px] border border-red-300/15 bg-red-400/[0.06] px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-black text-red-200">
                  Marketplace request failed
                </p>

                <p className="mt-1 text-xs text-red-200/50">
                  {error}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    loadProducts()
                  }
                  className="w-fit rounded-xl border border-red-300/15 bg-red-400/[0.04] px-4 py-2 text-xs font-black text-red-200 transition hover:bg-red-400/[0.09]"
                >
                  Retry
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setError("")
                  }
                  className="w-fit rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-black text-white/60 transition hover:bg-white/[0.07]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-[22px] border border-emerald-300/15 bg-emerald-400/[0.06] px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300 text-sm font-black text-[#032019]">
                ✓
              </div>

              <div>
                <p className="text-sm font-black text-emerald-200">
                  Cart synchronized
                </p>

                <p className="mt-1 text-xs text-emerald-200/55">
                  {success}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* CATALOGUE                                                        */}
      {/* ================================================================ */}

      <main className="relative mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {loading && (
          <section className="rounded-[34px] border border-white/[0.08] bg-white/[0.025] p-16 text-center shadow-[0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-emerald-300/15 bg-emerald-400/[0.06] text-3xl text-emerald-300 shadow-[0_0_45px_rgba(52,211,153,0.10)]">
              ◌
            </div>

            <p className="mt-6 text-sm font-black text-white/75">
              Synchronizing fresh catalogue...
            </p>

            <p className="mt-2 text-xs text-white/25">
              Pulling the latest approved vegetable inventory.
            </p>

            <div className="mx-auto mt-6 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" />
            </div>
          </section>
        )}

        {!loading &&
          products.length === 0 && (
            <section className="rounded-[34px] border border-dashed border-white/[0.1] bg-white/[0.02] p-16 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/[0.04] text-4xl">
                🥬
              </div>

              <h2 className="mt-6 text-2xl font-black text-white">
                No vegetables available
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/25">
                Approved seller products will appear here
                when they enter the marketplace network.
              </p>

              <button
                type="button"
                onClick={() =>
                  loadProducts()
                }
                className="mt-6 rounded-2xl bg-emerald-400 px-5 py-3 text-xs font-black text-[#032019] transition hover:bg-emerald-300"
              >
                Refresh catalogue
              </button>
            </section>
          )}

        {!loading &&
          products.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map(
                (product) => (
                  <ProductCard
                    key={
                      product._id
                    }
                    product={product}
                    addingProductId={
                      addingProductId
                    }
                    onAddToCart={
                      handleAddToCart
                    }
                  />
                )
              )}
            </div>
          )}
      </main>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PRODUCT CARD
|--------------------------------------------------------------------------
*/

function ProductCard({
  product,
  addingProductId,
  onAddToCart
}) {
  const [
    imageError,
    setImageError
  ] = useState(false);

  const image = getProductImage(
    product
  );

  const harvestInfo =
    getHarvestInfo(
      product.harvestDate
    );

  const stock = Number(
    product.stockQuantity || 0
  );

  const reserved = Number(
    product.reservedQuantity || 0
  );

  const availableStock = Math.max(
    stock - reserved,
    0
  );

  const isAdding =
    addingProductId ===
    product._id;

  const stockHealthy =
    availableStock > 0;

  return (
    <article className="group relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.035] shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition duration-500 hover:-translate-y-1.5 hover:border-emerald-300/20 hover:shadow-[0_30px_100px_rgba(16,185,129,0.11)]">
      {/* CARD LIGHT RAIL */}

      <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-emerald-300/60 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

      {/* IMAGE */}

      <div className="relative aspect-[4/3] overflow-hidden bg-[#07120f]">
        {image && !imageError ? (
          <img
            src={image}
            alt={
              product.name ||
              "Vegetable"
            }
            loading="lazy"
            onError={() =>
              setImageError(true)
            }
            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-950/80 to-black text-7xl">
            🥬
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* ORGANIC */}

        {product.isOrganic && (
          <div className="absolute left-4 top-4 rounded-full border border-emerald-300/20 bg-emerald-400/[0.10] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-emerald-200 shadow-lg backdrop-blur-xl">
            ● Organic
          </div>
        )}

        {/* LIVE STOCK */}

        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 backdrop-blur-xl">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              stockHealthy
                ? "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,1)]"
                : "bg-red-300 shadow-[0_0_12px_rgba(252,165,165,1)]"
            }`}
          />

          <span className="text-[8px] font-black uppercase tracking-[0.13em] text-white/65">
            {stockHealthy
              ? `${availableStock} available`
              : "Out of stock"}
          </span>
        </div>
      </div>

      {/* BODY */}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.17em] text-emerald-300/35">
              {product.category ||
                "Fresh vegetable"}
            </p>

            <h2 className="mt-1 truncate text-xl font-black tracking-tight text-white">
              {product.name ||
                "Unnamed vegetable"}
            </h2>
          </div>

          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.035] text-sm text-emerald-300">
            ◈
          </div>
        </div>

        {/* SELLER */}

        {(product.seller?.name ||
          product.seller?.sellerProfile
            ?.farmName ||
          product.seller?.sellerProfile
            ?.businessName) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/20">
              Seller
            </span>

            <span className="truncate rounded-lg bg-white/[0.04] px-2 py-1 text-[9px] font-bold text-white/45">
              {product.seller
                ?.sellerProfile
                ?.farmName ||
                product.seller
                  ?.sellerProfile
                  ?.businessName ||
                product.seller?.name}
            </span>
          </div>
        )}

        {/* UNIT */}

        <div className="mt-3 flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/20">
            Market unit
          </span>

          <span className="rounded-lg bg-white/[0.04] px-2 py-1 text-[9px] font-bold text-white/45">
            / {product.unit ||
              "unit"}
          </span>
        </div>

        {/* HARVEST */}

        {harvestInfo.type !==
          "none" && (
          <HarvestBanner
            harvestInfo={
              harvestInfo
            }
          />
        )}

        {/* PRICE */}

        <div className="mt-5 rounded-[22px] border border-white/[0.07] bg-black/[0.14] p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/20">
                Current price
              </p>

              <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-emerald-300">
                ₹
                {formatPrice(
                  product.price
                )}
              </p>

              <p className="mt-1 text-[9px] text-white/20">
                per {product.unit ||
                  "unit"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/20">
                Availability
              </p>

              <p
                className={`mt-1 text-sm font-black ${
                  stockHealthy
                    ? "text-white/75"
                    : "text-red-300"
                }`}
              >
                {availableStock}
              </p>
            </div>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                stockHealthy
                  ? "bg-gradient-to-r from-emerald-400 to-cyan-300"
                  : "bg-red-400"
              }`}
              style={{
                width: stockHealthy
                  ? `${Math.min(
                      Math.max(
                        availableStock *
                          2,
                        12
                      ),
                      100
                    )}%`
                  : "100%"
              }}
            />
          </div>

          {reserved > 0 &&
            stockHealthy && (
              <p className="mt-2 text-[8px] font-medium text-amber-200/45">
                {reserved} currently reserved in active orders.
              </p>
            )}
        </div>

        {/* HARVEST DATE */}

        {product.harvestDate && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <span className="text-[8px] font-black uppercase tracking-[0.14em] text-white/20">
              Harvest
            </span>

            <span className="text-[9px] font-bold text-white/50">
              {formatHarvestDate(
                product.harvestDate
              )}
            </span>
          </div>
        )}

        {/* ACTION */}

        <button
          type="button"
          onClick={() =>
            onAddToCart(product)
          }
          disabled={
            !stockHealthy ||
            isAdding
          }
          className="group/button mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-black text-[#032019] shadow-[0_12px_35px_rgba(52,211,153,0.12)] transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-300 hover:shadow-[0_18px_45px_rgba(52,211,153,0.22)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/25 disabled:shadow-none"
        >
          <span>
            {isAdding
              ? "Synchronizing..."
              : !stockHealthy
              ? "Out of Stock"
              : "Add to Cart"}
          </span>

          {!isAdding &&
            stockHealthy && (
              <span className="transition group-hover/button:translate-x-1">
                →
              </span>
            )}
        </button>
      </div>
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| HARVEST BANNER
|--------------------------------------------------------------------------
*/

function HarvestBanner({
  harvestInfo
}) {
  const styles = {
    today:
      "border-emerald-300/15 bg-emerald-400/[0.06] text-emerald-200",

    tomorrow:
      "border-amber-300/15 bg-amber-400/[0.06] text-amber-200",

    future:
      "border-cyan-300/15 bg-cyan-400/[0.06] text-cyan-200",

    past:
      "border-white/[0.07] bg-white/[0.025] text-white/55"
  };

  const icons = {
    today: "✓",
    tomorrow: "◌",
    future: "◇",
    past: "✓"
  };

  return (
    <div
      className={`mt-4 rounded-[20px] border p-3 ${
        styles[
          harvestInfo.type
        ] || styles.past
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-sm">
          {
            icons[
              harvestInfo.type
            ]
          }
        </div>

        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.13em]">
            {harvestInfo.label}
          </p>

          {harvestInfo.message && (
            <p className="mt-1 text-[9px] leading-5 opacity-60">
              {harvestInfo.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
