import {
  useLocation,
  useNavigate
} from "react-router-dom";

/*
|--------------------------------------------------------------------------
| SELLER HEADER
|--------------------------------------------------------------------------
*/

export default function SellerHeader({
  title =
    "Seller Dashboard",

  subtitle =
    "Manage your marketplace.",

  onRefresh,

  loading = false
}) {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  /*
  |--------------------------------------------------------------------------
  | USER
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | DATE
  |--------------------------------------------------------------------------
  */

  const formattedDate =
    new Date().toLocaleDateString(
      "en-IN",
      {
        weekday:
          "long",

        day:
          "numeric",

        month:
          "long",

        year:
          "numeric"
      }
    );

  /*
  |--------------------------------------------------------------------------
  | INITIALS
  |--------------------------------------------------------------------------
  */

  const initials =
    String(
      user?.name ||
        "Seller"
    )
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(
        (part) =>
          part.charAt(0).toUpperCase()
      )
      .join("");

  /*
  |--------------------------------------------------------------------------
  | BACK BUTTON
  |--------------------------------------------------------------------------
  */

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <header className="relative mb-8 overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.07)] backdrop-blur-2xl">

      {/* ================================================================ */}
      {/* DECORATIVE BACKGROUND                                            */}
      {/* ================================================================ */}

      <div className="pointer-events-none absolute inset-0">

        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />

        <div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-cyan-100/40 blur-3xl" />

      </div>

      {/* ================================================================ */}
      {/* TOP BAR                                                          */}
      {/* ================================================================ */}

      <div className="relative flex flex-col gap-5 px-6 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">

        {/* LEFT */}

        <div className="min-w-0">

          <div className="mb-3 flex flex-wrap items-center gap-2">

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
              Seller Center
            </span>

            <span className="text-xs text-slate-400">
              {formattedDate}
            </span>

          </div>

          <h1 className="truncate text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-[15px]">
            {subtitle}
          </p>

        </div>

        {/* RIGHT */}

        <div className="flex flex-wrap items-center gap-3">

          {/* LIVE */}

          <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 sm:flex">

            <span className="relative flex h-2.5 w-2.5">

              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />

              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />

            </span>

            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Live
            </span>

          </div>

          {/* REFRESH */}

          <button
            type="button"
            onClick={
              onRefresh
            }
            disabled={
              loading
            }
            className="group inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >

            <span
              className={`text-base ${
                loading
                  ? "animate-spin"
                  : "transition group-hover:rotate-180"
              }`}
            >
              ↻
            </span>

            {loading
              ? "Updating"
              : "Refresh"}

          </button>

          {/* BACK */}

          {location.pathname !==
            "/seller/dashboard" && (
            <button
              type="button"
              onClick={
                handleBack
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              ← Back
            </button>
          )}

          {/* PROFILE */}

          <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white/75 px-3 py-2.5 sm:flex">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-300 to-green-500 text-xs font-black text-green-950">
              {initials ||
                "S"}
            </div>

            <div className="max-w-28">

              <p className="truncate text-xs font-black text-slate-800">
                {user?.name ||
                  "Seller"}
              </p>

              <p className="truncate text-[10px] text-slate-400">
                Seller
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* ================================================================ */}
      {/* STATUS STRIP                                                     */}
      {/* ================================================================ */}

      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5 sm:px-8">

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">

          <span className="text-emerald-600">
            ✓
          </span>

          Inventory synced

        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">

          <span className="text-emerald-600">
            ✓
          </span>

          Order status synced

        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">

          <span className="text-emerald-600">
            ✓
          </span>

          Sales updated automatically

        </div>

      </div>

    </header>
  );
}