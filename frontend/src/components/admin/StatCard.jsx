const StatCard = ({
  title,
  value,
  icon,
  description,
  loading = false,
  accent = "emerald"
}) => {
  const accentStyles = {
    emerald: {
      glow: "group-hover:bg-emerald-400/[0.06]",
      icon: "border-emerald-300/10 bg-emerald-400/[0.07] text-emerald-300",
      value: "text-white group-hover:text-emerald-200",
      line: "from-emerald-400 via-teal-300 to-transparent"
    },

    cyan: {
      glow: "group-hover:bg-cyan-400/[0.06]",
      icon: "border-cyan-300/10 bg-cyan-400/[0.07] text-cyan-300",
      value: "text-white group-hover:text-cyan-200",
      line: "from-cyan-400 via-sky-300 to-transparent"
    },

    violet: {
      glow: "group-hover:bg-violet-400/[0.06]",
      icon: "border-violet-300/10 bg-violet-400/[0.07] text-violet-300",
      value: "text-white group-hover:text-violet-200",
      line: "from-violet-400 via-fuchsia-300 to-transparent"
    },

    amber: {
      glow: "group-hover:bg-amber-400/[0.06]",
      icon: "border-amber-300/10 bg-amber-400/[0.07] text-amber-300",
      value: "text-white group-hover:text-amber-200",
      line: "from-amber-400 via-orange-300 to-transparent"
    },

    red: {
      glow: "group-hover:bg-red-400/[0.06]",
      icon: "border-red-300/10 bg-red-400/[0.07] text-red-300",
      value: "text-white group-hover:text-red-200",
      line: "from-red-400 via-rose-300 to-transparent"
    }
  };

  const selected =
    accentStyles[accent] ||
    accentStyles.emerald;

  return (
    <div
      className={`group relative overflow-hidden rounded-[26px] border border-white/8 bg-white/[0.035] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/12 hover:bg-white/[0.05] ${selected.glow}`}
    >
      {/* ================================================================ */}
      {/* AMBIENT GLOW                                                     */}
      {/* ================================================================ */}

      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-current opacity-[0.04] blur-3xl transition duration-500 group-hover:opacity-[0.09]" />

      {/* ================================================================ */}
      {/* TOP LIGHT LINE                                                   */}
      {/* ================================================================ */}

      <div
        className={`absolute left-0 top-0 h-px w-0 bg-gradient-to-r ${selected.line} transition-all duration-500 group-hover:w-full`}
      />

      {/* ================================================================ */}
      {/* CONTENT                                                          */}
      {/* ================================================================ */}

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          {/* TEXT */}

          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/25">
              {title}
            </p>

            {loading ? (
              <div className="mt-4">
                <div className="h-9 w-28 animate-pulse rounded-xl bg-white/[0.08]" />

                <div className="mt-3 h-2.5 w-32 animate-pulse rounded-full bg-white/[0.05]" />
              </div>
            ) : (
              <>
                <p
                  className={`mt-3 break-words text-3xl font-black tracking-[-0.04em] transition-colors duration-300 ${selected.value}`}
                >
                  {value}
                </p>

                {description && (
                  <p className="mt-2 max-w-[220px] text-[10px] leading-5 text-white/25">
                    {description}
                  </p>
                )}
              </>
            )}
          </div>

          {/* ICON */}

          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border text-xl shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-300 group-hover:scale-105 ${selected.icon}`}
          >
            {loading ? (
              <span className="h-5 w-5 animate-pulse rounded-lg bg-white/10" />
            ) : (
              icon
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* MICRO STATUS                                                   */}
        {/* ============================================================ */}

        {!loading && (
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full bg-current opacity-60 shadow-[0_0_10px_currentColor]`}
              />

              <span className="text-[8px] font-black uppercase tracking-[0.16em] text-white/15">
                Live metric
              </span>
            </div>

            <span className="text-[8px] font-black text-white/10 transition group-hover:text-white/25">
              01
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;