import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link,
  useNavigate,
  useParams
} from "react-router-dom";

import { QRCodeCanvas } from "qrcode.react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const getToken = () =>
  localStorage.getItem("token");

async function request(url, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error(
      "Please login before continuing."
    );
  }

  const response = await fetch(
    `${API_URL}${url}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      },
      cache: "no-store"
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "Request failed"
    );
  }

  return data;
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

/*
|--------------------------------------------------------------------------
| UPI ID validation
|--------------------------------------------------------------------------
*/

function isValidUpiId(value) {
  const upiId = String(
    value || ""
  ).trim();

  if (
    !upiId ||
    upiId.length > 256
  ) {
    return false;
  }

  return /^[^@\s]+@[A-Za-z0-9._-]+$/.test(
    upiId
  );
}

/*
|--------------------------------------------------------------------------
| Stable numeric transaction reference
|--------------------------------------------------------------------------
|
| Dynamic UPI QR payment payloads need a transaction reference.
| MongoDB ObjectIds are hexadecimal, so we convert the identifier
| into a numeric reference suitable for the UPI deep-link.
|
*/

function buildTransactionReference(
  source,
  index = 0
) {
  const raw = String(
    source || ""
  ).trim();

  const hex = raw
    .replace(
      /[^0-9a-f]/gi,
      ""
    )
    .slice(0, 24);

  if (hex.length >= 8) {
    try {
      const numericReference =
        BigInt(
          `0x${hex}`
        ) + BigInt(index);

      return numericReference
        .toString()
        .slice(0, 35);
    } catch {
      // Use timestamp fallback below.
    }
  }

  return `${Date.now()}${String(
    index
  ).padStart(2, "0")}`.slice(
    0,
    35
  );
}

/*
|--------------------------------------------------------------------------
| Build UPI payment deep link
|--------------------------------------------------------------------------
*/

function buildUpiLink({
  upiId,
  payeeName,
  amount,
  note,
  transactionRef,
  merchantCode
}) {
  const cleanUpiId = String(
    upiId || ""
  ).trim();

  const numericAmount = Number(
    amount || 0
  );

  if (
    !isValidUpiId(
      cleanUpiId
    )
  ) {
    return "";
  }

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {
    return "";
  }

  const cleanTransactionRef =
    String(
      transactionRef || ""
    )
      .replace(
        /[^0-9]/g,
        ""
      )
      .slice(0, 35);

  if (
    !cleanTransactionRef
  ) {
    return "";
  }

  const params =
    new URLSearchParams();

  /*
   * pa = Payee UPI ID
   * pn = Payee name
   * tr = Transaction reference
   * am = Exact amount
   * cu = Currency
   * tn = Transaction note
   */

  params.set(
    "pa",
    cleanUpiId
  );

  params.set(
    "pn",
    String(
      payeeName ||
        "RuralFresh"
    )
      .trim()
      .slice(0, 99)
  );

  params.set(
    "tr",
    cleanTransactionRef
  );

  params.set(
    "am",
    numericAmount.toFixed(2)
  );

  params.set(
    "cu",
    "INR"
  );

  params.set(
    "tn",
    String(
      note ||
        "RuralFresh order"
    )
      .trim()
      .slice(0, 80)
  );

  /*
   * Merchant category code is optional here.
   *
   * We only add it when the seller has actually configured
   * a valid 4-digit value.
   */
  const cleanMerchantCode =
    String(
      merchantCode || ""
    ).replace(
      /[^0-9]/g,
      ""
    );

  if (
    /^\d{4}$/.test(
      cleanMerchantCode
    )
  ) {
    params.set(
      "mc",
      cleanMerchantCode
    );
  }

  return `upi://pay?${params.toString()}`;
}

/*
|--------------------------------------------------------------------------
| Open UPI application
|--------------------------------------------------------------------------
*/

function openUpiPayment(
  upiLink
) {
  if (!upiLink) {
    return;
  }

  window.location.href =
    upiLink;
}

/*
|--------------------------------------------------------------------------
| Copy text helper
|--------------------------------------------------------------------------
*/

async function copyText(
  value
) {
  const text = String(
    value || ""
  ).trim();

  if (!text) {
    throw new Error(
      "Nothing to copy."
    );
  }

  if (
    navigator.clipboard?.writeText
  ) {
    await navigator.clipboard.writeText(
      text
    );

    return;
  }

  const textarea =
    document.createElement(
      "textarea"
    );

  textarea.value = text;

  textarea.style.position =
    "fixed";

  textarea.style.left =
    "-9999px";

  document.body.appendChild(
    textarea
  );

  textarea.select();

  const copied =
    document.execCommand(
      "copy"
    );

  document.body.removeChild(
    textarea
  );

  if (!copied) {
    throw new Error(
      "Unable to copy."
    );
  }
}

/*
|--------------------------------------------------------------------------
| Main component
|--------------------------------------------------------------------------
*/

export default function SellerQRPayment() {
  const { orderId } =
    useParams();

  const navigate =
    useNavigate();

  const [order, setOrder] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    submittingId,
    setSubmittingId
  ] = useState("");

  const [
    utrByPayment,
    setUtrByPayment
  ] = useState({});

  const [success, setSuccess] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Load order
  |--------------------------------------------------------------------------
  */

  const loadOrder =
    useCallback(
      async () => {
        try {
          const response =
            await request(
              `/api/orders/${orderId}`
            );

          setOrder(
            response.data || null
          );

          setError("");
        } catch (err) {
          setError(
            err.message ||
              "Unable to load order."
          );
        } finally {
          setLoading(false);
        }
      },
      [orderId]
    );

  /*
  |--------------------------------------------------------------------------
  | Initial load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  /*
  |--------------------------------------------------------------------------
  | Poll payment status
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timer =
      setInterval(() => {
        loadOrder();
      }, 3000);

    return () =>
      clearInterval(timer);
  }, [loadOrder]);

  /*
  |--------------------------------------------------------------------------
  | Socket payment update event
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handler = (
      event
    ) => {
      const detail =
        event.detail;

      if (
        !detail ||
        String(
          detail.orderId
        ) !== String(orderId)
      ) {
        return;
      }

      loadOrder();
    };

    window.addEventListener(
      "ruralfresh:order-payment-updated",
      handler
    );

    return () => {
      window.removeEventListener(
        "ruralfresh:order-payment-updated",
        handler
      );
    };
  }, [
    orderId,
    loadOrder
  ]);

  /*
  |--------------------------------------------------------------------------
  | Seller payments
  |--------------------------------------------------------------------------
  */

  const payments = useMemo(
    () =>
      Array.isArray(
        order?.sellerPayments
      )
        ? order.sellerPayments
        : [],
    [order]
  );

  const pendingPayments =
    payments.filter(
      (payment) =>
        payment.status !==
          "paid" &&
        payment.status !==
          "refunded"
    );

  const allPaid =
    payments.length > 0 &&
    payments.every(
      (payment) =>
        payment.status ===
        "paid"
    );

  /*
  |--------------------------------------------------------------------------
  | UTR input
  |--------------------------------------------------------------------------
  */

  const updateUtr = (
    paymentId,
    value
  ) => {
    setUtrByPayment(
      (current) => ({
        ...current,
        [paymentId]:
          value
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Submit UTR
  |--------------------------------------------------------------------------
  */

  const submitPaymentReference =
    async (
      payment
    ) => {
      const paymentId =
        String(
          payment.paymentId ||
            payment._id ||
            ""
        );

      const transactionReference =
        String(
          utrByPayment[
            paymentId
          ] || ""
        ).trim();

      if (
        !transactionReference
      ) {
        setError(
          "Enter the UTR / transaction reference before submitting."
        );

        return;
      }

      if (
        transactionReference.length <
        6
      ) {
        setError(
          "The transaction reference must contain at least 6 characters."
        );

        return;
      }

      try {
        setSubmittingId(
          paymentId
        );

        setError("");
        setSuccess("");

        await request(
          `/api/orders/${orderId}/seller-payments/${paymentId}/submit`,
          {
            method: "POST",
            body: JSON.stringify({
              transactionReference
            })
          }
        );

        setSuccess(
          "Payment reference submitted. Waiting for seller verification."
        );

        await loadOrder();
      } catch (err) {
        setError(
          err.message ||
            "Unable to submit payment reference."
        );
      } finally {
        setSubmittingId("");
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Redirect after all seller payments are paid
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!allPaid) {
      return;
    }

    setSuccess(
      "All seller payments are verified. Your order is now paid and confirmed."
    );

    const timer =
      setTimeout(() => {
        navigate(
          `/order-success/${orderId}`,
          {
            replace: true,
            state: {
              order
            }
          }
        );
      }, 1200);

    return () =>
      clearTimeout(timer);
  }, [
    allPaid,
    navigate,
    orderId,
    order
  ]);

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030807] px-6 py-16 text-center text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-10">
          <p className="text-lg font-black text-emerald-300">
            Loading seller payment details...
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Order not found
  |--------------------------------------------------------------------------
  */

  if (!order) {
    return (
      <div className="min-h-screen bg-[#030807] px-6 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-400/20 bg-red-500/10 p-8">
          <h1 className="text-2xl font-black">
            Unable to load payment
          </h1>

          <p className="mt-3 text-sm text-red-200">
            {error ||
              "Order not found."}
          </p>

          <Link
            to="/orders"
            className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-black text-slate-900"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-[#030807] text-white">

      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">

          <div>
            <p className="text-xl font-black text-emerald-300">
              RuralFresh
            </p>

            <p className="text-xs text-white/35">
              Seller QR Payment
            </p>
          </div>

          <Link
            to="/orders"
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/60"
          >
            My Orders
          </Link>

        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">

        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6">

          {/* ============================================================ */}
          {/* ORDER HEADER                                                  */}
          {/* ============================================================ */}

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300/50">
                Order
              </p>

              <h1 className="mt-2 text-3xl font-black">
                {order.orderNumber}
              </h1>

            </div>

            <div className="text-left sm:text-right">

              <p className="text-xs text-white/40">
                Total payable
              </p>

              <p className="mt-1 text-3xl font-black text-emerald-300">
                {formatCurrency(
                  order.totalAmount
                )}
              </p>

            </div>

          </div>

          {/* ============================================================ */}
          {/* ERROR                                                         */}
          {/* ============================================================ */}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* ============================================================ */}
          {/* SUCCESS                                                       */}
          {/* ============================================================ */}

          {success && (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
              {success}
            </div>
          )}

          {/* ============================================================ */}
          {/* CART -> ORDER SNAPSHOT                                        */}
          {/* ============================================================ */}

          <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.025] p-6">

            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300/50">
                  From your cart
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Order items
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  These are the exact product quantities captured when you checked out.
                </p>

              </div>

              <div className="text-left sm:text-right">

                <p className="text-xs text-white/35">
                  Cart subtotal
                </p>

                <p className="mt-1 text-xl font-black text-emerald-300">
                  {formatCurrency(
                    order.subtotal
                  )}
                </p>

              </div>

            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">

              {(order.items || []).map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={`${String(
                      item.product
                    )}-${index}`}
                    className={`flex gap-4 p-4 ${
                      index !==
                      (order.items || [])
                        .length -
                        1
                        ? "border-b border-white/10"
                        : ""
                    }`}
                  >

                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white/5">

                      {item.productImage ? (
                        <img
                          src={
                            item.productImage
                          }
                          alt={
                            item.productName ||
                            "Product"
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">
                          🥬
                        </div>
                      )}

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-sm font-black text-white">
                        {item.productName ||
                          "Product"}
                      </p>

                      <p className="mt-1 text-xs text-white/40">

                        {Number(
                          item.quantity ||
                            0
                        )}{" "}

                        {item.unit || ""}

                        {" × "}

                        {formatCurrency(
                          item.priceAtPurchase
                        )}

                      </p>

                      <p className="mt-1 text-[11px] text-cyan-200/60">

                        Seller:{" "}

                        {item.seller
                          ?.name ||
                          item.sellerName ||
                          "Seller"}

                      </p>

                    </div>

                    <div className="text-right">

                      <p className="text-sm font-black text-emerald-300">
                        {formatCurrency(
                          item.subtotal
                        )}
                      </p>

                    </div>

                  </div>
                )
              )}

            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
                  Items
                </p>

                <p className="mt-1 text-lg font-black">
                  {(order.items || [])
                    .length}
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
                  Delivery
                </p>

                <p className="mt-1 text-lg font-black">

                  {Number(
                    order.deliveryCharge ||
                      0
                  ) === 0
                    ? "FREE"
                    : formatCurrency(
                        order.deliveryCharge
                      )}

                </p>

              </div>

              <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] p-4">

                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-200/50">
                  Total
                </p>

                <p className="mt-1 text-lg font-black text-emerald-300">
                  {formatCurrency(
                    order.totalAmount
                  )}
                </p>

              </div>

            </div>

          </section>

          {/* ============================================================ */}
          {/* ALL PAID                                                     */}
          {/* ============================================================ */}

          {allPaid ? (

            <div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-8 text-center">

              <div className="text-5xl">
                ✓
              </div>

              <h2 className="mt-4 text-2xl font-black">
                Payment completed
              </h2>

              <p className="mt-2 text-sm text-white/60">
                All seller payments have been verified. Redirecting to your order...
              </p>

            </div>

          ) : (

            <>

              {/* ======================================================== */}
              {/* HOW PAYMENT WORKS                                        */}
              {/* ======================================================== */}

              <div className="mt-8 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] p-5">

                <p className="font-black">
                  How payment works
                </p>

                <p className="mt-2 text-sm leading-6 text-white/55">
                  Each seller has a separate payment. Scan the seller QR
                  with a UPI application, pay the exact amount shown, then
                  enter the UTR / transaction reference. The seller verifies
                  the payment before that seller payment becomes paid.
                </p>

                <p className="mt-3 text-xs leading-5 text-cyan-100/50">
                  Use Google Pay, PhonePe, Paytm, BHIM or another UPI app
                  to scan the QR.
                </p>

              </div>

              {/* ======================================================== */}
              {/* SELLER PAYMENTS                                          */}
              {/* ======================================================== */}

              <div className="mt-8 space-y-6">

                {payments.map(
                  (
                    payment,
                    index
                  ) => {

                    /*
                    |--------------------------------------------------------------------------
                    | Payment ID
                    |--------------------------------------------------------------------------
                    */

                    const paymentId =
                      String(
                        payment.paymentId ||
                          payment._id ||
                          index
                      );

                    /*
                    |--------------------------------------------------------------------------
                    | Seller name
                    |--------------------------------------------------------------------------
                    */

                    const sellerName =
                      payment.seller
                        ?.name ||
                      payment.sellerName ||
                      `Seller ${
                        index + 1
                      }`;

                    /*
                    |--------------------------------------------------------------------------
                    | Seller UPI ID
                    |--------------------------------------------------------------------------
                    */

                    const upiId =
                      String(
                        payment.upiIdSnapshot ||
                          payment.seller
                            ?.sellerProfile
                            ?.paymentSettings
                            ?.upiId ||
                          ""
                      ).trim();

                    /*
                    |--------------------------------------------------------------------------
                    | Official seller QR
                    |--------------------------------------------------------------------------
                    */

                    const staticQr =
                      payment.qrImageSnapshot ||
                      payment.seller
                        ?.sellerProfile
                        ?.paymentSettings
                        ?.qrCodeUrl ||
                      "";

                    /*
                    |--------------------------------------------------------------------------
                    | Merchant code
                    |--------------------------------------------------------------------------
                    */

                    const merchantCode =
                      String(
                        payment.seller
                          ?.sellerProfile
                          ?.paymentSettings
                          ?.merchantCode ||
                          payment.seller
                            ?.sellerProfile
                            ?.paymentSettings
                            ?.mcc ||
                          ""
                      ).trim();

                    /*
                    |--------------------------------------------------------------------------
                    | Stable transaction reference
                    |--------------------------------------------------------------------------
                    */

                    const transactionRef =
                      buildTransactionReference(
                        payment._id ||
                          payment.paymentId ||
                          order._id,
                        index
                      );

                    /*
                    |--------------------------------------------------------------------------
                    | Validate UPI ID
                    |--------------------------------------------------------------------------
                    */

                    const validUpiId =
                      isValidUpiId(
                        upiId
                      );

                    /*
                    |--------------------------------------------------------------------------
                    | Build UPI link
                    |--------------------------------------------------------------------------
                    */

                    const upiLink =
                      validUpiId
                        ? buildUpiLink({
                            upiId,
                            payeeName:
                              sellerName,
                            amount:
                              payment.amount,
                            note:
                              `RuralFresh ${order.orderNumber}`,
                            transactionRef,
                            merchantCode
                          })
                        : "";

                    /*
                    |--------------------------------------------------------------------------
                    | Payment status
                    |--------------------------------------------------------------------------
                    */

                    const isPaid =
                      payment.status ===
                      "paid";

                    const isSubmitted =
                      payment.status ===
                      "submitted";

                    return (
                      <section
                        key={
                          paymentId
                        }
                        className="rounded-[28px] border border-white/10 bg-black/20 p-6"
                      >

                        {/* ==================================================== */}
                        {/* SELLER HEADER                                        */}
                        {/* ==================================================== */}

                        <div className="flex flex-col justify-between gap-4 sm:flex-row">

                          <div>

                            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/30">
                              Seller{" "}
                              {index + 1}
                            </p>

                            <h2 className="mt-2 text-2xl font-black">
                              {
                                sellerName
                              }
                            </h2>

                          </div>

                          <div className="sm:text-right">

                            <p className="text-xs text-white/35">
                              Payable amount
                            </p>

                            <p className="mt-1 text-3xl font-black text-emerald-300">
                              {formatCurrency(
                                payment.amount
                              )}
                            </p>

                          </div>

                        </div>

                        {/* ==================================================== */}
                        {/* PAYMENT CONTENT                                     */}
                        {/* ==================================================== */}

                        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">

                          {/* ================================================== */}
                          {/* QR AREA                                            */}
                          {/* ================================================== */}

                          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl bg-white p-5">

                            {/* ---------------------------------------------- */}
                            {/* GENERATED DYNAMIC UPI QR                        */}
                            {/* ---------------------------------------------- */}

                            {upiLink ? (

                              <>

                                <QRCodeCanvas
                                  value={
                                    upiLink
                                  }
                                  size={
                                    270
                                  }
                                  includeMargin={
                                    true
                                  }
                                  level="M"
                                />

                                <p className="mt-4 text-center text-xs font-black text-slate-700">
                                  Dynamic UPI payment QR
                                </p>

                                <p className="mt-1 text-center text-[10px] text-slate-500">
                                  Amount:{" "}
                                  {formatCurrency(
                                    payment.amount
                                  )}
                                </p>

                              </>

                            ) : staticQr ? (

                              <>

                                <img
                                  src={
                                    staticQr
                                  }
                                  alt={`Official UPI QR for ${sellerName}`}
                                  className="max-h-[270px] max-w-[270px] rounded-xl object-contain"
                                />

                                <p className="mt-4 text-center text-xs font-black text-slate-700">
                                  Seller's official UPI QR
                                </p>

                                <p className="mt-1 text-center text-[10px] text-slate-500">
                                  Pay exactly{" "}
                                  {formatCurrency(
                                    payment.amount
                                  )}
                                </p>

                              </>

                            ) : (

                              <div className="px-5 text-center text-sm text-slate-700">

                                <p className="font-black text-red-600">
                                  Seller QR unavailable
                                </p>

                                <p className="mt-2 text-xs text-slate-500">
                                  The seller has not configured a valid UPI ID
                                  or uploaded an official QR image.
                                </p>

                              </div>

                            )}

                          </div>

                          {/* ================================================== */}
                          {/* PAYMENT DETAILS                                    */}
                          {/* ================================================== */}

                          <div className="flex flex-col justify-center">

                            <p className="text-sm font-black text-white/80">
                              Scan with your UPI app
                            </p>

                            <p className="mt-2 text-sm leading-6 text-white/45">
                              Scan the QR using Google Pay, PhonePe, Paytm,
                              BHIM or another UPI app. The seller and amount
                              are included in the payment details when the
                              dynamic UPI QR is available.
                            </p>

                            {/* ---------------------------------------------- */}
                            {/* PAYABLE AMOUNT                                  */}
                            {/* ---------------------------------------------- */}

                            <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-5">

                              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200/60">
                                Amount to pay
                              </p>

                              <p className="mt-1 text-3xl font-black text-emerald-300">
                                {formatCurrency(
                                  payment.amount
                                )}
                              </p>

                              <p className="mt-2 text-xs text-white/40">
                                Pay this exact amount to{" "}
                                {
                                  sellerName
                                }.
                              </p>

                            </div>

                            {/* ---------------------------------------------- */}
                            {/* UPI ID                                           */}
                            {/* ---------------------------------------------- */}

                            {upiId && (

                              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">

                                <div className="flex items-center justify-between gap-4">

                                  <p className="text-xs text-white/35">
                                    Seller UPI ID
                                  </p>

                                  <button
                                    type="button"
                                    onClick={async () => {

                                      try {

                                        await copyText(
                                          upiId
                                        );

                                        setSuccess(
                                          `UPI ID copied: ${upiId}`
                                        );

                                        setError(
                                          ""
                                        );

                                      } catch {

                                        setError(
                                          "Unable to copy the UPI ID."
                                        );

                                      }

                                    }}
                                    className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-black text-cyan-200"
                                  >
                                    Copy UPI ID
                                  </button>

                                </div>

                                <p className="mt-2 break-all font-bold text-cyan-200">
                                  {
                                    upiId
                                  }
                                </p>

                              </div>

                            )}

                            {/* ---------------------------------------------- */}
                            {/* INVALID UPI ID                                  */}
                            {/* ---------------------------------------------- */}

                            {upiId &&
                              !validUpiId && (

                                <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">

                                  <p className="text-sm font-black text-amber-200">
                                    Seller UPI ID is invalid.
                                  </p>

                                  <p className="mt-2 text-xs leading-5 text-amber-100/70">
                                    Configure the seller's real UPI ID in the
                                    format name@bankhandle, or upload the
                                    official UPI QR image in the seller
                                    payment settings.
                                  </p>

                                </div>

                              )}

                            {/* ---------------------------------------------- */}
                            {/* OPEN UPI APP                                    */}
                            {/* ---------------------------------------------- */}

                            {upiLink && (

                              <button
                                type="button"
                                onClick={() =>
                                  openUpiPayment(
                                    upiLink
                                  )
                                }
                                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300 sm:w-auto"
                              >
                                Open UPI App &amp; Pay
                              </button>

                            )}

                            {/* ---------------------------------------------- */}
                            {/* SECONDARY UPI LINK                             */}
                            {/* ---------------------------------------------- */}

                            {upiLink && (

                              <a
                                href={
                                  upiLink
                                }
                                className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-emerald-300/30 px-5 py-3 font-black text-emerald-300 transition hover:bg-emerald-300/10 sm:w-auto"
                              >
                                Open UPI Payment Link
                              </a>

                            )}

                            {/* ---------------------------------------------- */}
                            {/* PAYMENT INSTRUCTIONS                           */}
                            {/* ---------------------------------------------- */}

                            <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.03] p-4">

                              <p className="text-sm font-black text-cyan-100">
                                Payment instructions
                              </p>

                              <div className="mt-3 space-y-2 text-xs leading-5 text-white/50">

                                <p>
                                  1. Scan the QR with your UPI application.
                                </p>

                                <p>
                                  2. Confirm the seller name and amount.
                                </p>

                                <p>
                                  3. Complete the payment using your UPI PIN.
                                </p>

                                <p>
                                  4. Copy the UTR / transaction reference from
                                  your successful UPI transaction.
                                </p>

                                <p>
                                  5. Enter the UTR below and submit it for seller verification.
                                </p>

                              </div>

                            </div>

                            {/* ---------------------------------------------- */}
                            {/* UTR                                             */}
                            {/* ---------------------------------------------- */}

                            <div className="mt-6">

                              <label className="text-sm font-bold text-white/70">
                                UTR / Transaction Reference
                              </label>

                              <input
                                value={
                                  utrByPayment[
                                    paymentId
                                  ] ??
                                  payment.transactionReference ??
                                  ""
                                }
                                disabled={
                                  isPaid ||
                                  isSubmitted ||
                                  submittingId ===
                                    paymentId
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateUtr(
                                    paymentId,
                                    event
                                      .target
                                      .value
                                  )
                                }
                                placeholder="Enter UTR after successful payment"
                                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/20 disabled:opacity-50"
                              />

                              {/* -------------------------------------------- */}
                              {/* PAID                                             */}
                              {/* -------------------------------------------- */}

                              {isPaid && (

                                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">

                                  <p className="text-sm font-bold text-emerald-300">
                                    Payment verified by seller.
                                  </p>

                                  {payment.transactionReference && (

                                    <p className="mt-2 break-all text-xs text-white/50">
                                      UTR:{" "}
                                      {
                                        payment.transactionReference
                                      }
                                    </p>

                                  )}

                                </div>

                              )}

                              {/* -------------------------------------------- */}
                              {/* SUBMITTED                                      */}
                              {/* -------------------------------------------- */}

                              {isSubmitted && (

                                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4">

                                  <p className="text-sm font-bold text-amber-300">
                                    Payment reference submitted. Waiting for seller verification.
                                  </p>

                                  {payment.transactionReference && (

                                    <p className="mt-2 break-all text-xs text-white/50">
                                      UTR:{" "}
                                      {
                                        payment.transactionReference
                                      }
                                    </p>

                                  )}

                                </div>

                              )}

                              {/* -------------------------------------------- */}
                              {/* SUBMIT BUTTON                                  */}
                              {/* -------------------------------------------- */}

                              {!isPaid &&
                                !isSubmitted && (

                                  <button
                                    type="button"
                                    onClick={() =>
                                      submitPaymentReference(
                                        payment
                                      )
                                    }
                                    disabled={
                                      submittingId ===
                                      paymentId
                                    }
                                    className="mt-4 rounded-2xl bg-cyan-300 px-5 py-3 font-black text-slate-950 disabled:opacity-50"
                                  >
                                    {submittingId ===
                                    paymentId
                                      ? "Submitting..."
                                      : "I Paid — Submit UTR"}
                                  </button>

                                )}

                            </div>

                          </div>

                        </div>

                      </section>
                    );
                  }
                )}

              </div>

            </>

          )}

          {/* ============================================================ */}
          {/* WAITING STATUS                                                */}
          {/* ============================================================ */}

          {!allPaid &&
            pendingPayments.length ===
              0 && (

              <p className="mt-8 text-center text-sm text-white/40">
                Waiting for seller payment status updates...
              </p>

            )}

        </div>

      </main>

    </div>
  );
}