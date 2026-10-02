import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminHeader from "../../components/admin/AdminHeader";
import NotificationBell from "../../notifications/shared/NotificationBell";

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

const request = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error(
      "Admin authentication token is missing. Please login again."
    );
  }

  let response;

  try {
    response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : {
              "Content-Type": "application/json"
            }),
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      },
      cache: "no-store"
    });
  } catch {
    throw new Error(
      "Unable to connect to the backend. Please make sure the backend server is running."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message ||
        `Request failed with status ${response.status}`
    );

    error.status = response.status;

    throw error;
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatStatus(value) {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sellerName(seller) {
  return seller?.name || seller?.email || "Unnamed Seller";
}

function sellerFarmName(seller) {
  const profile = seller?.sellerProfile || {};

  return (
    profile.farmName ||
    profile.businessName ||
    "Farm"
  );
}

function getAccountConfig(isActive) {
  if (isActive) {
    return {
      label: "Active",
      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
      dot:
        "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
    };
  }

  return {
    label: "Inactive",
    badge:
      "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-400"
  };
}

function getApprovalConfig(status) {
  switch (normalizeStatus(status)) {
    case "approved":
      return {
        label: "Approved",
        icon: "✓",
        badge:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        iconBg:
          "bg-emerald-100 text-emerald-700",
        dot:
          "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
      };

    case "rejected":
      return {
        label: "Rejected",
        icon: "×",
        badge:
          "border-red-200 bg-red-50 text-red-700",
        iconBg:
          "bg-red-100 text-red-700",
        dot:
          "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
      };

    case "pending":
    default:
      return {
        label: "Pending",
        icon: "◌",
        badge:
          "border-amber-200 bg-amber-50 text-amber-700",
        iconBg:
          "bg-amber-100 text-amber-700",
        dot:
          "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
      };
  }
}

/*
|--------------------------------------------------------------------------
| ADMIN SELLERS
|--------------------------------------------------------------------------
*/

export default function AdminSellers() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  /*
  |--------------------------------------------------------------------------
  | REJECTION MODAL
  |--------------------------------------------------------------------------
  */

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD SELLERS
  |--------------------------------------------------------------------------
  */

  const loadSellers = useCallback(
    async (background = false) => {
      try {
        if (background) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await request(
          "/api/admin/sellers"
        );

        const data =
          response.data ||
          response.sellers ||
          [];

        const nextSellers = Array.isArray(data)
          ? data
          : [];

        setSellers(nextSellers);
      } catch (err) {
        console.error(
          "Seller loading error:",
          err
        );

        setError(
          err.message ||
            "Unable to load sellers."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadSellers();
  }, [loadSellers]);

  /*
  |--------------------------------------------------------------------------
  | AUTO REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const interval = setInterval(() => {
      loadSellers(true);
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [loadSellers]);

  /*
  |--------------------------------------------------------------------------
  | FILTER SELLERS
  |--------------------------------------------------------------------------
  */

  const filteredSellers = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return sellers.filter((seller) => {
      const profile =
        seller.sellerProfile || {};

      const searchable = [
        seller.name,
        seller.email,
        seller.phone,
        profile.farmName,
        profile.businessName,
        profile.village,
        profile.district,
        profile.state
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const approval = normalizeStatus(
        profile.approvalStatus ||
          "pending"
      );

      const isActive =
        seller.isActive !== false;

      const matchesSearch =
        !query ||
        searchable.includes(query);

      const matchesApproval =
        !approvalFilter ||
        approval === approvalFilter;

      const matchesAccount =
        !accountFilter ||
        (accountFilter === "active"
          ? isActive
          : !isActive);

      return (
        matchesSearch &&
        matchesApproval &&
        matchesAccount
      );
    });
  }, [
    sellers,
    search,
    approvalFilter,
    accountFilter
  ]);

  /*
  |--------------------------------------------------------------------------
  | SELLER STATS
  |--------------------------------------------------------------------------
  */

  const stats = useMemo(() => {
    const total = sellers.length;

    const pending = sellers.filter(
      (seller) =>
        normalizeStatus(
          seller?.sellerProfile
            ?.approvalStatus
        ) === "pending"
    ).length;

    const approved = sellers.filter(
      (seller) =>
        normalizeStatus(
          seller?.sellerProfile
            ?.approvalStatus
        ) === "approved"
    ).length;

    const rejected = sellers.filter(
      (seller) =>
        normalizeStatus(
          seller?.sellerProfile
            ?.approvalStatus
        ) === "rejected"
    ).length;

    const active = sellers.filter(
      (seller) =>
        seller.isActive !== false
    ).length;

    const inactive =
      total - active;

    return {
      total,
      pending,
      approved,
      rejected,
      active,
      inactive
    };
  }, [sellers]);

  /*
  |--------------------------------------------------------------------------
  | UPDATE SELLER
  |--------------------------------------------------------------------------
  */

  const executeSellerAction = async (
    sellerId,
    action,
    rejectionReason = ""
  ) => {
    let endpoint = "";
    let body = {};

    if (action === "approve") {
      endpoint =
        `/api/admin/sellers/${sellerId}/approve`;
    }

    if (action === "reject") {
      endpoint =
        `/api/admin/sellers/${sellerId}/reject`;

      body = {
        rejectionReason:
          rejectionReason.trim()
      };
    }

    if (action === "activate") {
      endpoint =
        `/api/admin/sellers/${sellerId}/status`;

      body = {
        isActive: true
      };
    }

    if (action === "deactivate") {
      endpoint =
        `/api/admin/sellers/${sellerId}/status`;

      body = {
        isActive: false
      };
    }

    if (!endpoint) {
      setError(
        "Invalid seller action."
      );
      return;
    }

    try {
      setActionLoading(
        `${sellerId}-${action}`
      );

      setError("");

      await request(endpoint, {
        method: "PATCH",
        body: JSON.stringify(body)
      });

      /*
       * Notifications are intentionally NOT created here.
       *
       * The backend controller is responsible for:
       *
       * approve:
       *   SELLER_APPROVED
       *
       * reject:
       *   SELLER_REJECTED
       *
       * activate:
       *   seller account status notification
       *
       * deactivate:
       *   seller account status notification
       *
       * The backend notification service persists
       * the notification in MongoDB and emits it
       * through Socket.IO.
       */

      setRejectModal(null);
      setRejectReason("");

      await loadSellers(false);
    } catch (err) {
      console.error(
        "Seller update error:",
        err
      );

      setError(
        err.message ||
          "Unable to update seller."
      );
    } finally {
      setActionLoading("");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UPDATE SELLER ACTION
  |--------------------------------------------------------------------------
  */

  const updateSeller = (
    sellerId,
    action
  ) => {
    if (action === "reject") {
      const currentSeller =
        sellers.find(
          (seller) =>
            String(seller?._id) ===
            String(sellerId)
        );

      setRejectReason("");

      setRejectModal({
        sellerId,
        sellerName: currentSeller
          ? sellerName(currentSeller)
          : "Seller",
        farmName: currentSeller
          ? sellerFarmName(currentSeller)
          : "Farm"
      });

      return;
    }

    /*
     * No browser confirm().
     *
     * The action executes directly.
     */

    executeSellerAction(
      sellerId,
      action
    );
  };

  /*
  |--------------------------------------------------------------------------
  | SUBMIT REJECTION
  |--------------------------------------------------------------------------
  */

  const submitReject = () => {
    if (!rejectModal) {
      return;
    }

    const reason =
      rejectReason.trim();

    if (!reason) {
      setError(
        "Please enter a rejection reason."
      );
      return;
    }

    executeSellerAction(
      rejectModal.sellerId,
      "reject",
      reason
    );
  };

  /*
  |--------------------------------------------------------------------------
  | RESET FILTERS
  |--------------------------------------------------------------------------
  */

  const resetFilters = () => {
    setSearch("");
    setApprovalFilter("");
    setAccountFilter("");
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-[#f3f7f5] text-slate-900">

      {/* CUSTOM REJECTION MODAL */}

      {rejectModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-seller-title"
            className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.28)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-red-600">
                  Seller action
                </p>

                <h2
                  id="reject-seller-title"
                  className="mt-1 text-xl font-black text-slate-950"
                >
                  Reject seller
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {rejectModal.sellerName}
                  {" · "}
                  {rejectModal.farmName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                  setError("");
                }}
                aria-label="Close rejection dialog"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 text-lg text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5">
              <label
                htmlFor="seller-rejection-reason"
                className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"
              >
                Rejection reason
              </label>

              <textarea
                id="seller-rejection-reason"
                value={rejectReason}
                onChange={(event) => {
                  setRejectReason(
                    event.target.value
                  );

                  if (
                    error ===
                    "Please enter a rejection reason."
                  ) {
                    setError("");
                  }
                }}
                autoFocus
                rows={4}
                maxLength={500}
                placeholder="Enter the reason for rejecting this seller..."
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
              />

              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10px] text-slate-400">
                  This reason will be sent to the backend.
                </p>

                <span className="text-[10px] font-bold text-slate-400">
                  {rejectReason.length}/500
                </span>
              </div>

              {error ===
                "Please enter a rejection reason." && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                  Please enter a rejection reason.
                </p>
              )}

              <button
                type="button"
                disabled={
                  actionLoading !== "" ||
                  !rejectReason.trim()
                }
                onClick={submitReject}
                className="mt-5 w-full rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-red-600/15 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ===
                `${rejectModal.sellerId}-reject`
                  ? "Rejecting seller..."
                  : "Reject Seller"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AMBIENT BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="absolute right-0 top-1/4 h-[28rem] w-[28rem] bg-cyan-300/8 blur-3xl" />

        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-lime-300/8 blur-3xl" />
      </div>

      {/* SIDEBAR */}

      <AdminSidebar />

      <main className="relative lg:ml-72">
        <div className="mx-auto max-w-[1750px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

          {/* HEADER */}

          <div className="relative">
            <AdminHeader
              title="Seller Command Center"
              subtitle="Approve, monitor and manage every marketplace seller."
              onRefresh={() =>
                loadSellers(true)
              }
              refreshing={refreshing}
            />

            {/* CENTRALIZED NOTIFICATION BELL */}

            <div className="absolute right-0 top-0 z-40">
              <NotificationBell />
            </div>
          </div>

          {/* LIVE STATUS */}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />

              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                Seller monitoring active
              </span>
            </div>

            <p className="text-[10px] font-bold text-emerald-700/70">
              Seller data sync every 15 seconds
            </p>
          </div>

          {/* HERO */}

          <section className="relative mt-6 overflow-hidden rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:p-8 lg:p-9">
            <div className="absolute inset-y-0 right-0 w-2/5 bg-gradient-to-l from-emerald-100/50 via-emerald-50/20 to-transparent" />

            <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />

                  Seller Network
                </div>

                <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl lg:text-5xl">
                  Manage the people
                  <br className="hidden sm:block" />

                  <span className="text-emerald-600">
                    behind every harvest.
                  </span>
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
                  Review seller applications, keep accounts healthy and make sure only approved farms reach your customers.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[520px]">
                <MiniSummary
                  label="Total"
                  value={stats.total}
                  tone="slate"
                />

                <MiniSummary
                  label="Pending"
                  value={stats.pending}
                  tone="amber"
                />

                <MiniSummary
                  label="Approved"
                  value={stats.approved}
                  tone="green"
                />

                <MiniSummary
                  label="Active"
                  value={stats.active}
                  tone="cyan"
                />
              </div>
            </div>
          </section>

          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-red-800">
                    Seller action failed
                  </p>

                  <p className="mt-1 text-xs text-red-600">
                    {error}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setError("")
                  }
                  className="w-fit rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-700 hover:bg-red-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* SEARCH / FILTER */}

          <section className="mt-6 rounded-[28px] border border-white bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Seller explorer
                </p>

                <p className="mt-1 text-sm font-bold text-slate-700">
                  Find a farm, seller or account instantly.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative md:min-w-[310px]">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    ⌕
                  </span>

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search seller, farm, email..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                  />
                </div>

                <select
                  value={approvalFilter}
                  onChange={(event) =>
                    setApprovalFilter(
                      event.target.value
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:bg-white"
                >
                  <option value="">
                    All approvals
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="approved">
                    Approved
                  </option>

                  <option value="rejected">
                    Rejected
                  </option>
                </select>

                <select
                  value={accountFilter}
                  onChange={(event) =>
                    setAccountFilter(
                      event.target.value
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:bg-white"
                >
                  <option value="">
                    All accounts
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-black text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          {/* RESULT COUNT */}

          <section className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                Current view
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                {filteredSellers.length} Seller
                {filteredSellers.length === 1
                  ? ""
                  : "s"}
              </h2>
            </div>

            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
              Showing{" "}
              <span className="text-slate-900">
                {filteredSellers.length}
              </span>{" "}
              of{" "}
              <span className="text-slate-900">
                {sellers.length}
              </span>
            </div>
          </section>

          {/* LOADING */}

          {loading && (
            <div className="mt-5 rounded-[30px] border border-slate-200 bg-white p-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600">
                ◌
              </div>

              <p className="mt-5 text-sm font-black text-slate-800">
                Loading seller network...
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Synchronizing account states.
              </p>
            </div>
          )}

          {/* EMPTY */}

          {!loading &&
            filteredSellers.length === 0 && (
              <div className="mt-5 rounded-[30px] border border-dashed border-slate-300 bg-white p-16 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                  👨‍🌾
                </div>

                <h2 className="mt-5 text-xl font-black text-slate-900">
                  No sellers found
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Try changing your search or filters.
                </p>
              </div>
            )}

          {/* SELLER GRID */}

          {!loading &&
            filteredSellers.length > 0 && (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredSellers.map(
                  (seller) => {
                    const profile =
                      seller.sellerProfile ||
                      {};

                    const approval =
                      normalizeStatus(
                        profile.approvalStatus ||
                          "pending"
                      );

                    const isActive =
                      seller.isActive !== false;

                    const approvalConfig =
                      getApprovalConfig(
                        approval
                      );

                    const accountConfig =
                      getAccountConfig(
                        isActive
                      );

                    const location = [
                      profile.village,
                      profile.district,
                      profile.state
                    ]
                      .filter(Boolean)
                      .join(", ");

                    const approveLoading =
                      actionLoading ===
                      `${seller._id}-approve`;

                    const rejectLoading =
                      actionLoading ===
                      `${seller._id}-reject`;

                    const activateLoading =
                      actionLoading ===
                      `${seller._id}-activate`;

                    const deactivateLoading =
                      actionLoading ===
                      `${seller._id}-deactivate`;

                    const initials = String(
                      seller.name ||
                        "Seller"
                    )
                      .split(" ")
                      .map(
                        (part) =>
                          part[0]
                      )
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <article
                        key={seller._id}
                        className="group relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_25px_70px_rgba(16,185,129,0.11)]"
                      >
                        <div
                          className={`h-1.5 ${
                            approval ===
                            "approved"
                              ? "bg-emerald-500"
                              : approval ===
                                "rejected"
                              ? "bg-red-500"
                              : "bg-amber-400"
                          }`}
                        />

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg">
                                {initials}
                              </div>

                              <div className="min-w-0">
                                <h3 className="truncate text-base font-black text-slate-950">
                                  {seller.name ||
                                    "Unnamed Seller"}
                                </h3>

                                <p className="mt-1 truncate text-xs text-slate-400">
                                  {seller.email ||
                                    "No email"}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${approvalConfig.iconBg} text-sm font-black`}
                            >
                              {
                                approvalConfig.icon
                              }
                            </span>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide ${approvalConfig.badge}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${approvalConfig.dot}`}
                              />

                              {
                                approvalConfig.label
                              }
                            </span>

                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide ${accountConfig.badge}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${accountConfig.dot}`}
                              />

                              {
                                accountConfig.label
                              }
                            </span>
                          </div>

                          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg">
                                🌱
                              </div>

                              <div className="min-w-0">
                                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                                  Farm
                                </p>

                                <p className="mt-1 truncate text-sm font-black text-slate-900">
                                  {profile.farmName ||
                                    profile.businessName ||
                                    "Farm name not provided"}
                                </p>

                                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-400">
                                  {location ||
                                    "Location not provided"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <InfoTile
                              label="Phone"
                              value={
                                seller.phone ||
                                "—"
                              }
                            />

                            <InfoTile
                              label="Seller ID"
                              value={String(
                                seller._id
                              ).slice(-8)}
                              mono
                            />
                          </div>

                          <div className="mt-5 border-t border-slate-100 pt-5">

                            {/* PENDING */}

                            {approval ===
                              "pending" && (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    actionLoading !==
                                    ""
                                  }
                                  onClick={() =>
                                    updateSeller(
                                      seller._id,
                                      "approve"
                                    )
                                  }
                                  className="rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {approveLoading
                                    ? "Approving..."
                                    : "Approve"}
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    actionLoading !==
                                    ""
                                  }
                                  onClick={() =>
                                    updateSeller(
                                      seller._id,
                                      "reject"
                                    )
                                  }
                                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {rejectLoading
                                    ? "Rejecting..."
                                    : "Reject"}
                                </button>
                              </div>
                            )}

                            {/* REJECTED */}

                            {approval ===
                              "rejected" && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading !==
                                  ""
                                }
                                onClick={() =>
                                  updateSeller(
                                    seller._id,
                                    "approve"
                                  )
                                }
                                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {approveLoading
                                  ? "Approving..."
                                  : "Approve Seller"}
                              </button>
                            )}

                            {/* ACTIVE APPROVED SELLER */}

                            {approval ===
                              "approved" &&
                              isActive && (
                                <button
                                  type="button"
                                  disabled={
                                    actionLoading !==
                                    ""
                                  }
                                  onClick={() =>
                                    updateSeller(
                                      seller._id,
                                      "deactivate"
                                    )
                                  }
                                  className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deactivateLoading
                                    ? "Deactivating..."
                                    : "Deactivate Seller"}
                                </button>
                              )}

                            {/* INACTIVE SELLER */}

                            {!isActive && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading !==
                                  ""
                                }
                                onClick={() =>
                                  updateSeller(
                                    seller._id,
                                    "activate"
                                  )
                                }
                                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {activateLoading
                                  ? "Activating..."
                                  : "Activate Seller"}
                              </button>
                            )}
                          </div>

                          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                Account
                              </p>

                              <p className="mt-1 text-[10px] font-bold text-slate-600">
                                {isActive
                                  ? "Operational"
                                  : "Disabled"}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                Approval
                              </p>

                              <p className="mt-1 text-[10px] font-bold text-slate-600">
                                {formatStatus(
                                  approval
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
        </div>
      </main>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| MINI SUMMARY
|--------------------------------------------------------------------------
*/

function MiniSummary({
  label,
  value,
  tone = "slate"
}) {
  const tones = {
    slate:
      "border-slate-200 bg-white text-slate-900",

    amber:
      "border-amber-200 bg-amber-50 text-amber-900",

    green:
      "border-emerald-200 bg-emerald-50 text-emerald-900",

    cyan:
      "border-cyan-200 bg-cyan-50 text-cyan-900"
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        tones[tone] ||
        tones.slate
      }`}
    >
      <p className="text-[8px] font-black uppercase tracking-[0.15em] opacity-45">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INFO TILE
|--------------------------------------------------------------------------
*/

function InfoTile({
  label,
  value,
  mono = false
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.13em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-xs font-bold text-slate-700 ${
          mono
            ? "font-mono"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}