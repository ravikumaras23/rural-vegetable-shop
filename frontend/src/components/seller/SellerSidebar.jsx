import { NavLink, useNavigate } from "react-router-dom";

const SellerSidebar = () => {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const navItems = [
    {
      to: "/seller/dashboard",
      label: "Dashboard",
      icon: "◈"
    },
    {
      to: "/seller/products",
      label: "Products",
      icon: "◇"
    },
    {
      to: "/seller/products/add",
      label: "Add Product",
      icon: "+"
    },
    {
      to: "/seller/orders",
      label: "Orders",
      icon: "▣"
    },
    {
      to: "/seller/payment-settings",
      label: "Payment Settings",
      icon: "₹"
    },
    {
      to: "/seller/qr-payments",
      label: "QR Payments",
      icon: "▦"
    }
  ];

  const linkClass = ({ isActive }) =>
    [
      "group relative flex items-center gap-3 rounded-2xl px-4 py-3",
      "text-sm font-bold transition-all duration-300",
      isActive
        ? "border border-emerald-300/20 bg-emerald-400/10 text-emerald-300 shadow-[0_0_30px_rgba(52,211,153,0.08)]"
        : "border border-transparent text-white/45 hover:border-white/10 hover:bg-white/[0.035] hover:text-white"
    ].join(" ");

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden border-r border-white/10 bg-[#020706]/95 text-white backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-400/10 blur-[100px]" />
        <div className="absolute -right-28 bottom-20 h-72 w-72 rounded-full bg-cyan-400/8 blur-[100px]" />
      </div>

      <div className="relative border-b border-white/8 px-6 py-6">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300/45">
          RuralFresh
        </p>

        <h1 className="mt-2 text-xl font-black tracking-tight text-white">
          Seller Command
        </h1>

        <p className="mt-1 text-[10px] font-semibold text-white/25">
          Marketplace operations
        </p>
      </div>

      <div className="relative border-b border-white/8 px-6 py-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-lg text-emerald-300">
            👨‍🌾
          </div>

          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/25">
              Account
            </p>

            <p className="mt-1 truncate text-xs font-black text-white">
              Seller Portal
            </p>
          </div>
        </div>
      </div>

      <nav className="relative flex-1 space-y-2 overflow-y-auto px-4 py-5">
        <p className="px-2 pb-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
          Navigation
        </p>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={linkClass}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.035] text-sm text-white/45 transition group-hover:text-emerald-300">
              {item.icon}
            </span>

            <span className="flex-1">{item.label}</span>

            <span className="text-white/15 transition group-hover:translate-x-0.5 group-hover:text-emerald-300">
              →
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="relative border-t border-white/8 p-4">
        <button
          type="button"
          onClick={logout}
          className="group flex w-full items-center gap-3 rounded-2xl border border-red-300/10 bg-red-400/[0.035] px-4 py-3 text-sm font-black text-red-300 transition hover:border-red-300/20 hover:bg-red-400/[0.07]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-400/10">
            ⎋
          </span>

          <span className="flex-1 text-left">
            Logout
          </span>

          <span className="text-red-300/40 group-hover:text-red-300">
            →
          </span>
        </button>
      </div>
    </aside>
  );
};

export default SellerSidebar;