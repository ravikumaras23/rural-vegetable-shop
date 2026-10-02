import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link,
  useNavigate
} from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const getToken =
  () =>
    localStorage.getItem(
      "token"
    );

async function request(
  url,
  options = {}
) {
  const token =
    getToken();

  if (!token) {
    throw new Error(
      "Please login before continuing."
    );
  }

  const response =
    await fetch(
      `${API_URL}${url}`,
      {
        ...options,

        headers: {
          ...(options.body instanceof
          FormData
            ? {}
            : {
                "Content-Type":
                  "application/json"
              }),

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

  if (
    !response.ok
  ) {
    const error =
      new Error(
        data.message ||
          "Request failed"
      );

    error.status =
      response.status;

    error.canFallbackToQr =
      data.canFallbackToQr ||
      false;

    throw error;
  }

  return data;
}

const initialAddress = {
  name: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  village: "",
  district: "",
  state: "",
  pincode: ""
};

export default function Checkout() {
  const navigate =
    useNavigate();

  const [
    cart,
    setCart
  ] =
    useState({
      items: []
    });

  const [
    address,
    setAddress
  ] =
    useState(
      initialAddress
    );

  const [
    paymentMethod,
    setPaymentMethod
  ] =
    useState(
      "razorpay"
    );

  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    placing,
    setPlacing
  ] =
    useState(false);

  const [
    error,
    setError
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD CART
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      if (!getToken()) {
        navigate(
          "/login",
          {
            replace:
              true
          }
        );

        return;
      }

      const load =
        async () => {
          try {
            const response =
              await request(
                "/api/cart"
              );

            const loaded =
              response.data ||
              {
                items: []
              };

            if (
              !loaded.items?.length
            ) {
              navigate(
                "/cart",
                {
                  replace:
                    true
                }
              );

              return;
            }

            setCart(
              loaded
            );
          } catch (err) {
            setError(
              err.message
            );
          } finally {
            setLoading(false);
          }
        };

      load();
    },
    [navigate]
  );

  /*
  |--------------------------------------------------------------------------
  | TOTALS
  |--------------------------------------------------------------------------
  */

  const subtotal =
    useMemo(
      () =>
        (
          cart.items ||
          []
        ).reduce(
          (
            sum,
            item
          ) => {
            if (
              !item.product
            ) {
              return sum;
            }

            return (
              sum +
              Number(
                item.product.price ||
                  0
              ) *
                Number(
                  item.quantity ||
                    0
                )
            );
          },
          0
        ),
      [cart]
    );

  const deliveryCharge =
    subtotal >=
    500
      ? 0
      : subtotal >
        0
      ? 40
      : 0;

  const total =
    subtotal +
    deliveryCharge;

  /*
  |--------------------------------------------------------------------------
  | ADDRESS
  |--------------------------------------------------------------------------
  */

  const changeAddress =
    (
      event
    ) => {
      const {
        name,
        value
      } =
        event.target;

      setAddress(
        (
          current
        ) => ({
          ...current,

          [name]:
            value
        })
      );
    };

  const validate =
    () => {
      for (
        const field of [
          "name",
          "phone",
          "addressLine1",
          "pincode"
        ]
      ) {
        if (
          !String(
            address[field] ||
              ""
          ).trim()
        ) {
          return `${field} is required`;
        }
      }

      if (
        !/^[6-9][0-9]{9}$/.test(
          address.phone.trim()
        )
      ) {
        return "Enter a valid Indian mobile number";
      }

      if (
        !/^[0-9]{6}$/.test(
          address.pincode.trim()
        )
      ) {
        return "Enter a valid 6-digit pincode";
      }

      return null;
    };

  /*
  |--------------------------------------------------------------------------
  | RAZORPAY SCRIPT
  |--------------------------------------------------------------------------
  */

  const loadRazorpay =
    () =>
      new Promise(
        (
          resolve
        ) => {
          if (
            window.Razorpay
          ) {
            resolve(true);

            return;
          }

          const existing =
            document.querySelector(
              'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
            );

          if (
            existing
          ) {
            existing.onload =
              () =>
                resolve(
                  true
                );

            existing.onerror =
              () =>
                resolve(
                  false
                );

            return;
          }

          const script =
            document.createElement(
              "script"
            );

          script.src =
            "https://checkout.razorpay.com/v1/checkout.js";

          script.async =
            true;

          script.onload =
            () =>
              resolve(
                true
              );

          script.onerror =
            () =>
              resolve(
                false
              );

          document.body.appendChild(
            script
          );
        }
      );

  /*
  |--------------------------------------------------------------------------
  | RAZORPAY FLOW
  |--------------------------------------------------------------------------
  */

  const payWithRazorpay =
    async (
      order
    ) => {
      const loaded =
        await loadRazorpay();

      if (
        !loaded
      ) {
        throw new Error(
          "Razorpay checkout could not be loaded"
        );
      }

      const gateway =
        await request(
          `/api/payments/razorpay/order/${order._id}`,
          {
            method:
              "POST"
          }
        );

      const data =
        gateway.data;

      if (
        !data?.keyId ||
        !data?.razorpayOrderId
      ) {
        throw new Error(
          "Razorpay order information is incomplete"
        );
      }

      return new Promise(
        (
          resolve,
          reject
        ) => {
          let finished =
            false;

          const rzp =
            new window.Razorpay(
              {
                key:
                  data.keyId,

                amount:
                  data.amount,

                currency:
                  data.currency ||
                  "INR",

                name:
                  "RuralFresh",

                description:
                  `Payment for ${order.orderNumber}`,

                order_id:
                  data.razorpayOrderId,

                prefill: {
                  name:
                    address.name,

                  contact:
                    address.phone
                },

                theme: {
                  color:
                    "#34d399"
                },

                handler:
                  async (
                    response
                  ) => {
                    if (
                      finished
                    ) {
                      return;
                    }

                    try {
                      const verified =
                        await request(
                          "/api/payments/razorpay/verify",
                          {
                            method:
                              "POST",

                            body:
                              JSON.stringify(
                                {
                                  razorpay_order_id:
                                    response.razorpay_order_id,

                                  razorpay_payment_id:
                                    response.razorpay_payment_id,

                                  razorpay_signature:
                                    response.razorpay_signature
                                }
                              )
                          }
                        );

                      finished =
                        true;

                      resolve(
                        verified.data
                      );
                    } catch (
                      err
                    ) {
                      finished =
                        true;

                      reject(
                        err
                      );
                    }
                  },

                modal: {
                  ondismiss:
                    () => {
                      if (
                        !finished
                      ) {
                        reject(
                          new Error(
                            "Payment window was closed."
                          )
                        );
                      }
                    }
                }
              }
            );

          rzp.on(
            "payment.failed",
            (
              response
            ) => {
              if (
                finished
              ) {
                return;
              }

              finished =
                true;

              reject(
                new Error(
                  response.error
                    ?.description ||
                    "Razorpay payment failed"
                )
              );
            }
          );

          rzp.open();
        }
      );
    };

  /*
  |--------------------------------------------------------------------------
  | PLACE ORDER
  |--------------------------------------------------------------------------
  */

  const placeOrder =
    async (
      event
    ) => {
      event.preventDefault();

      setError("");

      const validation =
        validate();

      if (
        validation
      ) {
        setError(
          validation
        );

        return;
      }

      try {
        setPlacing(
          true
        );

        const response =
          await request(
            "/api/orders",
            {
              method:
                "POST",

              body:
                JSON.stringify(
                  {
                    shippingAddress:
                      address,

                    paymentMethod
                  }
                )
            }
          );

        const order =
          response.data;

        if (
          !order?._id
        ) {
          throw new Error(
            "Order was not created"
          );
        }

        /*
        |--------------------------------------------------------------------------
        | COD
        |--------------------------------------------------------------------------
        */

        if (
          paymentMethod ===
          "cod"
        ) {
          navigate(
            `/order-success/${order._id}`,
            {
              replace:
                true,

              state: {
                order
              }
            }
          );

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | SELLER QR
        |--------------------------------------------------------------------------
        */

        if (
          paymentMethod ===
          "seller_qr"
        ) {
          navigate(
            `/qr-payment/${order._id}`,
            {
              replace:
                true,
              state: {
                fromCart: true,
                orderId: order._id
              }
            }
          );

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | RAZORPAY
        |--------------------------------------------------------------------------
        */

        try {
          const verified =
            await payWithRazorpay(
              order
            );

          navigate(
            `/order-success/${order._id}`,
            {
              replace:
                true,

              state: {
                order: {
                  ...order,

                  paymentStatus:
                    verified?.paymentStatus ||
                    "paid",

                  orderStatus:
                    verified?.orderStatus ||
                    "confirmed"
                }
              }
            }
          );
        } catch (
          razorpayError
        ) {
          /*
          |--------------------------------------------------------------------------
          | IMPORTANT FALLBACK
          |--------------------------------------------------------------------------
          |
          | DO NOT create another order.
          |
          | The same order still owns the inventory reservation.
          |--------------------------------------------------------------------------
          */

          setError(
            `Razorpay unavailable: ${razorpayError.message}`
          );

          navigate(
            `/qr-payment/${order._id}`,
            {
              replace:
                false,

              state: {
                fallbackFromRazorpay:
                  true
              }
            }
          );
        }
      } catch (
        err
      ) {
        console.error(
          "Checkout error:",
          err
        );

        setError(
          err.message
        );
      } finally {
        setPlacing(
          false
        );
      }
    };

  if (
    loading
  ) {
    return (
      <div className="min-h-screen bg-[#030807] p-10 text-center text-white">
        Loading secure checkout...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030807] text-white">

      <header className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div>
            <p className="text-xl font-black text-emerald-300">
              RuralFresh
            </p>

            <p className="text-xs text-white/35">
              Secure Checkout
            </p>
          </div>

          <Link
            to="/cart"
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/60"
          >
            ← Cart
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">

        <h1 className="text-4xl font-black">
          Complete your order
        </h1>

        <p className="mt-2 text-sm text-white/35">
          Choose your preferred payment method.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <form
          onSubmit={
            placeOrder
          }
          className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]"
        >

          <section className="space-y-6">

            <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">
              <h2 className="text-2xl font-black">
                Delivery Address
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">

                {[
                  [
                    "name",
                    "Full Name"
                  ],

                  [
                    "phone",
                    "Phone Number"
                  ],

                  [
                    "addressLine1",
                    "Address"
                  ],

                  [
                    "addressLine2",
                    "Address Line 2"
                  ],

                  [
                    "village",
                    "Village"
                  ],

                  [
                    "district",
                    "District"
                  ],

                  [
                    "state",
                    "State"
                  ],

                  [
                    "pincode",
                    "Pincode"
                  ]
                ].map(
                  ([
                    field,
                    label
                  ]) => (
                    <div
                      key={
                        field
                      }
                      className={
                        field ===
                        "addressLine1"
                          ? "sm:col-span-2"
                          : ""
                      }
                    >
                      <label className="text-sm font-bold text-white/70">
                        {label}
                      </label>

                      <input
                        name={
                          field
                        }
                        value={
                          address[
                            field
                          ]
                        }
                        onChange={
                          changeAddress
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-cyan-300/30"
                      />
                    </div>
                  )
                )}

              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">

              <h2 className="text-2xl font-black">
                Payment Method
              </h2>

              <div className="mt-6 space-y-3">

                <PaymentChoice
                  value="razorpay"
                  selected={
                    paymentMethod ===
                    "razorpay"
                  }
                  onChange={
                    setPaymentMethod
                  }
                  title="Razorpay"
                  description="Online payment. If Razorpay fails, you can continue using seller QR."
                  icon="◈"
                />

                <PaymentChoice
                  value="seller_qr"
                  selected={
                    paymentMethod ===
                    "seller_qr"
                  }
                  onChange={
                    setPaymentMethod
                  }
                  title="Seller QR / UPI"
                  description="Scan the QR displayed for each seller."
                  icon="▣"
                />

                <PaymentChoice
                  value="cod"
                  selected={
                    paymentMethod ===
                    "cod"
                  }
                  onChange={
                    setPaymentMethod
                  }
                  title="Cash on Delivery"
                  description="Pay when your order is delivered."
                  icon="₹"
                />

              </div>
            </div>
          </section>

          <aside className="h-fit rounded-[28px] border border-white/10 bg-white/[0.035] p-6 lg:sticky lg:top-5">

            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300/45">
              Order Summary
            </p>

            <div className="mt-5 space-y-4">

              {cart.items.map(
                (
                  item
                ) => (
                  <div
                    key={
                      item.product
                        ?._id
                    }
                    className="flex justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold">
                        {
                          item.product
                            ?.name
                        }
                      </p>

                      <p className="text-xs text-white/35">
                        {item.quantity} × ₹
                        {Number(
                          item.product
                            ?.price ||
                            0
                        ).toFixed(
                          2
                        )}
                      </p>
                    </div>

                    <p className="text-sm font-black text-emerald-300">
                      ₹
                      {(
                        Number(
                          item.product
                            ?.price ||
                            0
                        ) *
                        Number(
                          item.quantity ||
                            0
                        )
                      ).toFixed(
                        2
                      )}
                    </p>
                  </div>
                )
              )}

            </div>

            <div className="mt-6 border-t border-white/10 pt-5 space-y-3">

              <div className="flex justify-between text-sm text-white/45">
                <span>
                  Subtotal
                </span>

                <span>
                  ₹
                  {subtotal.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex justify-between text-sm text-white/45">
                <span>
                  Delivery
                </span>

                <span>
                  {deliveryCharge ===
                  0
                    ? "FREE"
                    : `₹${deliveryCharge}`}
                </span>
              </div>

              <div className="flex justify-between border-t border-white/10 pt-4">
                <span className="font-black">
                  Total
                </span>

                <span className="text-2xl font-black text-emerald-300">
                  ₹
                  {total.toFixed(
                    2
                  )}
                </span>
              </div>

            </div>

            <button
              type="submit"
              disabled={
                placing
              }
              className="mt-7 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-300 px-5 py-4 font-black text-slate-950 disabled:opacity-50"
            >
              {placing
                ? "Processing..."
                : paymentMethod ===
                  "razorpay"
                ? "Pay with Razorpay →"
                : paymentMethod ===
                  "seller_qr"
                ? "Continue to Seller QR →"
                : "Place COD Order →"}
            </button>

          </aside>
        </form>
      </main>
    </div>
  );
}

function PaymentChoice({
  value,
  selected,
  onChange,
  title,
  description,
  icon
}) {
  return (
    <label
      className={`flex cursor-pointer gap-4 rounded-2xl border p-5 transition ${
        selected
          ? "border-cyan-300/30 bg-cyan-400/[0.06]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <input
        type="radio"
        name="paymentMethod"
        value={value}
        checked={
          selected
        }
        onChange={() =>
          onChange(
            value
          )
        }
      />

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-cyan-300">
        {icon}
      </div>

      <div>
        <p className="font-black">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-white/35">
          {description}
        </p>
      </div>
    </label>
  );
}