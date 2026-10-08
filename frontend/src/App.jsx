import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom";

/*
|--------------------------------------------------------------------------
| ADMIN PAGES
|--------------------------------------------------------------------------
*/

import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminSellers from "./pages/admin/AdminSellers.jsx";
import AdminProducts from "./pages/admin/AdminProducts.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";
import AdminOrderDetails from "./pages/admin/AdminOrderDetails.jsx";



/*
|--------------------------------------------------------------------------
| SELLER PAGES
|--------------------------------------------------------------------------
*/

import SellerDashboard from "./pages/seller/SellerDashboard.jsx";
import SellerProducts from "./pages/seller/SellerProducts.jsx";
import SellerAddProduct from "./pages/seller/SellerAddProduct.jsx";
import SellerEditProduct from "./pages/seller/SellerEditProduct.jsx";
import SellerOrders from "./pages/seller/SellerOrders.jsx";
import SellerOrderDetails from "./pages/seller/SellerOrderDetails.jsx";
import SellerQRPayment from "./pages/SellerQRPayment.jsx";
import SellerQRPaymentReview from "./pages/seller/SellerQRPaymentReview.jsx";

/*
|--------------------------------------------------------------------------
| CUSTOMER PAGES
|--------------------------------------------------------------------------
*/

import CustomerProducts from "./pages/customer/Products.jsx";
import CustomerCart from "./pages/customer/Cart.jsx";
import Checkout from "./pages/customer/Checkout.jsx";
import CustomerOrders from "./pages/customer/Orders.jsx";
import OrderDetails from "./pages/customer/OrderDetails.jsx";
import OrderSuccess from "./pages/customer/OrderSuccess.jsx";

import SellerPaymentSettings from "./pages/seller/SellerPaymentSettings.jsx";
import Profile from "./pages/Profile.jsx";

import NotificationCenterPage from "./pages/NotificationCenterPage.jsx";
/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://rural-vegetable-shop.onrender.com/api";

/*
|--------------------------------------------------------------------------
| API HELPER
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

  const isFormData =
    options.body instanceof
    FormData;

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
    response =
      await fetch(
        `${API_URL}${endpoint}`,
        {
          ...options,
          headers
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
    throw new Error(
      data.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| AUTH STORAGE
|--------------------------------------------------------------------------
*/

function saveAuth(
  token,
  user
) {
  if (token) {
    localStorage.setItem(
      "token",
      token
    );
  }

  if (user) {
    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(
        "ruralfresh:user-updated",
        {
          detail:
            user || null
        }
      )
    );
  }
}

function getStoredUser() {
  try {
    const value =
      localStorage.getItem(
        "user"
      );

    return value
      ? JSON.parse(value)
      : null;
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem(
    "token"
  );

  localStorage.removeItem(
    "user"
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(
        "ruralfresh:user-updated",
        {
          detail: null
        }
      )
    );
  }
}

/*
|--------------------------------------------------------------------------
| ROLE HOME
|--------------------------------------------------------------------------
*/

function getRoleHome(
  role
) {
  if (role === "admin") {
    return "/admin/dashboard";
  }

  if (role === "seller") {
    return "/seller/dashboard";
  }

  if (role === "customer") {
    return "/products";
  }

  return "/";
}

/*
|--------------------------------------------------------------------------
| COMMON INPUT
|--------------------------------------------------------------------------
*/

function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = true,
  disabled = false,
  autoComplete
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="block text-[11px] font-black uppercase tracking-[0.15em] text-slate-400"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={
          onChange
        }
        placeholder={
          placeholder
        }
        required={
          required
        }
        disabled={
          disabled
        }
        autoComplete={
          autoComplete
        }
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition duration-200 placeholder:text-slate-300 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TEXTAREA
|--------------------------------------------------------------------------
*/

function TextArea({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="block text-[11px] font-black uppercase tracking-[0.15em] text-slate-400"
      >
        {label}
      </label>

      <textarea
        id={name}
        name={name}
        value={value}
        onChange={
          onChange
        }
        placeholder={
          placeholder
        }
        disabled={
          disabled
        }
        required={
          required
        }
        rows={4}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50"
      />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PASSWORD INPUT
|--------------------------------------------------------------------------
*/

function PasswordInput({
  label,
  name,
  value,
  onChange,
  disabled
}) {
  const [
    show,
    setShow
  ] = useState(false);

  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="block text-[11px] font-black uppercase tracking-[0.15em] text-slate-400"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={name}
          name={name}
          type={
            show
              ? "text"
              : "password"
          }
          value={
            value
          }
          onChange={
            onChange
          }
          required
          minLength={
            8
          }
          disabled={
            disabled
          }
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-20 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50"
        />

        <button
          type="button"
          onClick={() =>
            setShow(
              (
                current
              ) =>
                !current
            )
          }
          disabled={
            disabled
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-600 hover:bg-emerald-50"
        >
          {show
            ? "Hide"
            : "Show"}
        </button>
      </div>

      <p className="text-[10px] font-medium text-slate-400">
        At least 8 characters.
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ERROR MESSAGE
|--------------------------------------------------------------------------
*/

function ErrorMessage({
  message
}) {
  if (!message) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-xs font-black text-red-600">
        !
      </div>

      <p className="text-sm font-semibold leading-6 text-red-700">
        {message}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SUCCESS MESSAGE
|--------------------------------------------------------------------------
*/

function SuccessMessage({
  message
}) {
  if (!message) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs font-black text-emerald-600">
        ✓
      </div>

      <p className="text-sm font-semibold leading-6 text-emerald-700">
        {message}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| GLOBAL NAVBAR
|--------------------------------------------------------------------------
*/

function Navbar() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [
    mobileOpen,
    setMobileOpen
  ] = useState(false);

  const [
    user,
    setUser
  ] = useState(
    getStoredUser
  );

  useEffect(() => {
    const handleUserUpdated = (event) => {
      const nextUser =
        event?.detail ||
        getStoredUser();

      setUser(
        nextUser || null
      );
    };

    const handleStorage = () => {
      setUser(
        getStoredUser()
      );
    };

    window.addEventListener(
      "ruralfresh:user-updated",
      handleUserUpdated
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "ruralfresh:user-updated",
        handleUserUpdated
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  const handleLogout =
    () => {
      logout();

      setMobileOpen(
        false
      );

      navigate(
        "/login",
        {
          replace: true
        }
      );
    };

  const isActive =
    (
      path
    ) => {
      if (
        path === "/"
      ) {
        return (
          location.pathname ===
          "/"
        );
      }

      return location.pathname.startsWith(
        path
      );
    };

  return (
    <>
      <header className="sticky top-0 z-[80] border-b border-white/60 bg-white/75 shadow-[0_8px_40px_rgba(15,23,42,0.05)] backdrop-blur-2xl">

        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">

          {/* ========================================================== */}
          {/* BRAND                                                     */}
          {/* ========================================================== */}

          <Link
            to={
              user
                ? getRoleHome(
                    user.role
                  )
                : "/"
            }
            className="group flex items-center gap-3"
          >

            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-xl text-white shadow-lg transition duration-300 group-hover:scale-105">

              <span className="relative z-10">
                🌱
              </span>

              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-transparent to-teal-300/10" />

            </div>

            <div className="hidden sm:block">

              <div className="text-sm font-black tracking-tight text-slate-950">
                Alambagiri Fresh
              </div>

              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Vegetables • Food • Readymade
              </div>

            </div>

          </Link>

          {/* ========================================================== */}
          {/* DESKTOP NAV                                                */}
          {/* ========================================================== */}

          <nav className="hidden items-center gap-1 md:flex">

            <NavItem
              to="/"
              active={
                isActive(
                  "/"
                )
              }
              label="Home"
            />

            <NavItem
              to="/products"
              active={
                isActive(
                  "/products"
                )
              }
              label="Marketplace"
            />

            {user?.role ===
              "customer" && (
              <>
                <NavItem
                  to="/cart"
                  active={
                    isActive(
                      "/cart"
                    )
                  }
                  label="Cart"
                />

                <NavItem
                  to="/orders"
                  active={
                    isActive(
                      "/orders"
                    )
                  }
                  label="Orders"
                />
              </>
            )}

            {user?.role ===
              "seller" && (
              <>
                <NavItem
                  to="/seller/dashboard"
                  active={
                    isActive(
                      "/seller/dashboard"
                    )
                  }
                  label="Dashboard"
                />

                <NavItem
                  to="/seller/products"
                  active={
                    isActive(
                      "/seller/products"
                    )
                  }
                  label="Products"
                />

                <NavItem
                  to="/seller/orders"
                  active={
                    isActive(
                      "/seller/orders"
                    )
                  }
                  label="Orders"
                />
              </>
            )}

            {user?.role ===
              "admin" && (
              <>
                <NavItem
                  to="/admin/dashboard"
                  active={
                    isActive(
                      "/admin/dashboard"
                    )
                  }
                  label="Dashboard"
                />

                <NavItem
                  to="/admin/sellers"
                  active={
                    isActive(
                      "/admin/sellers"
                    )
                  }
                  label="Sellers"
                />

                <NavItem
                  to="/admin/products"
                  active={
                    isActive(
                      "/admin/products"
                    )
                  }
                  label="Products"
                />

                <NavItem
                  to="/admin/orders"
                  active={
                    isActive(
                      "/admin/orders"
                    )
                  }
                  label="Orders"
                />
              </>
            )}

          </nav>

          {/* ========================================================== */}
          {/* USER AREA                                                  */}
          {/* ========================================================== */}

          <div className="flex items-center gap-2">

            {user ? (
              <>
                <Link
                  to="/notifications"
                  aria-label="Open notifications"
                  className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border text-lg shadow-sm transition ${
                    isActive("/notifications")
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white/80 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  🔔
                </Link>

                <Link
                  to="/profile"
                  className={`hidden items-center gap-3 rounded-2xl border px-3 py-2 shadow-sm transition duration-200 sm:flex ${
                    isActive("/profile")
                      ? "border-emerald-300 bg-emerald-50 shadow-emerald-100"
                      : "border-slate-200 bg-white/80 hover:border-emerald-200 hover:bg-emerald-50/70"
                  }`}
                >

                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm ${
                      user.role ===
                      "admin"
                        ? "bg-violet-100 text-violet-700"
                        : user.role ===
                          "seller"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-cyan-100 text-cyan-700"
                    }`}
                  >
                    {user.role ===
                    "admin"
                      ? "🛡️"
                      : user.role ===
                        "seller"
                      ? "👨‍🌾"
                      : "🛒"}
                  </div>

                  <div className="max-w-36 text-left">

                    <p className="truncate text-xs font-black text-slate-900">
                      {user.name ||
                        "Account"}
                    </p>

                    <div className="mt-0.5 flex items-center gap-2">

                      <p
                        className={`text-[9px] font-black uppercase tracking-wider ${
                          user.role ===
                          "admin"
                            ? "text-violet-600"
                            : user.role ===
                              "seller"
                            ? "text-emerald-600"
                            : "text-cyan-600"
                        }`}
                      >
                        {user.role}
                      </p>

                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

                      <span className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                        Online
                      </span>

                    </div>

                  </div>

                  <span className="text-xs font-black text-emerald-600">
                    →
                  </span>

                </Link>

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="hidden rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-black text-red-600 transition hover:bg-red-100 sm:block"
                >
                  Logout
                </button>

              </>
            ) : (
              <>

                <Link
                  to="/login"
                  className="hidden rounded-2xl px-4 py-2.5 text-xs font-black text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 sm:block"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="hidden rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-600 sm:block"
                >
                  Get Started
                </Link>

              </>
            )}

            {/* MOBILE */}

            <button
              type="button"
              onClick={() =>
                setMobileOpen(
                  (
                    current
                  ) =>
                    !current
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg text-slate-800 shadow-sm md:hidden"
              aria-label="Toggle navigation"
            >
              {mobileOpen
                ? "×"
                : "☰"}
            </button>

          </div>

        </div>

        {/* ============================================================ */}
        {/* MOBILE PANEL                                                 */}
        {/* ============================================================ */}

        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-xl md:hidden">

            <div className="space-y-1">

              <MobileNavItem
                to="/"
                label="Home"
                onClick={() =>
                  setMobileOpen(
                    false
                  )
                }
              />

              <MobileNavItem
                to="/products"
                label="Marketplace"
                onClick={() =>
                  setMobileOpen(
                    false
                  )
                }
              />

              {user?.role ===
                "customer" && (
                <>
                  <MobileNavItem
                    to="/cart"
                    label="Cart"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                  />

                  <MobileNavItem
                    to="/orders"
                    label="Orders"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                  />
                </>
              )}

              {user?.role ===
                "seller" && (
                <>
                  <MobileNavItem
                    to="/seller/dashboard"
                    label="Seller Dashboard"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                  />

                  <MobileNavItem
                    to="/seller/products"
                    label="Seller Products"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                  />

                  <MobileNavItem
                    to="/seller/orders"
                    label="Seller Orders"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                  />
                </>
              )}

              {user?.role ===
                "admin" && (
                <>
                  <MobileNavItem
                    to="/admin/dashboard"
                    label="Admin Dashboard"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                  />

                  <MobileNavItem
                    to="/admin/sellers"
                    label="Sellers"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                  />

                  <MobileNavItem
                    to="/admin/products"
                    label="Products"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                  />

                  <MobileNavItem
                    to="/admin/orders"
                    label="Orders"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                  />
                </>
              )}

              {user && (
                <>
                  <MobileNavItem
                    to="/notifications"
                    label="Notifications"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                  />

                  <Link
                    to="/profile"
                  onClick={() =>
                    setMobileOpen(
                      false
                    )
                  }
                  className={`mt-2 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-black transition ${
                    isActive("/profile")
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >

                  <span className="flex items-center gap-3">
                    <span className="text-lg">
                      {user.role ===
                      "admin"
                        ? "🛡️"
                        : user.role ===
                          "seller"
                        ? "👨‍🌾"
                        : "🛒"}
                    </span>

                    <span>
                      My Profile
                    </span>
                  </span>

                  <span className="text-emerald-600">
                    →
                  </span>

                  </Link>
                </>
              )}

            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">

              {user ? (
                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="w-full rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-600"
                >
                  Logout
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">

                  <Link
                    to="/login"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700"
                  >
                    Login
                  </Link>

                  <Link
                    to="/register"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white"
                  >
                    Register
                  </Link>

                </div>
              )}

            </div>

          </div>
        )}

      </header>
    </>
  );
}

/*
|--------------------------------------------------------------------------
| DESKTOP NAV ITEM
|--------------------------------------------------------------------------
*/

function NavItem({
  to,
  active,
  label
}) {
  return (
    <Link
      to={to}
      className={`rounded-2xl px-4 py-2.5 text-xs font-black transition duration-200 ${
        active
          ? "bg-slate-950 text-white shadow-md"
          : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
      }`}
    >
      {label}
    </Link>
  );
}

/*
|--------------------------------------------------------------------------
| MOBILE NAV ITEM
|--------------------------------------------------------------------------
*/

function MobileNavItem({
  to,
  label,
  onClick
}) {
  return (
    <Link
      to={to}
      onClick={
        onClick
      }
      className="block rounded-2xl px-4 py-3 text-sm font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
    >
      {label}
    </Link>
  );
}

/*
|--------------------------------------------------------------------------
| FUTURISTIC HOME
|--------------------------------------------------------------------------
*/

function Home() {
  const [
    liveData,
    setLiveData
  ] = useState(null);

  const [
    history,
    setHistory
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState("");

  const [
    lastUpdated,
    setLastUpdated
  ] = useState(null);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const mountedRef =
    useRef(true);

  /*
  |--------------------------------------------------------------------------
  | LOAD LIVE DATA
  |--------------------------------------------------------------------------
  */

  const loadLiveData =
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

          const response =
            await apiRequest(
              "/api/marketplace/live"
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          const data =
            response?.data;

          if (!data) {
            throw new Error(
              "Live marketplace data is unavailable."
            );
          }

          setLiveData(
            data
          );

          const snapshot = {
            timestamp:
              Date.now(),

            customers:
              Number(
                data.counts
                  ?.customers ||
                  0
              ),

            sellers:
              Number(
                data.counts
                  ?.sellers ||
                  0
              ),

            admins:
              Number(
                data.counts
                  ?.admins ||
                  0
              ),

            products:
              Number(
                data.counts
                  ?.totalProducts ||
                  0
              ),

            vegetables:
              Number(
                data.counts
                  ?.vegetables ||
                  0
              ),

            greenVegetables:
              Number(
                data.counts
                  ?.greenVegetables ||
                  0
              ),

            liveOrders:
              Number(
                data.counts
                  ?.liveOrders ||
                  0
              ),

            orders24h:
              Number(
                data.orders
                  ?.last24Hours ||
                  0
              )
          };

          setHistory(
            (
              previous
            ) => [
              ...previous.slice(
                -23
              ),
              snapshot
            ]
          );

          setLastUpdated(
            data.updatedAt ||
              new Date().toISOString()
          );

          setError("");
        } catch (
          err
        ) {
          console.error(
            "Live marketplace analytics error:",
            err
          );

          if (
            mountedRef.current
          ) {
            setError(
              err.message ||
                "Unable to load live marketplace analytics."
            );
          }
        } finally {
          if (
            mountedRef.current
          ) {
            setLoading(
              false
            );

            setRefreshing(
              false
            );
          }
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      mountedRef.current =
        true;

      loadLiveData();

      return () => {
        mountedRef.current =
          false;
      };
    },
    [
      loadLiveData
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | REAL-TIME REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      const interval =
        setInterval(
          () => {
            loadLiveData(
              true
            );
          },
          5000
        );

      return () => {
        clearInterval(
          interval
        );
      };
    },
    [
      loadLiveData
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | TREND ENGINE
  |--------------------------------------------------------------------------
  */

  const trendData =
    useMemo(
      () => {
        const keys = [
          "customers",
          "sellers",
          "admins",
          "products",
          "vegetables",
          "greenVegetables",
          "liveOrders",
          "orders24h"
        ];

        const result = {};

        for (
          const key of keys
        ) {
          result[key] =
            calculateLiveTrend(
              history,
              key
            );
        }

        return result;
      },
      [
        history
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | LIVE COUNTS
  |--------------------------------------------------------------------------
  */

  const counts =
    liveData?.counts ||
    {};

  const orders =
    liveData?.orders ||
    {};

  const harvest =
    liveData?.harvest ||
    {};

  /*
  |--------------------------------------------------------------------------
  | HARVEST ALERTS
  |--------------------------------------------------------------------------
  */

  const harvestAlerts =
    Array.isArray(
      harvest.next7DaysItems
    )
      ? harvest.next7DaysItems
      : [];

  /*
  |--------------------------------------------------------------------------
  | INTELLIGENCE MESSAGE
  |--------------------------------------------------------------------------
  */

  const intelligence =
    useMemo(
      () =>
        buildIntelligenceMessage(
          liveData,
          trendData
        ),
      [
        liveData,
        trendData
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | DATA STATE
  |--------------------------------------------------------------------------
  */

  const hasData =
    Boolean(
      liveData
    );

  /*
  |--------------------------------------------------------------------------
  | RETURN
  |--------------------------------------------------------------------------
  */

  return (
    <div className="overflow-hidden bg-[#f3f7f5]">

      {/* ========================================================== */}
      {/* LIVE ALERT STRIP                                           */}
      {/* ========================================================== */}

      <section className="border-b border-emerald-200 bg-emerald-50">

        <div className="mx-auto flex max-w-[1800px] items-center gap-3 overflow-hidden px-4 py-2.5 sm:px-6 lg:px-8">

          <div className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-white">

            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />

            LIVE

          </div>

          <div className="min-w-0 flex-1 overflow-hidden">

            <div className="animate-[marquee_28s_linear_infinite] whitespace-nowrap text-xs font-bold text-emerald-800">

              {harvestAlerts.length >
              0 ? (
                harvestAlerts.map(
                  (
                    item,
                    index
                  ) => (
                    <span
                      key={`${item.productId}-${index}`}
                      className="mr-10"
                    >
                      🌱{" "}
                      {item.name}{" "}
                      • Harvest{" "}
                      {item.label}
                    </span>
                  )
                )
              ) : (
                <span>
                  🌱 No upcoming harvest alerts in the next 7 days.
                </span>
              )}

            </div>

          </div>

        </div>

      </section>

      {/* ========================================================== */}
      {/* HERO                                                       */}
      {/* ========================================================== */}

      <section className="relative overflow-hidden bg-slate-950 text-white">

        <div className="pointer-events-none absolute inset-0">

          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-teal-300/10 blur-3xl" />

          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",

              backgroundSize:
                "40px 40px"
            }}
          />

        </div>

        <div className="relative mx-auto max-w-[1800px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">

          <div className="grid items-center gap-12 xl:grid-cols-[1fr_0.95fr]">

            {/* ==================================================== */}
            {/* LEFT                                                    */}
            {/* ==================================================== */}

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">

                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                Live rural intelligence network

              </div>

              <h1 className="mt-7 max-w-5xl text-5xl font-black tracking-[-0.05em] sm:text-6xl lg:text-7xl">

                Fresh food.

                <br />

                <span className="text-emerald-300">
                  Live intelligence.
                </span>

              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-white/45 sm:text-lg">

                RuralFresh connects customers and farmers through a
                real-time marketplace where inventory, orders,
                vegetables and harvest windows are continuously monitored.

              </p>

              <div className="mt-9 flex flex-wrap gap-3">

                <Link
                  to="/products"
                  className="rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-slate-950 shadow-xl transition hover:-translate-y-1 hover:bg-emerald-50"
                >
                  Explore marketplace →
                </Link>

                <Link
                  to="/seller/register"
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-black text-white backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/10"
                >
                  Become a seller
                </Link>

              </div>

              <div className="mt-10 flex flex-wrap items-center gap-4 text-xs">

                <div className="flex items-center gap-2 text-white/40">

                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                  Live database

                </div>

                <span className="text-white/20">
                  •
                </span>

                <div className="text-white/40">

                  {lastUpdated
                    ? `Updated ${formatLiveTime(
                        lastUpdated
                      )}`
                    : "Synchronizing..."}

                </div>

                <button
                  type="button"
                  onClick={() =>
                    loadLiveData(
                      true
                    )
                  }
                  disabled={
                    refreshing
                  }
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black text-white/60 hover:bg-white/10 disabled:opacity-40"
                >
                  {refreshing
                    ? "Syncing..."
                    : "Sync now"}
                </button>

              </div>

            </div>

            {/* ==================================================== */}
            {/* LIVE NETWORK PANEL                                    */}
            {/* ==================================================== */}

            <div className="relative">

              <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-7">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
                      Network intelligence
                    </p>

                    <p className="mt-2 text-xl font-black">
                      Live marketplace pulse
                    </p>

                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                    {hasData
                      ? "✓"
                      : "…"}
                  </div>

                </div>

                {error && (
                  <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-xs text-red-200">
                    {error}
                  </div>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3">

                  <LiveMetric
                    label="Customers"
                    value={
                      counts.customers
                    }
                    trend={
                      trendData.customers
                    }
                    icon="🛒"
                    loading={
                      loading &&
                      !hasData
                    }
                  />

                  <LiveMetric
                    label="Sellers"
                    value={
                      counts.sellers
                    }
                    trend={
                      trendData.sellers
                    }
                    icon="👨‍🌾"
                    loading={
                      loading &&
                      !hasData
                    }
                  />

                  <LiveMetric
                    label="Products"
                    value={
                      counts.totalProducts
                    }
                    trend={
                      trendData.products
                    }
                    icon="📦"
                    loading={
                      loading &&
                      !hasData
                    }
                  />

                  <LiveMetric
                    label="Orders / 24h"
                    value={
                      orders.last24Hours
                    }
                    trend={
                      trendData.orders24h
                    }
                    icon="⚡"
                    loading={
                      loading &&
                      !hasData
                    }
                  />

                </div>

                <div className="mt-4 rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.05] p-5">

                  <div className="flex items-start gap-3">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl">
                      🧠
                    </div>

                    <div className="min-w-0">

                      <p className="text-xs font-black text-emerald-200">
                        Intelligence Engine
                      </p>

                      <p className="mt-2 text-sm font-bold leading-6 text-white/85">
                        {
                          intelligence.title
                        }
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/40">
                        {
                          intelligence.message
                        }
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* ========================================================== */}
      {/* LIVE METRICS                                               */}
      {/* ========================================================== */}

      <section className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8">

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <IntelligenceCard
            label="Customers"
            value={
              counts.customers
            }
            trend={
              trendData.customers
            }
            icon="🛒"
            description="Registered customer network"
          />

          <IntelligenceCard
            label="Sellers"
            value={
              counts.sellers
            }
            trend={
              trendData.sellers
            }
            icon="👨‍🌾"
            description="Active marketplace sellers"
          />

          <IntelligenceCard
            label="Admins"
            value={
              counts.admins
            }
            trend={
              trendData.admins
            }
            icon="🛡️"
            description="Marketplace administration nodes"
          />

          <IntelligenceCard
            label="Products"
            value={
              counts.totalProducts
            }
            trend={
              trendData.products
            }
            icon="📦"
            description="Total catalog records"
          />

        </div>

      </section>

      {/* ========================================================== */}
      {/* VEGETABLE INTELLIGENCE                                    */}
      {/* ========================================================== */}

      <section className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">

          {/* ====================================================== */}
          {/* VEGETABLE NETWORK                                      */}
          {/* ====================================================== */}

          <div className="rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-[0_15px_50px_rgba(15,23,42,0.05)] sm:p-8">

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                  Fresh catalog intelligence
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  What is moving through the farm network?
                </h2>

              </div>

              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700">
                Live inventory
              </div>

            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">

              <LiveStatBlock
                icon="🥕"
                label="Vegetables"
                value={
                  counts.vegetables
                }
                trend={
                  trendData.vegetables
                }
              />

              <LiveStatBlock
                icon="🥬"
                label="Green Vegetables"
                value={
                  counts.greenVegetables
                }
                trend={
                  trendData.greenVegetables
                }
              />

              <LiveStatBlock
                icon="📦"
                label="Available"
                value={
                  counts.availableProducts
                }
                trend={
                  trendData.products
                }
              />

            </div>

            <div className="mt-7 rounded-2xl border border-slate-100 bg-slate-50 p-5">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Out of stock
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {
                      counts.outOfStockProducts ||
                      0
                    }
                  </p>

                </div>

                <div className="text-2xl">
                  ⚠️
                </div>

              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Products currently unavailable for marketplace sale.
              </p>

            </div>

          </div>

          {/* ====================================================== */}
          {/* ORDER ACTIVITY                                         */}
          {/* ====================================================== */}

          <div className="rounded-[30px] border border-slate-200/70 bg-slate-950 p-6 text-white shadow-[0_15px_50px_rgba(15,23,42,0.12)] sm:p-8">

            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300/70">
              Demand pulse
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Live order intelligence
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/40">
              Comparing the latest 24-hour activity against the previous 24-hour window.
            </p>

            <div className="mt-7">

              <div className="flex items-end justify-between gap-4">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wide text-white/30">
                    Orders / 24h
                  </p>

                  <p className="mt-2 text-5xl font-black">
                    {
                      orders.last24Hours ||
                      0
                    }
                  </p>

                </div>

                <TrendPill
                  trend={
                    calculatePercentageTrend(
                      orders.last24Hours,
                      orders.previous24Hours
                    )
                  }
                />

              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">

                  <p className="text-[10px] font-black uppercase tracking-wide text-white/25">
                    Previous 24h
                  </p>

                  <p className="mt-2 text-xl font-black">
                    {
                      orders.previous24Hours ||
                      0
                    }
                  </p>

                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">

                  <p className="text-[10px] font-black uppercase tracking-wide text-white/25">
                    Live Orders
                  </p>

                  <p className="mt-2 text-xl font-black">
                    {
                      counts.liveOrders ||
                      0
                    }
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* ========================================================== */}
      {/* HARVEST RADAR                                             */}
      {/* ========================================================== */}

      <section className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8">

        <div className="rounded-[30px] border border-amber-200 bg-white p-6 shadow-[0_15px_50px_rgba(15,23,42,0.05)] sm:p-8">

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">

            <div>

              <div className="flex items-center gap-2">

                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-xl">
                  🌱
                </span>

                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">
                  Harvest intelligence
                </p>

              </div>

              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                Harvest radar
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Live harvest dates are monitored so the marketplace can surface upcoming farm readiness windows.
              </p>

            </div>

            <div className="grid grid-cols-3 gap-3">

              <HarvestCounter
                label="Today"
                value={
                  harvest.today ||
                  0
                }
              />

              <HarvestCounter
                label="Next 3d"
                value={
                  harvest.next3Days ||
                  0
                }
              />

              <HarvestCounter
                label="Next 7d"
                value={
                  harvest.next7Days ||
                  0
                }
              />

            </div>

          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

            {harvestAlerts.length >
            0 ? (
              harvestAlerts
                .slice(
                  0,
                  8
                )
                .map(
                  (
                    item,
                    index
                  ) => (
                    <HarvestAlertCard
                      key={`${item.productId}-${index}`}
                      item={
                        item
                      }
                    />
                  )
                )
            ) : (
              <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-slate-100 bg-slate-50 p-7 text-center">

                <div className="text-3xl">
                  🌿
                </div>

                <p className="mt-3 text-sm font-black text-slate-900">
                  No upcoming harvest alerts
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  No approved products currently have a harvest date within the next 7 days.
                </p>

              </div>
            )}

          </div>

        </div>

      </section>

      {/* ========================================================== */}
      {/* TREND LAB                                                  */}
      {/* ========================================================== */}

      <section className="mx-auto max-w-[1800px] px-4 pb-8 sm:px-6 lg:px-8">

        <div className="rounded-[30px] border border-slate-200/70 bg-white p-6 shadow-[0_15px_50px_rgba(15,23,42,0.05)] sm:p-8">

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                Live trend lab
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Real-time network movement
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                The intelligence layer watches live snapshots and identifies rising, falling, flat and unusual movement without inventing marketplace data.
              </p>

            </div>

            <div className="rounded-full bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
              {
                history.length
              } snapshots
            </div>

          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            <TrendPanel
              title="Customer network"
              icon="🛒"
              trend={
                trendData.customers
              }
              history={
                history
              }
              dataKey="customers"
            />

            <TrendPanel
              title="Seller network"
              icon="👨‍🌾"
              trend={
                trendData.sellers
              }
              history={
                history
              }
              dataKey="sellers"
            />

            <TrendPanel
              title="Vegetable catalog"
              icon="🥬"
              trend={
                trendData.vegetables
              }
              history={
                history
              }
              dataKey="vegetables"
            />

            <TrendPanel
              title="Live orders"
              icon="⚡"
              trend={
                trendData.liveOrders
              }
              history={
                history
              }
              dataKey="liveOrders"
            />

          </div>

        </div>

      </section>

      {/* ========================================================== */}
      {/* FEATURES                                                   */}
      {/* ========================================================== */}

      <section className="mx-auto grid max-w-[1800px] gap-5 px-4 pb-16 sm:px-6 md:grid-cols-3 lg:px-8">

        <Feature
          icon="🥬"
          number="01"
          title="Fresh by design"
          text="Discover produce from rural sellers with live product, inventory and harvest information."
        />

        <Feature
          icon="🧠"
          number="02"
          title="Marketplace intelligence"
          text="The home page analyzes live marketplace snapshots to reveal movement and operational signals."
        />

        <Feature
          icon="🔐"
          number="03"
          title="Trusted network"
          text="Customer, seller and administrator experiences remain separated while aggregate marketplace intelligence stays available."
        />

      </section>

    </div>
  );
}



/*
|--------------------------------------------------------------------------
| FORMAT LIVE TIME
|--------------------------------------------------------------------------
*/

function formatLiveTime(
  value
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit"
    }
  );
}

/*
|--------------------------------------------------------------------------
| CALCULATE TREND
|--------------------------------------------------------------------------
|
| Lightweight statistical trend model.
|
| It uses a linear slope across live snapshots and compares
| the latest value against the recent baseline.
|
|--------------------------------------------------------------------------
*/

function calculateLiveTrend(
  history,
  key
) {
  if (
    !Array.isArray(
      history
    ) ||
    history.length <
      2
  ) {
    return {
      direction:
        "flat",

      label:
        "Collecting data",

      percent:
        0,

      slope:
        0
    };
  }

  const values =
    history.map(
      (
        item
      ) =>
        Number(
          item?.[
            key
          ] || 0
        )
    );

  const n =
    values.length;

  const meanX =
    (n - 1) /
    2;

  const meanY =
    values.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    ) / n;

  let numerator =
    0;

  let denominator =
    0;

  for (
    let index =
      0;
    index <
    n;
    index += 1
  ) {
    const x =
      index -
      meanX;

    const y =
      values[index] -
      meanY;

    numerator +=
      x * y;

    denominator +=
      x * x;
  }

  const slope =
    denominator
      ? numerator /
        denominator
      : 0;

  const first =
    values[0];

  const latest =
    values[
      values.length -
        1
    ];

  const baseline =
    values
      .slice(
        0,
        Math.max(
          1,
          Math.floor(
            values.length /
              2
          )
        )
      )
      .reduce(
        (
          total,
          value
        ) =>
          total +
          value,
        0
      ) /
    Math.max(
      1,
      Math.floor(
        values.length /
          2
      )
    );

  const percent =
    baseline >
    0
      ? (
          (
            latest -
            baseline
          ) /
          baseline
        ) *
        100
      : latest >
        first
      ? 100
      : 0;

  const normalizedSlope =
    Math.abs(
      meanY
    ) >
    0
      ? slope /
        Math.abs(
          meanY
        )
      : slope;

  let direction =
    "flat";

  let label =
    "Stable";

  if (
    normalizedSlope >
      0.01 &&
    percent >
      0.5
  ) {
    direction =
      "up";

    label =
      "Rising";
  } else if (
    normalizedSlope <
      -0.01 &&
    percent <
      -0.5
  ) {
    direction =
      "down";

    label =
      "Falling";
  } else {
    direction =
      "flat";

    label =
      "Stable";
  }

  return {
    direction,
    label,

    percent:
      Number(
        percent.toFixed(
          1
        )
      ),

    slope:
      Number(
        slope.toFixed(
          4
        )
      )
  };
}

/*
|--------------------------------------------------------------------------
| PERCENTAGE TREND
|--------------------------------------------------------------------------
*/

function calculatePercentageTrend(
  current,
  previous
) {
  const currentValue =
    Number(
      current || 0
    );

  const previousValue =
    Number(
      previous || 0
    );

  if (
    previousValue >
    0
  ) {
    return Number(
      (
        (
          (
            currentValue -
            previousValue
          ) /
          previousValue
        ) *
        100
      ).toFixed(
        1
      )
    );
  }

  if (
    currentValue >
    0
  ) {
    return 100;
  }

  return 0;
}

/*
|--------------------------------------------------------------------------
| INTELLIGENCE MESSAGE
|--------------------------------------------------------------------------
*/

function buildIntelligenceMessage(
  liveData,
  trendData
) {
  if (!liveData) {
    return {
      title:
        "Synchronizing marketplace signals",

      message:
        "Collecting the first live marketplace snapshot."
    };
  }

  const orders24h =
    Number(
      liveData.orders
        ?.last24Hours ||
        0
    );

  const previousOrders =
    Number(
      liveData.orders
        ?.previous24Hours ||
        0
    );

  const orderChange =
    calculatePercentageTrend(
      orders24h,
      previousOrders
    );

  const harvestToday =
    Number(
      liveData.harvest
        ?.today ||
        0
    );

  if (
    harvestToday >
    0
  ) {
    return {
      title:
        `${harvestToday} harvest window${
          harvestToday ===
          1
            ? ""
            : "s"
        } detected today`,

      message:
        "The intelligence layer is flagging today's farm readiness windows for marketplace awareness."
    };
  }

  if (
    orderChange >=
    25
  ) {
    return {
      title:
        "Order activity is accelerating",

      message:
        `The latest 24-hour order activity is ${orderChange}% above the previous 24-hour window.`
    };
  }

  if (
    orderChange <=
    -25
  ) {
    return {
      title:
        "Order activity is cooling",

      message:
        `The latest 24-hour order activity is ${Math.abs(
          orderChange
        )}% below the previous 24-hour window.`
    };
  }

  if (
    trendData.products
      ?.direction ===
    "up"
  ) {
    return {
      title:
        "Marketplace catalog is expanding",

      message:
        "Live product snapshots show the catalog moving upward."
    };
  }

  if (
    trendData.greenVegetables
      ?.direction ===
    "up"
  ) {
    return {
      title:
        "Green vegetable availability is rising",

      message:
        "The live catalog is showing an upward movement in green-vegetable listings."
    };
  }

  return {
    title:
      "Marketplace signals are stable",

    message:
      "Live customer, seller, catalog and order signals are currently moving without a strong anomaly."
  };
}

/*
|--------------------------------------------------------------------------
| TREND PILL
|--------------------------------------------------------------------------
*/

function TrendPill({
  trend = 0
}) {
  const value =
    Number(
      trend || 0
    );

  const direction =
    value > 0
      ? "up"
      : value < 0
      ? "down"
      : "flat";

  return (
    <div
      className={`rounded-full px-3 py-1.5 text-xs font-black ${
        direction ===
        "up"
          ? "bg-emerald-400/10 text-emerald-300"
          : direction ===
            "down"
          ? "bg-red-400/10 text-red-300"
          : "bg-white/10 text-white/50"
      }`}
    >
      {direction ===
      "up"
        ? "↗"
        : direction ===
          "down"
        ? "↘"
        : "→"}{" "}
      {Math.abs(
        value
      )}%
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| LIVE METRIC
|--------------------------------------------------------------------------
*/

function LiveMetric({
  label,
  value,
  trend,
  icon,
  loading
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/25">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black">
            {loading
              ? "—"
              : Number(
                  value ||
                    0
                ).toLocaleString(
                  "en-IN"
                )}
          </p>

        </div>

        <span className="text-lg">
          {icon}
        </span>

      </div>

      <div className="mt-3 flex items-center justify-between">

        <span
          className={`text-[10px] font-black ${
            trend?.direction ===
            "up"
              ? "text-emerald-300"
              : trend?.direction ===
                "down"
              ? "text-red-300"
              : "text-white/35"
          }`}
        >
          {trend?.direction ===
          "up"
            ? "↗ Rising"
            : trend?.direction ===
              "down"
            ? "↘ Falling"
            : "→ Stable"}
        </span>

        <span className="text-[9px] text-white/25">
          live
        </span>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INTELLIGENCE CARD
|--------------------------------------------------------------------------
*/

function IntelligenceCard({
  label,
  value,
  trend,
  icon,
  description
}) {
  return (
    <div className="group rounded-[26px] border border-slate-200/70 bg-white p-6 shadow-[0_15px_50px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-emerald-200">

      <div className="flex items-start justify-between gap-4">

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white">
          {icon}
        </div>

        <TrendPill
          trend={
            trend?.percent ||
            0
          }
        />

      </div>

      <p className="mt-6 text-xs font-black uppercase tracking-[0.15em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-950">
        {Number(
          value || 0
        ).toLocaleString(
          "en-IN"
        )}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| LIVE STAT BLOCK
|--------------------------------------------------------------------------
*/

function LiveStatBlock({
  icon,
  label,
  value,
  trend
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">

      <div className="flex items-center justify-between">

        <span className="text-2xl">
          {icon}
        </span>

        <span
          className={`text-xs font-black ${
            trend?.direction ===
            "up"
              ? "text-emerald-600"
              : trend?.direction ===
                "down"
              ? "red"
              : "slate-400"
          }`}
        >
          {trend?.direction ===
          "up"
            ? "↗"
            : trend?.direction ===
              "down"
            ? "↘"
            : "→"}
        </span>

      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black text-slate-950">
        {Number(
          value || 0
        ).toLocaleString(
          "en-IN"
        )}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        Live marketplace data
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| HARVEST COUNTER
|--------------------------------------------------------------------------
*/

function HarvestCounter({
  label,
  value
}) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-center">

      <p className="text-[10px] font-black uppercase tracking-wide text-amber-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-amber-900">
        {Number(
          value || 0
        ).toLocaleString(
          "en-IN"
        )}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| HARVEST ALERT CARD
|--------------------------------------------------------------------------
*/

function HarvestAlertCard({
  item
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-amber-200 hover:bg-amber-50/40">

      <div className="flex items-start justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
            🌱
          </div>

          <div className="min-w-0">

            <p className="truncate text-sm font-black text-slate-900">
              {
                item.name
              }
            </p>

            <p className="mt-1 truncate text-xs text-slate-400">
              {
                item.category ||
                "Vegetable"
              }
            </p>

          </div>

        </div>

        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700">
          {
            item.label
          }
        </span>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TREND PANEL
|--------------------------------------------------------------------------
*/

function TrendPanel({
  title,
  icon,
  trend,
  history,
  dataKey
}) {
  const points =
    history.map(
      (
        item
      ) =>
        Number(
          item?.[
            dataKey
          ] || 0
        )
    );

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">

      <div className="flex items-center justify-between gap-3">

        <div className="flex items-center gap-3">

          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg">
            {icon}
          </span>

          <div>

            <p className="text-sm font-black text-slate-900">
              {title}
            </p>

            <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
              {trend?.label ||
                "Stable"}
            </p>

          </div>

        </div>

        <span
          className={`text-xs font-black ${
            trend?.direction ===
            "up"
              ? "text-emerald-600"
              : trend?.direction ===
                "down"
              ? "text-red-600"
              : "text-slate-400"
          }`}
        >
          {trend?.direction ===
          "up"
            ? "↗"
            : trend?.direction ===
              "down"
            ? "↘"
            : "→"}
        </span>

      </div>

      <div className="mt-5">

        <Sparkline
          values={
            points
          }
        />

      </div>

      <div className="mt-4 flex items-center justify-between text-xs">

        <span className="text-slate-400">
          Recent movement
        </span>

        <span className="font-black text-slate-700">
          {trend?.percent >=
          0
            ? "+"
            : ""}
          {trend?.percent ||
            0}
          %
        </span>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SPARKLINE
|--------------------------------------------------------------------------
*/

function Sparkline({
  values
}) {
  if (
    !Array.isArray(
      values
    ) ||
    values.length <
      2
  ) {
    return (
      <div className="flex h-20 items-center justify-center rounded-xl bg-white text-[10px] font-bold text-slate-300">
        Collecting live trend...
      </div>
    );
  }

  const width =
    280;

  const height =
    80;

  const padding =
    6;

  const min =
    Math.min(
      ...values
    );

  const max =
    Math.max(
      ...values
    );

  const range =
    Math.max(
      max -
        min,
      1
    );

  const points =
    values.map(
      (
        value,
        index
      ) => {
        const x =
          padding +
          (
            index /
            Math.max(
              values.length -
                1,
              1
            )
          ) *
            (
              width -
              padding *
                2
            );

        const y =
          height -
          padding -
          (
            (
              value -
              min
            ) /
            range
          ) *
            (
              height -
              padding *
                2
            );

        return `${x},${y}`;
      }
    );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-20 w-full overflow-visible"
      role="img"
      aria-label="Live trend"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={
          points.join(
            " "
          )
        }
        className="text-emerald-500"
      />

      <circle
        cx={
          Number(
            points[
              points.length -
                1
            ].split(
              ","
            )[0]
          )
        }
        cy={
          Number(
            points[
              points.length -
                1
            ].split(
              ","
            )[1]
          )
        }
        r="4"
        className="fill-emerald-500"
      />
    </svg>
  );
}
/*
|--------------------------------------------------------------------------
| NETWORK METRIC
|--------------------------------------------------------------------------
*/

function NetworkMetric({
  label,
  value
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">

      <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/25">
        {label}
      </p>

      <p className="mt-2 text-sm font-black text-emerald-300">
        {value}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| FEATURE CARD
|--------------------------------------------------------------------------
*/

function Feature({
  icon,
  number,
  title,
  text
}) {
  return (
    <div className="group rounded-[28px] border border-slate-200/70 bg-white p-7 shadow-[0_15px_50px_rgba(15,23,42,0.045)] transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_25px_70px_rgba(16,185,129,0.10)]">

      <div className="flex items-start justify-between">

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-2xl text-white transition group-hover:bg-emerald-600">
          {icon}
        </div>

        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">
          {number}
        </span>

      </div>

      <h3 className="mt-7 text-xl font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-7 text-slate-500">
        {text}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| AUTH LAYOUT
|--------------------------------------------------------------------------
*/

function AuthLayout({
  title,
  subtitle,
  children
}) {
  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[#f2f7f4] px-4 py-12 sm:py-16">

      <div className="pointer-events-none absolute inset-0">

        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />

        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-teal-200/20 blur-3xl" />

      </div>

      <div className="relative mx-auto max-w-xl">

        <div className="mb-7 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-950 text-3xl text-white shadow-xl">
            🌱
          </div>

          <div className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-emerald-600">
            RuralFresh identity
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {subtitle}
          </p>

        </div>

        <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_25px_90px_rgba(15,23,42,0.09)] backdrop-blur-xl sm:p-8">
          {children}
        </div>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

function Login() {
  const navigate =
    useNavigate();

  const [
    formData,
    setFormData
  ] = useState({
    email:
      "",
    password:
      ""
  });

  const [
    error,
    setError
  ] = useState("");

  const [
    loading,
    setLoading
  ] = useState(false);

  const handleChange =
    (
      event
    ) => {
      const {
        name,
        value
      } =
        event.target;

      setFormData(
        (
          previous
        ) => ({
          ...previous,
          [name]:
            value
        })
      );
    };

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      setError("");

      if (
        !formData.email.trim()
      ) {
        setError(
          "Email is required."
        );
        return;
      }

      if (
        !formData.password
      ) {
        setError(
          "Password is required."
        );
        return;
      }

      setLoading(
        true
      );

      try {
        const data =
          await apiRequest(
            "/api/auth/login",
            {
              method:
                "POST",
              body:
                JSON.stringify(
                  {
                    email:
                      formData.email
                        .trim()
                        .toLowerCase(),
                    password:
                      formData.password
                  }
                )
            }
          );

        saveAuth(
          data.token,
          data.user
        );

        navigate(
          getRoleHome(
            data.user?.role
          ),
          {
            replace:
              true
          }
        );
      } catch (
        error
      ) {
        setError(
          error.message ||
            "Login failed."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your RuralFresh workspace."
    >

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >

        <ErrorMessage
          message={
            error
          }
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={
            formData.email
          }
          onChange={
            handleChange
          }
          placeholder="you@example.com"
          autoComplete="email"
          disabled={
            loading
          }
        />

        <PasswordInput
          label="Password"
          name="password"
          value={
            formData.password
          }
          onChange={
            handleChange
          }
          disabled={
            loading
          }
        />

        <button
          type="submit"
          disabled={
            loading
          }
          className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Authenticating..."
            : "Enter RuralFresh →"}
        </button>

      </form>

      <div className="mt-7 rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500">

        New to RuralFresh?{" "}

        <Link
          to="/register"
          className="font-black text-emerald-700 hover:underline"
        >
          Create an account
        </Link>

      </div>

    </AuthLayout>
  );
}

/*
|--------------------------------------------------------------------------
| CUSTOMER REGISTER
|--------------------------------------------------------------------------
*/

function CustomerRegister() {
  const navigate =
    useNavigate();

  const [
    formData,
    setFormData
  ] = useState({
    name:
      "",
    email:
      "",
    phone:
      "",
    password:
      "",
    confirmPassword:
      ""
  });

  const [
    error,
    setError
  ] = useState("");

  const [
    loading,
    setLoading
  ] = useState(false);

  const handleChange =
    (
      event
    ) => {
      const {
        name,
        value
      } =
        event.target;

      setFormData(
        (
          previous
        ) => ({
          ...previous,
          [name]:
            value
        })
      );
    };

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      setError("");

      if (
        !formData.name.trim() ||
        !formData.email.trim() ||
        !formData.phone.trim() ||
        !formData.password
      ) {
        setError(
          "Please complete all required fields."
        );
        return;
      }

      if (
        !/^[6-9][0-9]{9}$/.test(
          formData.phone.trim()
        )
      ) {
        setError(
          "Enter a valid 10-digit Indian phone number."
        );
        return;
      }

      if (
        formData.password.length <
        8
      ) {
        setError(
          "Password must contain at least 8 characters."
        );
        return;
      }

      if (
        formData.password !==
        formData.confirmPassword
      ) {
        setError(
          "Passwords do not match."
        );
        return;
      }

      setLoading(
        true
      );

      try {
        const data =
          await apiRequest(
            "/api/auth/register/customer",
            {
              method:
                "POST",
              body:
                JSON.stringify(
                  {
                    name:
                      formData.name.trim(),
                    email:
                      formData.email
                        .trim()
                        .toLowerCase(),
                    phone:
                      formData.phone.trim(),
                    password:
                      formData.password
                  }
                )
            }
          );

        saveAuth(
          data.token,
          data.user
        );

        navigate(
          "/products",
          {
            replace:
              true
          }
        );
      } catch (
        error
      ) {
        setError(
          error.message ||
            "Customer registration failed."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  return (
    <AuthLayout
      title="Create customer account"
      subtitle="Build your fresh-food shopping profile."
    >

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >

        <ErrorMessage
          message={
            error
          }
        />

        <Input
          label="Full name"
          name="name"
          value={
            formData.name
          }
          onChange={
            handleChange
          }
          placeholder="Enter your full name"
          autoComplete="name"
          disabled={
            loading
          }
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={
            formData.email
          }
          onChange={
            handleChange
          }
          placeholder="you@example.com"
          autoComplete="email"
          disabled={
            loading
          }
        />

        <Input
          label="Phone"
          name="phone"
          type="tel"
          value={
            formData.phone
          }
          onChange={
            handleChange
          }
          placeholder="9876543210"
          autoComplete="tel"
          disabled={
            loading
          }
        />

        <PasswordInput
          label="Password"
          name="password"
          value={
            formData.password
          }
          onChange={
            handleChange
          }
          disabled={
            loading
          }
        />

        <PasswordInput
          label="Confirm password"
          name="confirmPassword"
          value={
            formData.confirmPassword
          }
          onChange={
            handleChange
          }
          disabled={
            loading
          }
        />

        <button
          type="submit"
          disabled={
            loading
          }
          className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading
            ? "Creating identity..."
            : "Create customer account →"}
        </button>

      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Already registered?{" "}

        <Link
          to="/login"
          className="font-black text-emerald-700 hover:underline"
        >
          Login
        </Link>
      </div>

    </AuthLayout>
  );
}

/*
|--------------------------------------------------------------------------
| SELLER REGISTER
|--------------------------------------------------------------------------
*/

function SellerRegister() {
  const navigate =
    useNavigate();

  const [
    formData,
    setFormData
  ] = useState({
    name:
      "",
    email:
      "",
    phone:
      "",
    password:
      "",
    confirmPassword:
      "",
    farmName:
      "",
    farmDescription:
      "",
    village:
      "",
    district:
      "",
    state:
      ""
  });

  const [
    error,
    setError
  ] = useState("");

  const [
    success,
    setSuccess
  ] = useState("");

  const [
    loading,
    setLoading
  ] = useState(false);

  const handleChange =
    (
      event
    ) => {
      const {
        name,
        value
      } =
        event.target;

      setFormData(
        (
          previous
        ) => ({
          ...previous,
          [name]:
            value
        })
      );
    };

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      if (
        !formData.name.trim() ||
        !formData.email.trim() ||
        !formData.phone.trim() ||
        !formData.password ||
        !formData.farmName.trim()
      ) {
        setError(
          "Name, email, phone, password and farm name are required."
        );
        return;
      }

      if (
        !/^[6-9][0-9]{9}$/.test(
          formData.phone.trim()
        )
      ) {
        setError(
          "Enter a valid 10-digit Indian phone number."
        );
        return;
      }

      if (
        formData.password.length <
        8
      ) {
        setError(
          "Password must contain at least 8 characters."
        );
        return;
      }

      if (
        formData.password !==
        formData.confirmPassword
      ) {
        setError(
          "Passwords do not match."
        );
        return;
      }

      setLoading(
        true
      );

      try {
        const data =
          await apiRequest(
            "/api/auth/register/seller",
            {
              method:
                "POST",
              body:
                JSON.stringify(
                  {
                    name:
                      formData.name.trim(),
                    email:
                      formData.email
                        .trim()
                        .toLowerCase(),
                    phone:
                      formData.phone.trim(),
                    password:
                      formData.password,
                    farmName:
                      formData.farmName.trim(),
                    farmDescription:
                      formData.farmDescription.trim(),
                    village:
                      formData.village.trim(),
                    district:
                      formData.district.trim(),
                    state:
                      formData.state.trim()
                  }
                )
            }
          );

        logout();

        setSuccess(
          data.message ||
            "Seller account created successfully. Waiting for administrator approval."
        );

        setTimeout(
          () => {
            navigate(
              "/login",
              {
                replace:
                  true
              }
            );
          },
          1800
        );
      } catch (
        error
      ) {
        setError(
          error.message ||
            "Seller registration failed."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  return (
    <AuthLayout
      title="Join the seller network"
      subtitle="Create your farm profile and start building your digital produce catalog."
    >

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-6"
      >

        <ErrorMessage
          message={
            error
          }
        />

        <SuccessMessage
          message={
            success
          }
        />

        <div>

          <div className="mb-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600">
              Identity
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-950">
              Personal information
            </h2>
          </div>

          <div className="space-y-5">

            <Input
              label="Full name"
              name="name"
              value={
                formData.name
              }
              onChange={
                handleChange
              }
              placeholder="Your full name"
              autoComplete="name"
              disabled={
                loading
              }
            />

            <Input
              label="Email"
              name="email"
              type="email"
              value={
                formData.email
              }
              onChange={
                handleChange
              }
              placeholder="you@example.com"
              autoComplete="email"
              disabled={
                loading
              }
            />

            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={
                formData.phone
              }
              onChange={
                handleChange
              }
              placeholder="9876543210"
              autoComplete="tel"
              disabled={
                loading
              }
            />

            <PasswordInput
              label="Password"
              name="password"
              value={
                formData.password
              }
              onChange={
                handleChange
              }
              disabled={
                loading
              }
            />

            <PasswordInput
              label="Confirm password"
              name="confirmPassword"
              value={
                formData.confirmPassword
              }
              onChange={
                handleChange
              }
              disabled={
                loading
              }
            />

          </div>

        </div>

        <div className="border-t border-slate-100 pt-6">

          <div className="mb-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600">
              Farm profile
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-950">
              Your farm
            </h2>
          </div>

          <div className="space-y-5">

            <Input
              label="Farm name"
              name="farmName"
              value={
                formData.farmName
              }
              onChange={
                handleChange
              }
              placeholder="Green Valley Farm"
              disabled={
                loading
              }
            />

            <TextArea
              label="Farm description"
              name="farmDescription"
              value={
                formData.farmDescription
              }
              onChange={
                handleChange
              }
              placeholder="Tell customers about your farm and produce."
              disabled={
                loading
              }
            />

            <div className="grid gap-5 sm:grid-cols-2">

              <Input
                label="Village"
                name="village"
                value={
                  formData.village
                }
                onChange={
                  handleChange
                }
                placeholder="Village"
                disabled={
                  loading
                }
                required={
                  false
                }
              />

              <Input
                label="District"
                name="district"
                value={
                  formData.district
                }
                onChange={
                  handleChange
                }
                placeholder="District"
                disabled={
                  loading
                }
                required={
                  false
                }
              />

              <div className="sm:col-span-2">

                <Input
                  label="State"
                  name="state"
                  value={
                    formData.state
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Karnataka"
                  disabled={
                    loading
                  }
                  required={
                    false
                  }
                />

              </div>

            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">

          <p className="text-xs font-black text-amber-800">
            Seller verification
          </p>

          <p className="mt-1 text-xs leading-5 text-amber-700">
            Your account will start in pending status.
            An administrator must approve the seller account
            before seller operations are enabled.
          </p>

        </div>

        <button
          type="submit"
          disabled={
            loading
          }
          className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-xl transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Creating seller profile..."
            : "Submit seller application →"}
        </button>

      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Already have a seller account?{" "}

        <Link
          to="/login"
          className="font-black text-emerald-700 hover:underline"
        >
          Login
        </Link>
      </div>

    </AuthLayout>
  );
}

/*
|--------------------------------------------------------------------------
| REGISTER SELECTOR
|--------------------------------------------------------------------------
*/

function Register() {
  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-[#f3f7f5] px-4 py-16">

      <div className="pointer-events-none absolute inset-0">

        <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />

        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-teal-200/20 blur-3xl" />

      </div>

      <div className="relative mx-auto max-w-5xl">

        <div className="text-center">

          <div className="text-5xl">
            🌱
          </div>

          <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
            Choose your experience
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Enter the RuralFresh network
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500">
            Shop fresh food or build your own rural marketplace presence.
          </p>

        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">

          <RoleCard
            to="/customer/register"
            icon="🛒"
            eyebrow="BUY"
            title="Customer"
            text="Discover fresh vegetables, manage your cart and track every order."
          />

          <RoleCard
            to="/seller/register"
            icon="👨‍🌾"
            eyebrow="SELL"
            title="Seller"
            text="Build your farm catalog, manage inventory and serve customers."
          />

        </div>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ROLE CARD
|--------------------------------------------------------------------------
*/

function RoleCard({
  to,
  icon,
  eyebrow,
  title,
  text
}) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-white p-8 shadow-[0_20px_70px_rgba(15,23,42,0.055)] transition duration-300 hover:-translate-y-2 hover:border-emerald-200 hover:shadow-[0_30px_90px_rgba(16,185,129,0.13)]"
    >

      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-100/50 blur-3xl transition group-hover:bg-emerald-200/60" />

      <div className="relative">

        <div className="flex items-start justify-between">

          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-950 text-3xl text-white transition group-hover:bg-emerald-600">
            {icon}
          </div>

          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
            {eyebrow}
          </span>

        </div>

        <h2 className="mt-8 text-2xl font-black text-slate-950">
          {title}
        </h2>

        <p className="mt-3 text-sm leading-7 text-slate-500">
          {text}
        </p>

        <div className="mt-8 flex items-center justify-between">

          <span className="text-sm font-black text-emerald-700">
            Continue
          </span>

          <span className="transition group-hover:translate-x-1">
            →
          </span>

        </div>

      </div>

    </Link>
  );
}

/*
|--------------------------------------------------------------------------
| PROTECTED ROUTE
|--------------------------------------------------------------------------
*/

function ProtectedRoute({
  children,
  roles
}) {
  const token =
    localStorage.getItem(
      "token"
    );

  const user =
    getStoredUser();

  if (
    !token ||
    !user
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    roles &&
    !roles.includes(
      user.role
    )
  ) {
    return (
      <Navigate
        to={
          getRoleHome(
            user.role
          )
        }
        replace
      />
    );
  }

  return children;
}

/*
|--------------------------------------------------------------------------
| APP CONTENT
|--------------------------------------------------------------------------
*/
function AppContent() {
  return (
    <div className="min-h-screen bg-[#f4f8f6] text-slate-900">

      <Navbar />

      <Routes>

        {/* ========================================================== */}
        {/* PUBLIC                                                     */}
        {/* ========================================================== */}

        <Route
          path="/"
          element={
            <Home />
          }
        />

        <Route
          path="/login"
          element={
            <Login />
          }
        />

        <Route
          path="/register"
          element={
            <Register />
          }
        />

        <Route
          path="/customer/register"
          element={
            <CustomerRegister />
          }
        />

        <Route
          path="/seller/register"
          element={
            <SellerRegister />
          }
        />
        {/* ========================================================== */}
        {/* CUSTOMER                                                   */}
        {/* ========================================================== */}
          /*
          |--------------------------------------------------------------------------
          | CUSTOMER
          |--------------------------------------------------------------------------
          */

          <Route
            path="/products"
            element={
              <CustomerProducts />
            }
          />

          <Route
            path="/cart"
            element={
              <ProtectedRoute
                roles={[
                  "customer"
                ]}
              >
                <CustomerCart />
              </ProtectedRoute>
            }
          />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute
                roles={[
                  "customer"
                ]}
              >
                <Checkout />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute
                roles={[
                  "customer"
                ]}
              >
                <CustomerOrders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute
                roles={[
                  "customer"
                ]}
              >
                <OrderDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/order-success/:orderId"
            element={
              <ProtectedRoute
                roles={[
                  "customer"
                ]}
              >
                <OrderSuccess />
              </ProtectedRoute>
            }
          />

          <Route
            path="/qr-payment/:orderId"
            element={
              <ProtectedRoute
                roles={[
                  "customer"
                ]}
              >
                <SellerQRPayment />
              </ProtectedRoute>
            }
          />

        {/* ========================================================== */}
        {/* SELLER                                                     */}
        {/* ========================================================== */}

          /*
          |--------------------------------------------------------------------------
          | SELLER
          |--------------------------------------------------------------------------
          */

          <Route
            path="/seller/dashboard"
            element={
              <ProtectedRoute
                roles={[
                  "seller"
                ]}
              >
                <SellerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/seller/products"
            element={
              <ProtectedRoute
                roles={[
                  "seller"
                ]}
              >
                <SellerProducts />
              </ProtectedRoute>
            }
          />

          <Route
            path="/seller/products/add"
            element={
              <ProtectedRoute
                roles={[
                  "seller"
                ]}
              >
                <SellerAddProduct />
              </ProtectedRoute>
            }
          />

          <Route
            path="/seller/products/:id/edit"
            element={
              <ProtectedRoute
                roles={[
                  "seller"
                ]}
              >
                <SellerEditProduct />
              </ProtectedRoute>
            }
          />





          <Route
            path="/notifications"
            element={
              <ProtectedRoute
                roles={[
                  "admin",
                  "seller",
                  "customer"
                ]}
              >
                <NotificationCenterPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/seller/orders"
            element={
              <ProtectedRoute
                roles={[
                  "seller"
                ]}
              >
                <SellerOrders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/seller/orders/:id"
            element={
              <ProtectedRoute
                roles={[
                  "seller"
                ]}
              >
                <SellerOrderDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/seller/payment-settings"
            element={
              <ProtectedRoute
                roles={[
                  "seller"
                ]}
              >
                <SellerPaymentSettings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/seller/qr-payments"
            element={
              <ProtectedRoute
                roles={[
                  "seller"
                ]}
              >
                <SellerQRPaymentReview />
              </ProtectedRoute>
            }
          />        
        {/* ========================================================== */}
        {/* ADMIN                                                      */}
        {/* ========================================================== */}

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute
              roles={[
                "admin"
              ]}
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/sellers"
          element={
            <ProtectedRoute
              roles={[
                "admin"
              ]}
            >
              <AdminSellers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/products"
          element={
            <ProtectedRoute
              roles={[
                "admin"
              ]}
            >
              <AdminProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders/:id"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminOrderDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminOrders />
            </ProtectedRoute>
          }
        />

        


        <Route
          path="/notifications"
          element={
            <ProtectedRoute
              roles={[
                "admin",
                "seller",
                "customer"
              ]}
            >
              <NotificationCenterPage />
            </ProtectedRoute>
          }
        />

        {/* ========================================================== */}
        {/* PROFILE                                                     */}
        {/* ========================================================== */}

        <Route
          path="/profile"
          element={
            <ProtectedRoute
              roles={[
                "customer",
                "seller",
                "admin"
              ]}
            >
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* ========================================================== */}
        {/* FALLBACK                                                    */}
        {/* ========================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

      {/* ============================================================ */}
      {/* FOOTER                                                       */}
      {/* ============================================================ */}

      <footer className="border-t border-slate-200 bg-white">

        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">

          <div>

            <p className="text-sm font-black text-slate-950">
              RuralFresh
            </p>

            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Rural vegetable marketplace
            </p>

          </div>

          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
            © {new Date().getFullYear()} RuralFresh Network
          </div>

        </div>

      </footer>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ROOT APP
|--------------------------------------------------------------------------
*/

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}