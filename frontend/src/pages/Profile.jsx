import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

function getToken() {
  return localStorage.getItem("token");
}

async function request(endpoint, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed with status ${response.status}`
    );
  }

  return data;
}

function initials(name = "RuralFresh User") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "RF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function roleMeta(role) {
  if (role === "admin") {
    return {
      label: "SYSTEM ADMINISTRATOR",
      icon: "🛡️",
      description: "Marketplace control, approvals and network governance",
      badge: "ADMIN CORE",
      accent: "from-violet-600 via-indigo-600 to-slate-950"
    };
  }

  if (role === "seller") {
    return {
      label: "RURAL PRODUCER",
      icon: "👨‍🌾",
      description: "Farm, catalog, inventory and seller operations",
      badge: "SELLER NODE",
      accent: "from-emerald-600 via-teal-600 to-slate-950"
    };
  }

  return {
    label: "CUSTOMER",
    icon: "🛒",
    description: "Fresh produce discovery, orders and marketplace access",
    badge: "CUSTOMER NODE",
    accent: "from-cyan-600 via-emerald-600 to-slate-950"
  };
}

function formatDate(value, fallback = "Not available") {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(value, fallback = "Not available") {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function Icon({ name, className = "h-5 w-5" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  if (name === "user") {
    return (
      <svg {...common}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 5 6v5c0 4.7 3 8.9 7 10 4-1.1 7-5.3 7-10V6l-7-3z" />
        <path d="m9.5 12 1.7 1.7 3.6-3.6" />
      </svg>
    );
  }

  if (name === "farm") {
    return (
      <svg {...common}>
        <path d="M3 21h18" />
        <path d="M5 21v-8l7-5 7 5v8" />
        <path d="M9 21v-5h6v5" />
        <path d="m8 8 4-5 4 5" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 9h18" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg {...common}>
        <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" />
        <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15z" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg {...common}>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function StatCard({ icon, label, value, hint }) {
  return (
    <div className="group relative overflow-hidden rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_80px_rgba(15,23,42,0.09)]">
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-emerald-100/50 blur-2xl transition group-hover:bg-emerald-200/60" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 truncate text-lg font-black text-slate-950">
            {value}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
            {hint}
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, value, editing, name, onChange }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          {editing && name ? (
            <input
              name={name}
              value={value || ""}
              onChange={onChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
            />
          ) : (
            <p className="mt-1.5 break-words text-sm font-black text-slate-900">
              {value || "Not provided"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SellerField({ label, value, name, editing, onChange }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700/70">
        {label}
      </p>
      {editing ? (
        <input
          name={name}
          value={value || ""}
          onChange={onChange}
          className="mt-2 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
        />
      ) : (
        <p className="mt-1.5 break-words text-sm font-black text-slate-900">
          {value || "Not provided"}
        </p>
      )}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    farmName: "",
    farmDescription: "",
    village: "",
    district: "",
    state: ""
  });

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!getToken()) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const data = await request("/api/auth/me");
        const latestUser = data.user || data.data?.user || null;

        if (!latestUser) {
          throw new Error("Unable to load your profile.");
        }

        if (!mounted) return;

        setUser(latestUser);
        localStorage.setItem("user", JSON.stringify(latestUser));
        setForm({
          name: latestUser.name || "",
          phone: latestUser.phone || "",
          farmName: latestUser.sellerProfile?.farmName || "",
          farmDescription:
            latestUser.sellerProfile?.farmDescription || "",
          village: latestUser.sellerProfile?.village || "",
          district: latestUser.sellerProfile?.district || "",
          state: latestUser.sellerProfile?.state || ""
        });
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Unable to load profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const meta = roleMeta(user?.role);
  const seller = user?.role === "seller";

  const profileCompletion = useMemo(() => {
    if (!user) return 0;

    const fields = seller
      ? [
          user.name,
          user.email,
          user.phone,
          user.sellerProfile?.farmName,
          user.sellerProfile?.farmDescription,
          user.sellerProfile?.village,
          user.sellerProfile?.district,
          user.sellerProfile?.state
        ]
      : [user.name, user.email, user.phone];

    const filled = fields.filter(
      (field) => field !== undefined && field !== null && String(field).trim()
    ).length;

    return Math.round((filled / fields.length) * 100);
  }, [seller, user]);

  const memberSince = formatDate(user?.createdAt);
  const lastLogin = formatDateTime(user?.lastLoginAt);
  const accountActive = user?.isActive !== false;
  const approvalStatus = user?.sellerProfile?.approvalStatus || "not_applicable";

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function beginEditing() {
    setError("");
    setSuccess("");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setForm({
      name: user?.name || "",
      phone: user?.phone || "",
      farmName: user?.sellerProfile?.farmName || "",
      farmDescription: user?.sellerProfile?.farmDescription || "",
      village: user?.sellerProfile?.village || "",
      district: user?.sellerProfile?.district || "",
      state: user?.sellerProfile?.state || ""
    });
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = form.name.trim();
    const phone = form.phone.trim();

    if (!name) {
      setError("Name is required.");
      return;
    }

    if (phone && !/^[6-9][0-9]{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        phone
      };

      if (seller) {
        payload.sellerProfile = {
          farmName: form.farmName.trim(),
          farmDescription: form.farmDescription.trim(),
          village: form.village.trim(),
          district: form.district.trim(),
          state: form.state.trim()
        };
      }

      const data = await request("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      const updatedUser = data.user || data.data?.user;
      if (!updatedUser) {
        throw new Error("Profile update returned no user data.");
      }

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(
        new CustomEvent("ruralfresh:user-updated", {
          detail: updatedUser
        })
      );

      setSuccess("Profile synchronized successfully.");
      setEditing(false);
    } catch (err) {
      setError(err.message || "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  }

  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-90px)] bg-[#f4f8f6] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-64 rounded-[36px] bg-slate-200" />
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div className="h-28 rounded-[26px] bg-slate-200" />
            <div className="h-28 rounded-[26px] bg-slate-200" />
            <div className="h-28 rounded-[26px] bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-90px)] bg-[#f4f8f6] px-4 py-20 text-center">
        <p className="text-sm font-bold text-slate-500">
          Your profile could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-90px)] overflow-hidden bg-[#f4f8f6] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-40 h-[500px] w-[500px] rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-cyan-200/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div
          className={`relative overflow-hidden rounded-[38px] bg-gradient-to-br ${meta.accent} p-7 text-white shadow-[0_30px_100px_rgba(15,23,42,0.18)] sm:p-10`}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
                backgroundSize: "38px 38px"
              }}
            />
          </div>

          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.9)]" />
                {meta.badge}
              </div>

              <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-[30px] border border-white/20 bg-white/10 text-3xl font-black shadow-2xl backdrop-blur-xl">
                  <span>{initials(user.name)}</span>
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-slate-950/40 bg-emerald-400 text-[10px] text-slate-950">
                    ✓
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                    {meta.label}
                  </p>
                  <h1 className="mt-1 truncate text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                    {user.name || "RuralFresh User"}
                  </h1>
                  <p className="mt-2 text-sm font-semibold text-white/60">
                    {meta.description}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/55">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2">
                  {user.role}
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2">
                  Member since {memberSince}
                </span>
                <span className="rounded-full border border-white/10 bg-emerald-300/10 px-3 py-2 text-emerald-200">
                  {accountActive ? "Account live" : "Account inactive"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {!editing ? (
                <button
                  type="button"
                  onClick={beginEditing}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black text-slate-950 shadow-xl transition hover:-translate-y-0.5"
                >
                  <Icon name="edit" className="h-4 w-4" />
                  Edit profile
                </button>
              ) : null}

              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-xs font-black text-white backdrop-blur transition hover:bg-white/15"
              >
                <Icon name="logout" className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className="mt-6 space-y-2">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {success}
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-7 grid gap-5 md:grid-cols-3">
          <StatCard
            icon={<Icon name="shield" className="h-5 w-5" />}
            label="Account status"
            value={accountActive ? "ACTIVE" : "INACTIVE"}
            hint="Live authentication state"
          />
          <StatCard
            icon={<Icon name="calendar" className="h-5 w-5" />}
            label="Profile strength"
            value={`${profileCompletion}% complete`}
            hint="Based on available account details"
          />
          <StatCard
            icon={<Icon name="spark" className="h-5 w-5" />}
            label="Last login"
            value={lastLogin}
            hint="Latest authenticated activity"
          />
        </div>

        <form onSubmit={saveProfile} className="mt-7 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] border border-slate-200/70 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.05)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
                  Identity layer
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Personal profile
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Your verified account information used across the RuralFresh network.
                </p>
              </div>

              <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 sm:flex">
                <Icon name="user" className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Field
                icon={<Icon name="user" className="h-4 w-4" />}
                label="Full name"
                value={editing ? form.name : user.name}
                name="name"
                editing={editing}
                onChange={handleChange}
              />
              <Field
                icon={<Icon name="mail" className="h-4 w-4" />}
                label="Email address"
                value={user.email}
              />
              <Field
                icon={<Icon name="phone" className="h-4 w-4" />}
                label="Phone number"
                value={editing ? form.phone : user.phone}
                name="phone"
                editing={editing}
                onChange={handleChange}
              />
              <Field
                icon={<Icon name="shield" className="h-4 w-4" />}
                label="Role"
                value={user.role?.toUpperCase()}
              />
            </div>

            {editing ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black text-white shadow-lg transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="check" className="h-4 w-4" />
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-[32px] border border-slate-200/70 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.05)] sm:p-8">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
              Account intelligence
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Live profile health
            </h2>

            <div className="mt-7 rounded-3xl bg-slate-950 p-6 text-white">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
                  Completion signal
                </span>
                <span className="text-sm font-black text-emerald-300">
                  {profileCompletion}%
                </span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
              <p className="mt-4 text-xs leading-6 text-white/45">
                Keep your contact and role-specific details current so every marketplace surface can display the correct identity.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                  User ID
                </p>
                <p className="mt-2 break-all text-xs font-black text-slate-700">
                  {String(user._id || user.id || "Not available")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Created
                </p>
                <p className="mt-2 text-xs font-black text-slate-700">
                  {memberSince}
                </p>
              </div>
            </div>
          </section>

          {seller ? (
            <section className="rounded-[32px] border border-emerald-100 bg-white p-6 shadow-[0_20px_70px_rgba(16,185,129,0.06)] sm:p-8 lg:col-span-2">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
                    Producer identity
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                    Farm profile & verification
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    These details describe the seller presence customers see while browsing the rural marketplace.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black text-amber-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Approval: {approvalStatus}
                </div>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SellerField
                  label="Farm name"
                  value={editing ? form.farmName : user.sellerProfile?.farmName}
                  name="farmName"
                  editing={editing}
                  onChange={handleChange}
                />
                <SellerField
                  label="Village"
                  value={editing ? form.village : user.sellerProfile?.village}
                  name="village"
                  editing={editing}
                  onChange={handleChange}
                />
                <SellerField
                  label="District"
                  value={editing ? form.district : user.sellerProfile?.district}
                  name="district"
                  editing={editing}
                  onChange={handleChange}
                />
                <SellerField
                  label="State"
                  value={editing ? form.state : user.sellerProfile?.state}
                  name="state"
                  editing={editing}
                  onChange={handleChange}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Farm description
                </p>
                {editing ? (
                  <textarea
                    name="farmDescription"
                    value={form.farmDescription}
                    onChange={handleChange}
                    rows={4}
                    className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
                  />
                ) : (
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {user.sellerProfile?.farmDescription ||
                      "No farm description has been added yet."}
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.16em]">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                  Seller account: {approvalStatus}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                  Public seller identity protected by role access
                </span>
              </div>
            </section>
          ) : null}

          <section className="rounded-[32px] border border-slate-200/70 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.05)] sm:p-8 lg:col-span-2">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Quick access
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Continue in RuralFresh
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Jump back into the part of the marketplace that belongs to your role.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link
                  to={
                    user.role === "admin"
                      ? "/admin/dashboard"
                      : user.role === "seller"
                      ? "/seller/dashboard"
                      : "/products"
                  }
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black text-white shadow-lg transition hover:bg-emerald-600"
                >
                  Open {user.role === "admin" ? "admin" : user.role === "seller" ? "seller" : "marketplace"} dashboard →
                </Link>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Back to profile top
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
