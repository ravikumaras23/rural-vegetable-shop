import { NavLink, useNavigate } from "react-router-dom";
/*
|--------------------------------------------------------------------------
| ADMIN SIDEBAR — 2030s UI
|--------------------------------------------------------------------------
*/

const AdminSidebar = () => {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true
    });
  };

  const linkClass = ({ isActive }) =>
    `group relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-300 ${
      isActive
        ? "border border-emerald-300/15 bg-emerald-400/[0.09] text-emerald-200 shadow-[0_10px_35px_rgba(16,185,129,0.08)]"
        : "border border-transparent text-white/45 hover:border-white/8 hover:bg-white/[0.035] hover:text-white"
    }`;

  const navItems = [
    {
      to: "/admin/dashboard",
      icon: "◈",
      label: "Dashboard"
    },
    {
      to: "/admin/sellers",
      icon: "♙",
      label: "Sellers"
    },
    {
      to: "/admin/products",
      icon: "◇",
      label: "Products"
    },
    {
      to: "/admin/orders",
      icon: "▣",
      label: "Orders"
    }
  ];

  let user = null;

  try {
    user = JSON.parse(
      localStorage.getItem("user") || "null"
    );
  } catch {
    user = null;
  }

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-72 flex-col overflow-hidden border-r border-white/8 bg-[#030908] text-white shadow-[20px_0_80px_rgba(0,0,0,0.28)] lg:flex">

      {/* ================================================================ */}
      {/* AMBIENT LIGHTING                                                 */}
      {/* ================================================================ */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute -left-28 -top-24 h-80 w-80 rounded-full bg-emerald-400/[0.08] blur-[110px]" />

        <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-cyan-400/[0.055] blur-[120px]" />

        <div className="absolute bottom-[-120px] left-10 h-80 w-80 rounded-full bg-violet-400/[0.04] blur-[100px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "36px 36px"
          }}
        />
        

      </div>

      {/* ================================================================ */}
      {/* TOP BRAND                                                        */}
      {/* ================================================================ */}

      <div className="relative border-b border-white/8 px-5 py-5">

        <div className="flex items-center gap-3">

          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.08] text-2xl shadow-[0_0_35px_rgba(16,185,129,0.08)]">
            🥕
          </div>

          <div className="min-w-0">

            <p className="truncate text-base font-black tracking-tight text-white">
              RuralFresh
            </p>

            <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.22em] text-emerald-300/45">
              Admin Control
            </p>

          </div>

        </div>

        {/* System state */}

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/7 bg-white/[0.025] px-3 py-2.5">

          <div className="flex items-center gap-2">

            <span className="relative flex h-2.5 w-2.5">

              <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400/50" />

              <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.95)]" />

            </span>

            <span className="text-[8px] font-black uppercase tracking-[0.16em] text-white/35">
              System online
            </span>

          </div>

          <span className="text-[8px] font-black text-emerald-300/50">
            LIVE
          </span>
          

        </div>

      </div>
          
      {/* ================================================================ */}
      {/* NAVIGATION                                                       */}
      {/* ================================================================ */}

      <nav className="relative flex-1 overflow-y-auto px-4 py-6">

        <p className="mb-3 px-2 text-[8px] font-black uppercase tracking-[0.22em] text-white/20">
          Command Navigation
        </p>

        <div className="space-y-2">

          {navItems.map(
            ({
              to,
              icon,
              label
            }) => (
              <NavLink
                key={to}
                to={to}
                className={linkClass}
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator */}

                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.95)]" />
                    )}

                    {/* Hover glow */}

                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-400/[0.035] via-transparent to-cyan-400/[0.02] opacity-0 transition group-hover:opacity-100" />

                    {/* Icon */}

                    <span
                      className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border text-sm transition-all duration-300 ${
                        isActive
                          ? "border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-300"
                          : "border-white/7 bg-white/[0.025] text-white/30 group-hover:border-white/10 group-hover:bg-white/[0.05] group-hover:text-white/70"
                      }`}
                    >
                      {icon}
                    </span>

                    {/* Label */}

                    <span className="relative flex-1">
                      {label}
                    </span>

                    {/* Arrow */}

                    <span
                      className={`relative text-xs transition-all duration-300 ${
                        isActive
                          ? "translate-x-0 text-emerald-300/70"
                          : "-translate-x-1 text-white/10 group-hover:translate-x-0 group-hover:text-white/35"
                      }`}
                    >
                      →
                    </span>
                  </>
                )}
              </NavLink>
            )
          )}

        </div>

        {/* Divider */}

        <div className="my-7 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

        {/* Network module */}

        <div className="rounded-2xl border border-cyan-300/8 bg-cyan-400/[0.025] p-4">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-300/40">
                Network
              </p>

              <p className="mt-1 text-xs font-bold text-white/60">
                Commerce telemetry
              </p>

            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/[0.06] text-xs text-cyan-300">
              ⚡
            </div>

          </div>
          

          <div className="mt-4 flex items-center justify-between">
          
            <span className="text-[8px] font-black uppercase tracking-wide text-white/20">
              Health
            </span>

            <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wide text-emerald-300/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
              Operational
            </span>

          </div>

        </div>
        
      </nav>
      


      {/* ================================================================ */}
      {/* USER / LOGOUT                                                    */}
      {/* ================================================================ */}

      <div className="relative border-t border-white/8 p-4">

        {/* User identity */}

        <div className="mb-3 rounded-2xl border border-white/7 bg-white/[0.025] p-3">

          <div className="flex items-center gap-3">

            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/10 bg-emerald-400/[0.06] text-sm font-black text-emerald-300">

              {user?.name
                ? user.name
                    .trim()
                    .charAt(0)
                    .toUpperCase()
                : "A"}

              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#030908] bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />

            </div>

            <div className="min-w-0 flex-1">

              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/20">
                Administrator
              </p>

              <p className="mt-1 truncate text-xs font-black text-white">
                {user?.name || "Admin"}
              </p>

            </div>

          </div>

        </div>

        {/* Logout */}

        <button
          type="button"
          onClick={logout}
          className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-red-300/8 bg-red-400/[0.025] px-4 py-3.5 text-sm font-bold text-red-300/70 transition-all duration-300 hover:border-red-300/15 hover:bg-red-400/[0.07] hover:text-red-200"
        >

          <span className="absolute left-0 top-0 h-full w-0.5 bg-red-300/50 opacity-0 transition group-hover:opacity-100" />

          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-300/8 bg-red-400/[0.04] text-sm">
            ↪
          </span>

          <span className="flex-1 text-left">
            Sign Out
          </span>

          <span className="text-xs text-red-300/30 transition group-hover:translate-x-1 group-hover:text-red-300/70">
            →
          </span>

        </button>

        {/* Footer signal */}

        <div className="mt-4 flex items-center justify-between px-1">

          <span className="text-[7px] font-black uppercase tracking-[0.18em] text-white/10">
            RuralFresh OS
          </span>

          <span className="text-[7px] font-black uppercase tracking-[0.18em] text-white/10">
            v2.0
          </span>

        </div>

      </div>

    </aside>
  );
};

export default AdminSidebar;