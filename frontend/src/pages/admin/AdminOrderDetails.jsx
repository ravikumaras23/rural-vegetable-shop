
import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  Link,
  useNavigate,
  useParams
} from "react-router-dom";

import AdminSidebar from "../../components/admin/AdminSidebar.jsx";
import AdminHeader from "../../components/admin/AdminHeader.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned"
];

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    },
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || `Request failed (${response.status})`
    );
    error.status = response.status;
    error.code = data.code;
    throw error;
  }

  return data;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function formatStatus(value) {
  if (!value) return "Unknown";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function getStatusClass(status) {
  const classes = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
    packed: "bg-violet-50 text-violet-700 border-violet-200",
    out_for_delivery: "bg-cyan-50 text-cyan-700 border-cyan-200",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    returned: "bg-orange-50 text-orange-700 border-orange-200"
  };

  return (
    classes[normalize(status)] ||
    "bg-slate-50 text-slate-600 border-slate-200"
  );
}

function getPaymentClass(status) {
  const classes = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    submitted: "bg-blue-50 text-blue-700 border-blue-200",
    failed: "bg-rose-50 text-rose-700 border-rose-200",
    refunded: "bg-violet-50 text-violet-700 border-violet-200"
  };

  return (
    classes[normalize(status)] ||
    "bg-amber-50 text-amber-700 border-amber-200"
  );
}

function paymentMethodLabel(method) {
  const methods = {
    cod: "Cash on Delivery",
    razorpay: "UPI / Online Payment",
    seller_qr: "Seller QR Payment"
  };

  return methods[normalize(method)] || formatStatus(method);
}

function getAddress(order) {
  const address = order?.shippingAddress || {};

  return [
    address.name,
    address.phone,
    address.addressLine1,
    address.addressLine2,
    address.village,
    address.district,
    address.state,
    address.pincode
  ]
    .filter(Boolean)
    .join(", ") || "No shipping address available";
}

function Info({ label, value, breakAll = false }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold text-slate-800 ${
          breakAll ? "break-all" : "break-words"
        }`}
      >
        {value === undefined || value === null || value === ""
          ? "—"
          : String(value)}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusClass(
        status
      )}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function PaymentBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getPaymentClass(
        status
      )}`}
    >
      {formatStatus(status)}
    </span>
  );
}

/* -------------------------------------------------------
   IN-APP TOAST POPUP
------------------------------------------------------- */

function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className="fixed right-4 top-5 z-[100] w-[calc(100%-2rem)] max-w-sm animate-[slideIn_.25s_ease-out] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black ${
            isSuccess
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {isSuccess ? "✓" : "!"}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-black ${
              isSuccess ? "text-emerald-800" : "text-rose-800"
            }`}
          >
            {isSuccess ? "Success" : "Something went wrong"}
          </p>

          <p className="mt-1 break-words text-sm leading-5 text-slate-600">
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   CUSTOM DELETE CONFIRMATION MODAL
------------------------------------------------------- */

function DeleteModal({
  order,
  loading,
  onCancel,
  onConfirm
}) {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-order-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-xl text-rose-700">
          <span aria-hidden="true">!</span>
        </div>

        <h2
          id="delete-order-title"
          className="mt-5 text-xl font-black text-slate-950"
        >
          Delete this order?
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          You are about to delete order{" "}
          <strong className="break-all text-slate-900">
            #{order.orderNumber || order._id}
          </strong>
          . This action may be permanent. Continue only if you are sure.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Keep order
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Yes, delete order"}
          </button>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------
   ADMIN ORDER DETAILS PAGE
------------------------------------------------------- */

export default function AdminOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({
      type,
      message,
      id: `${Date.now()}-${Math.random()}`
    });
  }, []);

  const loadOrder = useCallback(async () => {
    if (!id) {
      setLoadError("Order ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      /*
       * Expected backend endpoint:
       * GET /api/order-management/admin/:id
       */
      const response = await apiRequest(
        `/api/order-management/admin/${encodeURIComponent(id)}`
      );

      const fetchedOrder = response.data || response.order || null;

      if (!fetchedOrder) {
        throw new Error("The server did not return order details.");
      }

      setOrder(fetchedOrder);
      setNextStatus(normalize(fetchedOrder.orderStatus));
    } catch (error) {
      setLoadError(error.message || "Unable to load order details.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!toast) return undefined;

    const timeout = setTimeout(() => {
      setToast(null);
    }, 4500);

    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!deleteModalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !deleting) {
        setDeleteModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [deleteModalOpen, deleting]);

  /* -----------------------------------------------------
     UPDATE ORDER STATUS
  ----------------------------------------------------- */

  const handleStatusUpdate = async (event) => {
    event.preventDefault();

    if (!order?._id || !nextStatus) return;

    const currentStatus = normalize(order.orderStatus);

    if (currentStatus === normalize(nextStatus)) {
      showToast("error", "Choose a different order status.");
      return;
    }

    if (!ORDER_STATUSES.includes(normalize(nextStatus))) {
      showToast("error", "Please choose a valid order status.");
      return;
    }

    setUpdating(true);

    try {
      /*
       * Expected backend endpoint:
       * PATCH /api/order-management/admin/:id/status
       * Body: { status: "confirmed" }
       */
      const response = await apiRequest(
        `/api/order-management/admin/${encodeURIComponent(
          order._id
        )}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: normalize(nextStatus)
          })
        }
      );

      const updatedOrder =
        response.data ||
        response.order ||
        null;

      if (updatedOrder) {
        setOrder((previous) => ({
          ...previous,
          ...updatedOrder
        }));
        setNextStatus(normalize(updatedOrder.orderStatus));
      } else {
        // Reload the persisted state when the endpoint returns
        // a success message but no updated order document.
        await loadOrder();
      }

      showToast(
        "success",
        response.message || "Order status updated successfully."
      );
    } catch (error) {
      showToast("error", error.message || "Could not update order status.");
      setNextStatus(normalize(order.orderStatus));
    } finally {
      setUpdating(false);
    }
  };

  /* -----------------------------------------------------
     DELETE ORDER
  ----------------------------------------------------- */

  const handleDeleteOrder = async () => {
    if (!order?._id || deleting) return;

    setDeleting(true);

    try {
      /*
       * Expected backend endpoint:
       * DELETE /api/order-management/admin/:id
       */
      const response = await apiRequest(
        `/api/order-management/admin/${encodeURIComponent(order._id)}`,
        {
          method: "DELETE"
        }
      );

      setDeleteModalOpen(false);

      showToast(
        "success",
        response.message || "Order deleted successfully."
      );

      /*
       * Give the toast a moment to appear before navigating
       * back to the admin orders list.
       */
      window.setTimeout(() => {
        navigate("/admin/orders", {
          replace: true,
          state: {
            successMessage:
              response.message || "Order deleted successfully."
          }
        });
      }, 900);
    } catch (error) {
      showToast("error", error.message || "Unable to delete this order.");
    } finally {
      setDeleting(false);
    }
  };

  const items = Array.isArray(order?.items) ? order.items : [];
  const sellerPayments = Array.isArray(order?.sellerPayments)
    ? order.sellerPayments
    : [];

  const totalQuantity = items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const totalSellers = new Set(
    items
      .map((item) =>
        String(item?.seller?._id || item?.seller || "")
      )
      .filter(Boolean)
  ).size;

  const paymentMethod = normalize(order?.paymentMethod);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Toast
        toast={toast}
        onClose={() => setToast(null)}
      />

      <DeleteModal
        order={deleteModalOpen ? order : null}
        loading={deleting}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteOrder}
      />

      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="min-w-0 flex-1">
          <AdminHeader />

          <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            {/* Page header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link
                  to="/admin/orders"
                  className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
                >
                  <span aria-hidden="true">←</span>
                  Back to all orders
                </Link>

                <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Order details
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Review customer, products, payment and delivery information.
                </p>
              </div>

              {order && (
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.orderStatus} />

                  <button
                    type="button"
                    onClick={loadOrder}
                    disabled={loading || updating || deleting}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>

            {/* Loading state */}
            {loading && (
              <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
                <p className="mt-4 text-sm font-bold text-slate-700">
                  Loading order details...
                </p>
              </section>
            )}

            {/* Error state */}
            {!loading && loadError && (
              <section className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-xl font-black text-rose-700">
                  !
                </div>

                <h2 className="mt-4 text-lg font-black text-slate-900">
                  Unable to load order
                </h2>

                <p className="mx-auto mt-2 max-w-xl break-words text-sm leading-6 text-slate-600">
                  {loadError}
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={loadOrder}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
                  >
                    Try again
                  </button>

                  <Link
                    to="/admin/orders"
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Back to orders
                  </Link>
                </div>
              </section>
            )}

            {/* Order content */}
            {!loading && !loadError && order && (
              <>
                {/* Summary cards */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Order total"
                    value={`₹${formatMoney(order.totalAmount)}`}
                    description="Total amount for this order"
                    icon="₹"
                  />

                  <SummaryCard
                    label="Products quantity"
                    value={totalQuantity}
                    description={`${items.length} product line${
                      items.length === 1 ? "" : "s"
                    }`}
                    icon="▦"
                  />

                  <SummaryCard
                    label="Sellers involved"
                    value={totalSellers}
                    description="Unique sellers in this order"
                    icon="♙"
                  />

                  <SummaryCard
                    label="Order placed"
                    value={formatDate(order.createdAt)}
                    description={`Order #${order.orderNumber || order._id}`}
                    icon="◷"
                    smallValue
                  />
                </div>

                {/* Main content */}
                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
                  <div className="space-y-6">
                    {/* Customer information */}
                    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <SectionHeading
                        title="Customer information"
                        subtitle="Customer details associated with this order"
                        icon="♙"
                      />

                      <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
                        <Info
                          label="Customer name"
                          value={order.customer?.name}
                        />

                        <Info
                          label="Email address"
                          value={order.customer?.email}
                          breakAll
                        />

                        <Info
                          label="Phone number"
                          value={
                            order.customer?.phone ||
                            order.shippingAddress?.phone
                          }
                        />

                        <Info
                          label="Customer ID"
                          value={
                            order.customer?._id ||
                            order.customer
                          }
                          breakAll
                        />

                        <Info
                          label="Order number"
                          value={order.orderNumber || order._id}
                          breakAll
                        />

                        <Info
                          label="Last updated"
                          value={formatDate(order.updatedAt)}
                        />
                      </div>
                    </section>

                    {/* Products */}
                    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <SectionHeading
                        title="Products in this order"
                        subtitle={`${items.length} product line${
                          items.length === 1 ? "" : "s"
                        }`}
                        icon="▦"
                      />

                      {items.length === 0 ? (
                        <p className="p-6 text-sm text-slate-500">
                          No order items were returned by the server.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {items.map((item, index) => {
                            const productImage =
                              item.productImage ||
                              item.product?.images?.[0]?.url ||
                              "";

                            const quantity = Number(item.quantity || 0);

                            const unitPrice = Number(
                              item.priceAtPurchase ??
                                item.price ??
                                item.product?.price ??
                                0
                            );

                            const subtotal = Number(
                              item.subtotal ?? quantity * unitPrice
                            );

                            return (
                              <div
                                key={`${item._id || item.product?._id || index}-${index}`}
                                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                              >
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                                  {productImage ? (
                                    <img
                                      src={productImage}
                                      alt={
                                        item.productName ||
                                        item.product?.name ||
                                        "Vegetable"
                                      }
                                      loading="lazy"
                                      className="h-full w-full object-cover"
                                      onError={(event) => {
                                        event.currentTarget.style.display =
                                          "none";
                                      }}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-3xl">
                                      🥬
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <h3 className="break-words text-sm font-black text-slate-950">
                                    {item.productName ||
                                      item.product?.name ||
                                      "Product"}
                                  </h3>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {quantity} {item.unit || "unit"} × ₹
                                    {formatMoney(unitPrice)}
                                  </p>

                                  <p className="mt-2 break-words text-xs font-semibold text-emerald-700">
                                    Seller:{" "}
                                    {item.seller?.sellerProfile?.businessName ||
                                      item.seller?.name ||
                                      item.sellerName ||
                                      "Seller information unavailable"}
                                  </p>

                                  <p className="mt-1 break-all text-[10px] text-slate-400">
                                    Seller ID:{" "}
                                    {item.seller?._id ||
                                      item.seller ||
                                      "—"}
                                  </p>
                                </div>

                                <div className="shrink-0 sm:text-right">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Subtotal
                                  </p>
                                  <p className="mt-1 text-lg font-black text-slate-950">
                                    ₹{formatMoney(subtotal)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    {/* Shipping address */}
                    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <SectionHeading
                        title="Shipping address"
                        subtitle="Delivery destination provided for this order"
                        icon="⌖"
                      />

                      <div className="p-5">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                          <p className="text-sm font-bold leading-7 text-slate-800">
                            {getAddress(order)}
                          </p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Right column */}
                  <div className="space-y-6">
                    {/* Admin status controls */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                      <SectionHeading
                        title="Order management"
                        subtitle="Manage the persisted order status"
                        icon="⚙"
                      />

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-slate-500">
                          Current status
                        </span>
                        <StatusBadge status={order.orderStatus} />
                      </div>

                      <form onSubmit={handleStatusUpdate} className="mt-5">
                        <label
                          htmlFor="admin-order-status"
                          className="block text-xs font-bold text-slate-600"
                        >
                          Change order status
                        </label>

                        <select
                          id="admin-order-status"
                          value={nextStatus}
                          onChange={(event) =>
                            setNextStatus(event.target.value)
                          }
                          disabled={updating || deleting}
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 disabled:opacity-50"
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>

                        <button
                          type="submit"
                          disabled={
                            updating ||
                            deleting ||
                            !nextStatus ||
                            normalize(nextStatus) ===
                              normalize(order.orderStatus)
                          }
                          className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {updating ? "Updating order..." : "Save status"}
                        </button>
                      </form>

                      <p className="mt-4 text-xs leading-5 text-slate-500">
                        The backend validates whether the status change is
                        permitted. If a transition is not allowed, the server
                        response will appear as an error popup.
                      </p>
                    </section>

                    {/* Payment information */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                      <SectionHeading
                        title="Payment information"
                        subtitle="Payment method and payment status"
                        icon="₹"
                      />

                      <div className="mt-5 space-y-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Payment method
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-900">
                            {paymentMethodLabel(order.paymentMethod)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Payment status
                          </p>
                          <div className="mt-2">
                            <PaymentBadge status={order.paymentStatus} />
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Inventory status
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatStatus(order.inventoryStatus)}
                          </p>
                        </div>

                        {order.transactionId && (
                          <Info
                            label="Transaction ID"
                            value={order.transactionId}
                            breakAll
                          />
                        )}

                        {order.paymentReference && (
                          <Info
                            label="Payment reference"
                            value={order.paymentReference}
                            breakAll
                          />
                        )}
                      </div>

                      {sellerPayments.length > 0 && (
                        <div className="mt-5 border-t border-slate-100 pt-4">
                          <p className="text-xs font-black text-slate-800">
                            Seller QR payments
                          </p>

                          <div className="mt-3 space-y-3">
                            {sellerPayments.map((payment, index) => (
                              <div
                                key={payment._id || index}
                                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="break-words text-xs font-bold text-slate-800">
                                      {payment.seller?.sellerProfile
                                        ?.businessName ||
                                        payment.seller?.name ||
                                        "Seller"}
                                    </p>

                                    <p className="mt-1 break-all text-[10px] text-slate-500">
                                      {payment.transactionReference || "No transaction reference"}
                                    </p>
                                  </div>

                                  <span className="shrink-0 text-sm font-black text-slate-900">
                                    ₹{formatMoney(payment.amount)}
                                  </span>
                                </div>

                                <div className="mt-2">
                                  <PaymentBadge status={payment.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>

                    {/* Price breakdown */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                      <SectionHeading
                        title="Price breakdown"
                        subtitle="Order amount summary"
                        icon="₹"
                      />

                      <div className="mt-5 space-y-4">
                        <AmountRow
                          label="Subtotal"
                          value={order.subtotal}
                        />

                        <AmountRow
                          label="Delivery charge"
                          value={order.deliveryCharge}
                          free={Number(order.deliveryCharge || 0) === 0}
                        />

                        {Number(order.discount || 0) > 0 && (
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-500">Discount</span>
                            <span className="font-bold text-emerald-700">
                              −₹{formatMoney(order.discount)}
                            </span>
                          </div>
                        )}

                        <div className="border-t border-dashed border-slate-200 pt-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-black text-slate-900">
                              Total amount
                            </span>
                            <span className="text-xl font-black text-emerald-700">
                              ₹{formatMoney(order.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Delete order */}
                    <section className="rounded-3xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6">
                      <h2 className="text-sm font-black text-rose-800">
                        Danger zone
                      </h2>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Delete this order only when required. The backend
                        controls whether the operation is permitted and
                        whether any inventory reservation must be released.
                      </p>

                      <button
                        type="button"
                        onClick={() => setDeleteModalOpen(true)}
                        disabled={updating || deleting}
                        className="mt-4 w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        Delete order
                      </button>
                    </section>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Order record
                    </p>
                    <p className="mt-1 break-all text-[10px] text-slate-400">
                      Database ID: {order._id}
                    </p>
                  </div>

                  <Link
                    to="/admin/orders"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Return to orders
                  </Link>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------------
   REUSABLE DISPLAY COMPONENTS
------------------------------------------------------- */

function SummaryCard({
  label,
  value,
  description,
  icon,
  smallValue = false
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p
            className={`mt-3 break-words font-black tracking-tight text-slate-950 ${
              smallValue ? "text-sm leading-6" : "text-2xl"
            }`}
          >
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-black text-emerald-700">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-400">
        {description}
      </p>
    </section>
  );
}

function SectionHeading({ title, subtitle, icon }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg font-black text-emerald-700">
        {icon}
      </div>

      <div className="min-w-0">
        <h2 className="text-sm font-black text-slate-950">
          {title}
        </h2>

        <p className="mt-1 text-[11px] leading-5 text-slate-400">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function AmountRow({ label, value, free = false }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>

      <span className="font-bold text-slate-800">
        {free ? "FREE" : `₹${formatMoney(value)}`}
      </span>
    </div>
  );
}