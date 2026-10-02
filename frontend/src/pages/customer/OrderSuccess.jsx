import { Link, useLocation, useParams } from "react-router-dom";

export default function OrderSuccess() {
  const { orderId } = useParams();

  const location = useLocation();

  const order = location.state?.order;

  const paymentPaid =
    order?.paymentStatus === "paid";

  const orderStatus =
    String(
      order?.orderStatus || "confirmed"
    )
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (letter) => letter.toUpperCase()
      );

  const paymentText = paymentPaid
    ? "Paid"
    : order?.paymentMethod === "cod"
    ? "Cash on Delivery"
    : "Pending";

  const totalAmount =
    order?.totalAmount !== undefined
      ? Number(order.totalAmount) || 0
      : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020706] text-white">
      {/* ============================================================ */}
      {/* FUTURE AMBIENT LIGHT                                        */}
      {/* ============================================================ */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-emerald-400/10 blur-[150px]" />

        <div className="absolute right-[-180px] top-[10%] h-[560px] w-[560px] rounded-full bg-cyan-400/8 blur-[150px]" />

        <div className="absolute bottom-[-220px] left-[30%] h-[520px] w-[520px] rounded-full bg-violet-400/7 blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "46px 46px"
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,.9) 1px, transparent 0)",
            backgroundSize: "24px 24px"
          }}
        />
      </div>

      {/* ============================================================ */}
      {/* TOP LIGHT LINE                                               */}
      {/* ============================================================ */}

      <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-px bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent" />

      {/* ============================================================ */}
      {/* MAIN                                                          */}
      {/* ============================================================ */}

      <main className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl">
          {/* ======================================================== */}
          {/* SUCCESS CORE                                             */}
          {/* ======================================================== */}

          <section className="relative overflow-hidden rounded-[42px] border border-emerald-300/10 bg-white/[0.035] p-6 shadow-[0_35px_140px_rgba(0,0,0,0.48)] backdrop-blur-2xl sm:p-8 lg:p-12">
            {/* CORE GLOW */}

            <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[110px]" />

            <div className="pointer-events-none absolute -right-32 -top-32 h-[320px] w-[320px] rounded-full bg-cyan-400/8 blur-[100px]" />

            <div className="relative">
              {/* BRAND */}

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.28em] text-emerald-300/45">
                    RuralFresh / Commerce
                  </p>

                  <p className="mt-1 text-sm font-black text-white/75">
                    Secure transaction node
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-emerald-300/10 bg-emerald-400/[0.04] px-3 py-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />

                    <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_15px_rgba(110,231,183,1)]" />
                  </span>

                  <span className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-300">
                    Confirmed
                  </span>
                </div>
              </div>

              {/* ==================================================== */}
              {/* SUCCESS ICON                                          */}
              {/* ==================================================== */}

              <div className="mt-10 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse rounded-[34px] bg-emerald-400/15 blur-2xl" />

                  <div className="relative flex h-28 w-28 items-center justify-center rounded-[34px] border border-emerald-300/20 bg-emerald-400/[0.08] shadow-[0_0_50px_rgba(52,211,153,0.16)]">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[27px] border border-emerald-300/20 bg-emerald-300 text-4xl font-black text-[#032018] shadow-[0_0_40px_rgba(110,231,183,0.38)]">
                      ✓
                    </div>
                  </div>
                </div>
              </div>

              {/* ==================================================== */}
              {/* SUCCESS MESSAGE                                       */}
              {/* ==================================================== */}

              <div className="mx-auto mt-9 max-w-2xl text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-300/45">
                  Transaction accepted
                </p>

                <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                  Order placed
                  <span className="text-emerald-300">
                    {" "}
                    successfully.
                  </span>
                </h1>

                <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/30">
                  Thank you for shopping with RuralFresh.
                  Your order has entered the marketplace
                  fulfilment network.
                </p>
              </div>

              {/* ==================================================== */}
              {/* ORDER ID                                              */}
              {/* ==================================================== */}

              {order?.orderNumber && (
                <div className="mx-auto mt-9 max-w-2xl rounded-[26px] border border-white/8 bg-white/[0.025] p-5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                    Order identity
                  </p>

                  <p className="mt-2 font-mono text-xl font-black tracking-wide text-cyan-300 sm:text-2xl">
                    {order.orderNumber}
                  </p>

                  <p className="mt-2 text-[9px] uppercase tracking-[0.14em] text-white/20">
                    Reference ID
                  </p>
                </div>
              )}

              {/* ==================================================== */}
              {/* ORDER TELEMETRY                                       */}
              {/* ==================================================== */}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <InfoCard
                  label="Order status"
                  value={orderStatus}
                  icon="↗"
                  tone="cyan"
                />

                <InfoCard
                  label="Payment"
                  value={paymentText}
                  icon={paymentPaid ? "✓" : "₹"}
                  tone={paymentPaid ? "emerald" : "amber"}
                />
              </div>

              {/* ==================================================== */}
              {/* TOTAL                                                  */}
              {/* ==================================================== */}

              {totalAmount !== null && (
                <div className="mt-5 overflow-hidden rounded-[28px] border border-emerald-300/10 bg-gradient-to-br from-emerald-400/[0.08] via-white/[0.025] to-transparent p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300/45">
                        Commerce value
                      </p>

                      <p className="mt-2 text-sm font-bold text-white/40">
                        Total amount recorded for this order
                      </p>
                    </div>

                    <p className="text-3xl font-black tracking-[-0.04em] text-emerald-300 sm:text-4xl">
                      ₹
                      {totalAmount.toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* PAYMENT SIGNAL                                        */}
              {/* ==================================================== */}

              <div className="mt-5 rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.05] text-lg text-cyan-300">
                    ◇
                  </div>

                  <div>
                    <p className="text-xs font-black text-white/75">
                      Fulfilment network activated
                    </p>

                    <p className="mt-2 text-[10px] leading-5 text-white/25">
                      Your order is now available in the
                      RuralFresh commerce system. You can
                      monitor its progress from the order
                      details interface.
                    </p>
                  </div>
                </div>
              </div>

              {/* ==================================================== */}
              {/* ACTIONS                                                */}
              {/* ==================================================== */}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  to={`/orders/${orderId}`}
                  className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-7 py-3.5 text-sm font-black text-white shadow-[0_15px_40px_rgba(16,185,129,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-[0_20px_55px_rgba(16,185,129,0.28)]"
                >
                  <span>
                    View Order
                  </span>

                  <span className="transition group-hover:translate-x-1">
                    →
                  </span>
                </Link>

                <Link
                  to="/products"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-7 py-3.5 text-sm font-black text-white/65 transition duration-300 hover:border-cyan-300/20 hover:bg-cyan-400/[0.04] hover:text-cyan-300"
                >
                  Continue Shopping
                </Link>
              </div>

              {/* ==================================================== */}
              {/* FOOTER                                                 */}
              {/* ==================================================== */}

              <div className="mt-9 border-t border-white/6 pt-6 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/15">
                  RuralFresh • Secure Commerce • Live Fulfilment
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INFO CARD
|--------------------------------------------------------------------------
*/

function InfoCard({
  label,
  value,
  icon,
  tone
}) {
  const tones = {
    cyan:
      "border-cyan-300/10 bg-cyan-400/[0.04] text-cyan-300",

    emerald:
      "border-emerald-300/10 bg-emerald-400/[0.04] text-emerald-300",

    amber:
      "border-amber-300/10 bg-amber-400/[0.04] text-amber-300"
  };

  return (
    <div
      className={`rounded-[26px] border p-5 ${
        tones[tone] ||
        "border-white/10 bg-white/[0.025] text-white"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.18em] opacity-40">
            {label}
          </p>

          <p className="mt-3 text-lg font-black text-white">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.045] text-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}