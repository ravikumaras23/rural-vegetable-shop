const AdminHeader = ({
  title,
  subtitle,
  onRefresh,
  refreshing = false
}) => {
  const storedUser =
    localStorage.getItem("user");

  let user = null;

  try {
    user = storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch {
    user = null;
  }

  return (
    <header className="relative z-20 mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-2xl">

      {/* Ambient header lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-emerald-400/[0.08] blur-[80px]" />

        <div className="absolute -right-20 top-0 h-48 w-48 rounded-full bg-cyan-400/[0.06] blur-[80px]" />

        <div className="absolute bottom-0 left-1/3 h-28 w-72 rounded-full bg-violet-400/[0.04] blur-[70px]" />

        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent" />
      </div>

      <div className="relative flex flex-col gap-6 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-6">

        {/* ============================================================ */}
        {/* TITLE AREA                                                    */}
        {/* ============================================================ */}

        <div className="min-w-0">

          <div className="mb-3 flex items-center gap-2">

            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-300/10 bg-emerald-400/[0.08] text-xs text-emerald-300">
              ◈
            </span>

            <span className="text-[8px] font-black uppercase tracking-[0.24em] text-emerald-300/45">
              Admin Control Layer
            </span>

            <span className="h-1 w-1 rounded-full bg-emerald-300/40" />

            <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/20">
              LIVE
            </span>

          </div>

          <h1 className="truncate text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl lg:text-[34px]">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-2 max-w-3xl text-xs leading-6 text-white/30 sm:text-sm">
              {subtitle}
            </p>
          )}

        </div>

        {/* ============================================================ */}
        {/* ACTION AREA                                                   */}
        {/* ============================================================ */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

          {/* REFRESH */}

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3 text-xs font-black text-white/65 shadow-lg transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-cyan-300/[0.05] hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          >

            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent opacity-0 transition group-hover:opacity-100" />

            <span
              className={`flex h-7 w-7 items-center justify-center rounded-xl bg-white/[0.05] text-sm text-cyan-300 transition ${
                refreshing
                  ? "animate-spin"
                  : "group-hover:rotate-180"
              }`}
            >
              ↻
            </span>

            <span>
              {refreshing
                ? "Syncing..."
                : "Refresh"}
            </span>

          </button>

          {/* ADMIN IDENTITY */}

          <div className="group relative overflow-hidden rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.045] px-4 py-3 shadow-[0_10px_35px_rgba(16,185,129,0.06)]">

            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/[0.04] via-transparent to-cyan-400/[0.03]" />

            <div className="relative flex items-center gap-3">

              {/* Avatar */}

              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/15 bg-[#07120f] text-sm font-black text-emerald-300 shadow-inner">

                {user?.name
                  ? user.name
                      .trim()
                      .charAt(0)
                      .toUpperCase()
                  : "A"}

                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#07120f] bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,1)]" />

              </div>

              {/* User details */}

              <div className="min-w-0">

                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-300/40">
                  Administrator
                </p>

                <p className="mt-1 max-w-40 truncate text-sm font-black text-white">
                  {user?.name ||
                    "Admin"}
                </p>

              </div>

              {/* Status */}

              <div className="ml-2 hidden h-8 w-8 items-center justify-center rounded-xl bg-white/[0.035] text-xs text-white/20 sm:flex">
                ✓
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ============================================================ */}
      {/* SIGNAL BAR                                                    */}
      {/* ============================================================ */}

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/6 bg-black/[0.12] px-5 py-2.5 sm:px-7 lg:px-8">

        <div className="flex items-center gap-2">

          <span className="relative flex h-2 w-2">

            <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400/50" />

            <span className="relative h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />

          </span>

          <span className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-300/50">
            System online
          </span>

        </div>

        <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-[0.15em] text-white/15">

          <span>
            COMMAND INTERFACE
          </span>

          <span>
            •
          </span>

          <span>
            LIVE DATA
          </span>

          <span>
            •
          </span>

          <span>
            AUTO SYNC
          </span>

        </div>

      </div>

    </header>
  );
};

export default AdminHeader;