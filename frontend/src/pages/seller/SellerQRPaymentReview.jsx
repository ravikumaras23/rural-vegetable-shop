import {
  useCallback,
  useEffect,
  useState
} from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

async function request(
  url,
  options = {}
) {
  const token =
    localStorage.getItem(
      "token"
    );

  if (!token) {
    throw new Error(
      "Please login."
    );
  }

  const response =
    await fetch(
      `${API_URL}${url}`,
      {
        ...options,

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,

          ...(options.headers ||
            {})
        },

        cache:
          "no-store"
      }
    );

  const data =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Request failed"
    );
  }

  return data;
}

export default function SellerQRPaymentReview() {
  const [
    payments,
    setPayments
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState("");

  const [
    busy,
    setBusy
  ] = useState("");

  const [
    rejectReasons,
    setRejectReasons
  ] = useState({});

  const load =
    useCallback(
      async () => {
        try {
          const response =
            await request(
              "/api/seller/qr-payments"
            );

          setPayments(
            Array.isArray(
              response.data
            )
              ? response.data
              : []
          );

          setError("");
        } catch (err) {
          setError(
            err.message ||
              "Unable to load seller payments."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    load();

    const timer =
      setInterval(
        load,
        3000
      );

    return () =>
      clearInterval(
        timer
      );
  }, [load]);

  const verify =
    async (
      item
    ) => {
      const orderId =
        String(
          item.orderId
        );

      const paymentId =
        String(
          item.sellerPayment?._id ||
            ""
        );

      if (!paymentId) {
        setError(
          "Seller payment ID is missing."
        );

        return;
      }

      try {
        setBusy(
          `${orderId}-${paymentId}-verify`
        );

        setError("");

        await request(
          `/api/seller/qr-payments/${orderId}/${paymentId}/verify`,
          {
            method:
              "POST"
          }
        );

        await load();
      } catch (err) {
        setError(
          err.message ||
            "Unable to verify payment."
        );
      } finally {
        setBusy("");
      }
    };

  const reject =
    async (
      item
    ) => {
      const orderId =
        String(
          item.orderId
        );

      const paymentId =
        String(
          item.sellerPayment?._id ||
            ""
        );

      const rejectionReason =
        String(
          rejectReasons[
            paymentId
          ] || ""
        ).trim();

      if (!rejectionReason) {
        setError(
          "Enter a rejection reason."
        );

        return;
      }

      try {
        setBusy(
          `${orderId}-${paymentId}-reject`
        );

        setError("");

        await request(
          `/api/seller/qr-payments/${orderId}/${paymentId}/reject`,
          {
            method:
              "POST",

            body:
              JSON.stringify({
                rejectionReason
              })
          }
        );

        await load();
      } catch (err) {
        setError(
          err.message ||
            "Unable to reject payment."
        );
      } finally {
        setBusy("");
      }
    };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
        <p className="text-lg font-black text-gray-700">
          Loading seller payments...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-3xl font-black text-gray-900">
            Seller QR Payment Verification
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Verify customer UTRs before the order becomes fully paid.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {payments.length ===
        0 ? (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
            No pending seller QR payments.
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {payments.map(
              (
                item
              ) => {
                const payment =
                  item.sellerPayment;

                const paymentId =
                  String(
                    payment._id
                  );

                const verifyKey =
                  `${item.orderId}-${paymentId}-verify`;

                const rejectKey =
                  `${item.orderId}-${paymentId}-reject`;

                return (
                  <div
                    key={
                      verifyKey
                    }
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Order
                        </p>

                        <p className="mt-1 text-xl font-black text-gray-900">
                          {
                            item.orderNumber
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Seller Payment
                        </p>

                        <p className="mt-1 text-xl font-black text-emerald-600">
                          ₹
                          {Number(
                            payment.amount ||
                              0
                          ).toFixed(
                            2
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs text-gray-400">
                          Status
                        </p>

                        <p className="mt-1 font-bold capitalize text-gray-900">
                          {
                            payment.status
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs text-gray-400">
                          UPI ID
                        </p>

                        <p className="mt-1 break-all font-bold text-gray-900">
                          {
                            payment.upiIdSnapshot ||
                            "QR only"
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs text-gray-400">
                          UTR / Transaction Reference
                        </p>

                        <p className="mt-1 break-all font-bold text-gray-900">
                          {
                            payment.transactionReference ||
                            "Not submitted"
                          }
                        </p>
                      </div>
                    </div>

                    {payment.qrImageSnapshot && (
                      <div className="mt-5">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                          Seller QR
                        </p>

                        <img
                          src={
                            payment.qrImageSnapshot
                          }
                          alt="Seller QR"
                          className="h-32 w-32 rounded-xl border border-gray-200 object-contain"
                        />
                      </div>
                    )}

                    {payment.status ===
                      "submitted" && (
                      <div className="mt-6">
                        <label className="text-sm font-bold text-gray-700">
                          Rejection reason
                        </label>

                        <input
                          value={
                            rejectReasons[
                              paymentId
                            ] ??
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            setRejectReasons(
                              (
                                current
                              ) => ({
                                ...current,

                                [paymentId]:
                                  event
                                    .target
                                    .value
                              })
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                          placeholder="Enter reason only when payment cannot be verified"
                        />

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              verify(
                                item
                              )
                            }
                            disabled={
                              busy ===
                              verifyKey
                            }
                            className="rounded-xl bg-emerald-500 px-5 py-3 font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busy ===
                            verifyKey
                              ? "Verifying..."
                              : "Verify Payment"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              reject(
                                item
                              )
                            }
                            disabled={
                              busy ===
                              rejectKey
                            }
                            className="rounded-xl bg-red-500 px-5 py-3 font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busy ===
                            rejectKey
                              ? "Rejecting..."
                              : "Reject Payment"}
                          </button>
                        </div>
                      </div>
                    )}

                    {payment.status ===
                      "pending" && (
                      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                        Waiting for the customer to submit the UTR / transaction reference.
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}