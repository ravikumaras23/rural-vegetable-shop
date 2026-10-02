import React from "react";

/*
|--------------------------------------------------------------------------
| STATUS CONFIGURATION
|--------------------------------------------------------------------------
*/

const statusConfig = {
  pending: {
    label: "Pending",
    dot: "bg-amber-500",
    text: "text-amber-700",
    background:
      "border-amber-200 bg-amber-50"
  },

  approved: {
    label: "Approved",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    background:
      "border-emerald-200 bg-emerald-50"
  },

  rejected: {
    label: "Rejected",
    dot: "bg-red-500",
    text: "text-red-700",
    background:
      "border-red-200 bg-red-50"
  },

  out_of_stock: {
    label: "Out of Stock",
    dot: "bg-orange-500",
    text: "text-orange-700",
    background:
      "border-orange-200 bg-orange-50"
  },

  inactive: {
    label: "Inactive",
    dot: "bg-slate-400",
    text: "text-slate-600",
    background:
      "border-slate-200 bg-slate-50"
  },

  confirmed: {
    label: "Confirmed",
    dot: "bg-blue-500",
    text: "text-blue-700",
    background:
      "border-blue-200 bg-blue-50"
  },

  processing: {
    label: "Processing",
    dot: "bg-indigo-500",
    text: "text-indigo-700",
    background:
      "border-indigo-200 bg-indigo-50"
  },

  packed: {
    label: "Packed",
    dot: "bg-violet-500",
    text: "text-violet-700",
    background:
      "border-violet-200 bg-violet-50"
  },

  out_for_delivery: {
    label: "Out for Delivery",
    dot: "bg-cyan-500",
    text: "text-cyan-700",
    background:
      "border-cyan-200 bg-cyan-50"
  },

  delivered: {
    label: "Delivered",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    background:
      "border-emerald-200 bg-emerald-50"
  },

  cancelled: {
    label: "Cancelled",
    dot: "bg-red-500",
    text: "text-red-700",
    background:
      "border-red-200 bg-red-50"
  },

  failed: {
    label: "Failed",
    dot: "bg-red-500",
    text: "text-red-700",
    background:
      "border-red-200 bg-red-50"
  }
};

/*
|--------------------------------------------------------------------------
| STATUS BADGE
|--------------------------------------------------------------------------
*/

export default function SellerStatusBadge({
  status
}) {
  const normalized =
    String(status || "")
      .trim()
      .toLowerCase();

  const config =
    statusConfig[normalized] || {
      label:
        status || "Unknown",

      dot:
        "bg-slate-400",

      text:
        "text-slate-600",

      background:
        "border-slate-200 bg-slate-50"
    };

  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] shadow-sm ${config.background} ${config.text}`}
    >

      {/* ======================================================== */}
      {/* STATUS DOT                                                */}
      {/* ======================================================== */}

      <span className="relative flex h-2 w-2">

        {(normalized ===
          "delivered" ||
          normalized ===
            "processing" ||
          normalized ===
            "out_for_delivery") && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${config.dot}`}
          />
        )}

        <span
          className={`relative h-2 w-2 rounded-full ${config.dot}`}
        />

      </span>

      {/* ======================================================== */}
      {/* LABEL                                                     */}
      {/* ======================================================== */}

      <span>
        {config.label}
      </span>

    </span>
  );
}