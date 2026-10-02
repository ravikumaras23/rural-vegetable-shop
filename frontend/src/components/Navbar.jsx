import {
  useEffect,
  useState
} from "react";

import {
  Link,
  NavLink,
  useLocation,
  useNavigate
} from "react-router-dom";

import NotificationBell from "../notifications/shared/NotificationBell.jsx";

/*
|--------------------------------------------------------------------------
| GET STORED USER
|--------------------------------------------------------------------------
*/

function getStoredUser() {
  try {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    const parsedUser =
      JSON.parse(storedUser);

    if (!parsedUser) {
      return null;
    }

    return parsedUser;
  } catch (error) {
    console.error(
      "Unable to read stored user:",
      error
    );

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| GET ROLE HOME
|--------------------------------------------------------------------------
*/

function getRoleHome(role) {
  const normalizedRole =
    String(role || "")
      .trim()
      .toLowerCase();

  switch (normalizedRole) {
    case "admin":
      return "/admin/dashboard";

    case "seller":
      return "/seller/dashboard";

    case "customer":
      return "/products";

    default:
      return "/";
  }
}

/*
|--------------------------------------------------------------------------
| GET ROLE LABEL
|--------------------------------------------------------------------------
*/

function getRoleLabel(role) {
  const normalizedRole =
    String(role || "")
      .trim()
      .toLowerCase();

  switch (normalizedRole) {
    case "admin":
      return "Administrator";

    case "seller":
      return "Seller";

    case "customer":
      return "Customer";

    default:
      return "User";
  }
}

/*
|--------------------------------------------------------------------------
| GET USER NAME
|--------------------------------------------------------------------------
*/

function getUserName(user) {
  if (!user) {
    return "";
  }

  return (
    user.name ||
    user.fullName ||
    user.username ||
    user.email?.split("@")[0] ||
    "User"
  );
}

/*
|--------------------------------------------------------------------------
| GET USER INITIALS
|--------------------------------------------------------------------------
*/

function getUserInitials(user) {
  const name =
    getUserName(user);

  if (!name) {
    return "U";
  }

  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .substring(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

/*
|--------------------------------------------------------------------------
| NAVBAR
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
    profileOpen,
    setProfileOpen
  ] = useState(false);

  const [
    user,
    setUser
  ] = useState(() =>
    getStoredUser()
  );

  /*
  |--------------------------------------------------------------------------
  | SYNC USER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleUserUpdated =
      (event) => {
        const nextUser =
          event?.detail ||
          getStoredUser();

        setUser(
          nextUser || null
        );
      };

    const handleStorage =
      () => {
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

  /*
  |--------------------------------------------------------------------------
  | CLOSE MOBILE MENU WHEN ROUTE CHANGES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [
    location.pathname
  ]);

  /*
  |--------------------------------------------------------------------------
  | CLOSE PROFILE DROPDOWN OUTSIDE CLICK
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleOutsideClick =
      (event) => {
        if (
          !event.target.closest(
            "[data-profile-menu]"
          )
        ) {
          setProfileOpen(false);
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
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const handleLogout =
    () => {
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      localStorage.removeItem(
        "authUser"
      );

      localStorage.removeItem(
        "currentUser"
      );

      setUser(null);
      setMobileOpen(false);
      setProfileOpen(false);

      window.dispatchEvent(
        new CustomEvent(
          "ruralfresh:user-updated",
          {
            detail: null
          }
        )
      );

      navigate(
        "/login",
        {
          replace: true
        }
      );
    };

  /*
  |--------------------------------------------------------------------------
  | ACTIVE LINK
  |--------------------------------------------------------------------------
  */

  const isActive =
    (path) => {
      if (path === "/") {
        return (
          location.pathname ===
          "/"
        );
      }

      return location.pathname.startsWith(
        path
      );
    };

  /*
  |--------------------------------------------------------------------------
  | ROLE
  |--------------------------------------------------------------------------
  */

  const role =
    String(
      user?.role || ""
    )
      .trim()
      .toLowerCase();

  const authenticated =
    Boolean(
      user ||
      localStorage.getItem(
        "token"
      )
    );

  /*
  |--------------------------------------------------------------------------
  | PUBLIC NAVIGATION
  |--------------------------------------------------------------------------
  */

  const publicLinks = [
    {
      label: "Home",
      path: "/"
    },
    {
      label: "Products",
      path: "/products"
    }
  ];

  /*
  |--------------------------------------------------------------------------
  | CUSTOMER NAVIGATION
  |--------------------------------------------------------------------------
  */

  const customerLinks = [
    {
      label: "Products",
      path: "/products"
    },
    {
      label: "Cart",
      path: "/cart"
    },
    {
      label: "My Orders",
      path: "/orders"
    }
  ];

  /*
  |--------------------------------------------------------------------------
  | SELLER NAVIGATION
  |--------------------------------------------------------------------------
  */

  const sellerLinks = [
    {
      label: "Dashboard",
      path: "/seller/dashboard"
    },
    {
      label: "Products",
      path: "/seller/products"
    },
    {
      label: "Orders",
      path: "/seller/orders"
    }
  ];

  /*
  |--------------------------------------------------------------------------
  | ADMIN NAVIGATION
  |--------------------------------------------------------------------------
  */

  const adminLinks = [
    {
      label: "Dashboard",
      path: "/admin/dashboard"
    },
    {
      label: "Sellers",
      path: "/admin/sellers"
    },
    {
      label: "Products",
      path: "/admin/products"
    },
    {
      label: "Orders",
      path: "/admin/orders"
    }
  ];

  /*
  |--------------------------------------------------------------------------
  | SELECT LINKS
  |--------------------------------------------------------------------------
  */

  let navigationLinks =
    publicLinks;

  if (role === "customer") {
    navigationLinks =
      customerLinks;
  }

  if (role === "seller") {
    navigationLinks =
      sellerLinks;
  }

  if (role === "admin") {
    navigationLinks =
      adminLinks;
  }

  /*
  |--------------------------------------------------------------------------
  | NAV LINK CLASS
  |--------------------------------------------------------------------------
  */

  const navLinkClass =
    (path) =>
      `rounded-xl px-3 py-2 text-sm font-bold transition ${
        isActive(path)
          ? "bg-emerald-50 text-emerald-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-emerald-700"
      }`;

  /*
  |--------------------------------------------------------------------------
  | MOBILE LINK CLASS
  |--------------------------------------------------------------------------
  */

  const mobileLinkClass =
    (path) =>
      `block rounded-xl px-4 py-3 text-sm font-bold transition ${
        isActive(path)
          ? "bg-emerald-50 text-emerald-700"
          : "text-slate-700 hover:bg-slate-50"
      }`;

  return (
    <>
      <header className="sticky top-0 z-[80] border-b border-white/60 bg-white/80 shadow-[0_8px_40px_rgba(15,23,42,0.05)] backdrop-blur-2xl">

        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

          {/* ========================================================= */}
          {/* BRAND                                                     */}
          {/* ========================================================= */}

          <Link
            to={
              authenticated
                ? getRoleHome(
                    role
                  )
                : "/"
            }
            className="group flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-2xl shadow-lg shadow-emerald-200 transition group-hover:scale-105">
              🥬
            </div>

            <div className="hidden sm:block">
              <div className="text-lg font-black tracking-tight text-slate-900">
                RuralFresh
              </div>

              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                Fresh From Farmers
              </div>
            </div>
          </Link>

          {/* ========================================================= */}
          {/* DESKTOP NAVIGATION                                        */}
          {/* ========================================================= */}

          <nav className="hidden items-center gap-1 lg:flex">

            {navigationLinks.map(
              (item) => (
                <NavLink
                  key={
                    item.path
                  }
                  to={
                    item.path
                  }
                  className={navLinkClass(
                    item.path
                  )}
                >
                  {item.label}
                </NavLink>
              )
            )}

            {authenticated && (
              <NavLink
                to="/notifications"
                className={navLinkClass(
                  "/notifications"
                )}
              >
                Notifications
              </NavLink>
            )}

          </nav>

          {/* ========================================================= */}
          {/* RIGHT SIDE                                                */}
          {/* ========================================================= */}

          <div className="flex items-center gap-2">

            {/* ======================================================= */}
            {/* NOTIFICATION BELL                                      */}
            {/* ======================================================= */}

            {authenticated && (
              <NotificationBell />
            )}

            {/* ======================================================= */}
            {/* PROFILE                                                 */}
            {/* ======================================================= */}

            {authenticated ? (
              <div
                className="relative hidden sm:block"
                data-profile-menu
              >
                <button
                  type="button"
                  onClick={() =>
                    setProfileOpen(
                      (current) =>
                        !current
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm transition hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">
                    {getUserInitials(
                      user
                    )}
                  </div>

                  <div className="hidden max-w-[130px] text-left md:block">
                    <p className="truncate text-xs font-black text-slate-800">
                      {getUserName(
                        user
                      )}
                    </p>

                    <p className="truncate text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      {getRoleLabel(
                        role
                      )}
                    </p>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    ▼
                  </span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-12 z-[100] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-4">
                      <p className="truncate text-sm font-black text-slate-900">
                        {getUserName(
                          user
                        )}
                      </p>

                      {user?.email && (
                        <p className="mt-1 truncate text-[11px] text-slate-400">
                          {
                            user.email
                          }
                        </p>
                      )}

                      <span className="mt-2 inline-flex rounded-lg bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">
                        {getRoleLabel(
                          role
                        )}
                      </span>
                    </div>

                    <div className="p-2">

                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(
                            false
                          );

                          navigate(
                            "/profile"
                          );
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        <span>
                          👤
                        </span>

                        <span>
                          Profile
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(
                            false
                          );

                          navigate(
                            "/notifications"
                          );
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        <span>
                          🔔
                        </span>

                        <span>
                          Notifications
                        </span>
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={
                          handleLogout
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-black text-red-600 transition hover:bg-red-50"
                      >
                        <span>
                          ↪
                        </span>

                        <span>
                          Logout
                        </span>
                      </button>

                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">

                <Link
                  to="/login"
                  className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Register
                </Link>

              </div>
            )}

            {/* ======================================================= */}
            {/* MOBILE MENU BUTTON                                     */}
            {/* ======================================================= */}

            <button
              type="button"
              onClick={() =>
                setMobileOpen(
                  (current) =>
                    !current
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-700 shadow-sm lg:hidden"
              aria-label="Toggle navigation"
              aria-expanded={
                mobileOpen
              }
            >
              {mobileOpen
                ? "✕"
                : "☰"}
            </button>

          </div>
        </div>

        {/* =========================================================== */}
        {/* MOBILE NAVIGATION                                          */}
        {/* =========================================================== */}

        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white lg:hidden">

            <div className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6">

              {/* USER */}

              {authenticated && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-sm font-black text-emerald-700">
                    {getUserInitials(
                      user
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900">
                      {getUserName(
                        user
                      )}
                    </p>

                    <p className="truncate text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                      {getRoleLabel(
                        role
                      )}
                    </p>
                  </div>

                </div>
              )}

              {/* LINKS */}

              <nav className="space-y-1">

                {navigationLinks.map(
                  (item) => (
                    <NavLink
                      key={
                        item.path
                      }
                      to={
                        item.path
                      }
                      onClick={() =>
                        setMobileOpen(
                          false
                        )
                      }
                      className={mobileLinkClass(
                        item.path
                      )}
                    >
                      {item.label}
                    </NavLink>
                  )
                )}

                {authenticated && (
                  <>
                    <NavLink
                      to="/notifications"
                      onClick={() =>
                        setMobileOpen(
                          false
                        )
                      }
                      className={mobileLinkClass(
                        "/notifications"
                      )}
                    >
                      🔔 Notifications
                    </NavLink>

                    <NavLink
                      to="/profile"
                      onClick={() =>
                        setMobileOpen(
                          false
                        )
                      }
                      className={mobileLinkClass(
                        "/profile"
                      )}
                    >
                      👤 Profile
                    </NavLink>
                  </>
                )}

              </nav>

              {/* MOBILE AUTH */}

              {!authenticated ? (
                <div className="mt-4 grid grid-cols-2 gap-2">

                  <Link
                    to="/login"
                    onClick={() =>
                      setMobileOpen(
                        false
                      )
                    }
                    className="rounded-xl border border-slate-200 px-4 py-3 text-center text-xs font-black text-slate-700"
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
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-xs font-black text-white"
                  >
                    Register
                  </Link>

                </div>
              ) : (
                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-600"
                >
                  Logout
                </button>
              )}

            </div>
          </div>
        )}

      </header>
    </>
  );
}

export default Navbar;