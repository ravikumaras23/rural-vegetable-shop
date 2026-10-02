import React from "react";

export default function SellerStatCard({
  title,
  value,
  icon,
  description,
  loading = false
}) {
  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.045)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_18px_50px_rgba(16,185,129,0.10)]">

      {/* ========================================================== */}
      {/* BACKGROUND GLOW                                            */}
      {/* ========================================================== */}

      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-100/50 blur-3xl transition duration-500 group-hover:bg-emerald-200/60" />

      {/* ========================================================== */}
      {/* TOP ROW                                                    */}
      {/* ========================================================== */}

      <div className="relative flex items-start justify-between gap-4">

        {/* ======================================================== */}
        {/* CONTENT                                                   */}
        {/* ======================================================== */}

        <div className="min-w-0 flex-1">

          <div className="flex items-center gap-2">

            <p className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              {title}
            </p>

          </div>

          {/* ====================================================== */}
          {/* VALUE                                                   */}
          {/* ====================================================== */}

          <div className="mt-3 min-h-[42px]">

            {loading ? (

              <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-100" />

            ) : (

              <div className="truncate text-[30px] font-black tracking-tight text-slate-950">
                {value}
              </div>

            )}

          </div>

          {/* ====================================================== */}
          {/* DESCRIPTION                                             */}
          {/* ====================================================== */}

          {description && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
              {description}
            </p>
          )}

        </div>

        {/* ======================================================== */}
        {/* ICON                                                      */}
        {/* ======================================================== */}

        <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 text-xl text-emerald-700 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-emerald-200 group-hover:from-emerald-100 group-hover:to-green-100">
          {icon}
        </div>

      </div>

      {/* ========================================================== */}
      {/* MICRO INDICATOR                                            */}
      {/* ========================================================== */}

      <div className="relative mt-5 flex items-center gap-2">

        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />

        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Live data
        </span>

      </div>

      {/* ========================================================== */}
      {/* BOTTOM ACCENT                                              */}
      {/* ========================================================== */}

      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-green-400 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

    </div>
  );
}