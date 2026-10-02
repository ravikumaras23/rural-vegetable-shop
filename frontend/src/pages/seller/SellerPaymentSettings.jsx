import {
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

  const isFormData =
    options.body instanceof
    FormData;

  let response;

  try {
    response =
      await fetch(
        `${API_URL}${url}`,
        {
          ...options,

          headers: {
            ...(isFormData
              ? {}
              : {
                  "Content-Type":
                    "application/json"
                }),

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`
                }
              : {}),

            ...(options.headers ||
              {})
          }
        }
      );
  } catch {
    throw new Error(
      "Unable to connect to the backend."
    );
  }

  const data =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (
    !response.ok
  ) {
    throw new Error(
      data.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

const EMPTY_SETTINGS = {
  razorpayEnabled: true,
  qrEnabled: true,
  defaultMethod:
    "razorpay",
  upiId: "",
  qrCodeUrl: "",
  qrCodePublicId: "",
  razorpayKeyId: "",
  razorpaySecretConfigured:
    false
};

export default function SellerPaymentSettings() {
  const [
    settings,
    setSettings
  ] = useState(
    EMPTY_SETTINGS
  );

  const [
    secret,
    setSecret
  ] = useState("");

  const [
    file,
    setFile
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    uploading,
    setUploading
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState("");

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadSettings =
      async () => {
        try {
          setError("");

          const response =
            await request(
              "/api/seller/payment-settings"
            );

          if (mounted) {
            setSettings({
              ...EMPTY_SETTINGS,
              ...(response.data ||
                {})
            });
          }
        } catch (err) {
          if (mounted) {
            setError(
              err.message ||
                "Unable to load payment settings."
            );
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const changeSetting =
    (field) =>
    (event) => {
      const value =
        event.target.type ===
        "checkbox"
          ? event.target.checked
          : event.target.value;

      setSettings(
        (current) => ({
          ...current,
          [field]: value
        })
      );
    };

  const save =
    async (event) => {
      event.preventDefault();

      try {
        setSaving(true);
        setError("");
        setMessage("");

        if (
          !settings.razorpayEnabled &&
          !settings.qrEnabled
        ) {
          throw new Error(
            "At least one payment method must be enabled."
          );
        }

        if (
          settings.defaultMethod ===
            "razorpay" &&
          !settings.razorpayEnabled
        ) {
          throw new Error(
            "Enable Razorpay or choose Seller QR as the default method."
          );
        }

        if (
          settings.defaultMethod ===
            "seller_qr" &&
          !settings.qrEnabled
        ) {
          throw new Error(
            "Enable Seller QR or choose Razorpay as the default method."
          );
        }

        const payload = {
          razorpayEnabled:
            Boolean(
              settings.razorpayEnabled
            ),

          qrEnabled:
            Boolean(
              settings.qrEnabled
            ),

          defaultMethod:
            settings.defaultMethod,

          upiId:
            String(
              settings.upiId || ""
            ).trim(),

          razorpayKeyId:
            String(
              settings.razorpayKeyId ||
                ""
            ).trim()
        };

        /*
         * Only send a new secret when the
         * seller actually entered one.
         */
        if (
          secret.trim()
        ) {
          payload.razorpayKeySecret =
            secret.trim();
        }

        const response =
          await request(
            "/api/seller/payment-settings",
            {
              method: "PUT",

              body:
                JSON.stringify(
                  payload
                )
            }
          );

        setSettings(
          (current) => ({
            ...current,
            ...(response.data ||
              {})
          })
        );

        setSecret("");

        setMessage(
          "Payment settings saved successfully."
        );
      } catch (err) {
        setError(
          err.message ||
            "Unable to save payment settings."
        );
      } finally {
        setSaving(false);
      }
    };

  const upload =
    async () => {
      if (!file) {
        setError(
          "Select a QR image first."
        );

        return;
      }

      try {
        setUploading(true);
        setError("");
        setMessage("");

        const formData =
          new FormData();

        formData.append(
          "qr",
          file
        );

        const response =
          await request(
            "/api/seller/payment-settings/qr",
            {
              method: "POST",
              body: formData
            }
          );

        setSettings(
          (current) => ({
            ...current,

            ...(response.data ||
              {})
          })
        );

        setMessage(
          "QR uploaded successfully."
        );

        setFile(null);
      } catch (err) {
        setError(
          err.message ||
            "Unable to upload QR."
        );
      } finally {
        setUploading(false);
      }
    };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030807] p-10 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <p className="font-black text-emerald-300">
            Loading payment settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030807] text-white">
      <main className="mx-auto max-w-5xl px-5 py-8">

        <h1 className="text-4xl font-black">
          Payment Settings
        </h1>

        <p className="mt-2 text-sm text-white/35">
          Configure Razorpay and Seller QR/UPI payments.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {message}
          </div>
        )}

        <form
          onSubmit={save}
          className="mt-8 space-y-6"
        >

          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">
            <h2 className="text-2xl font-black">
              Payment methods
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">

              <label className="flex gap-3 rounded-2xl border border-white/10 p-5">
                <input
                  type="checkbox"
                  checked={
                    settings.razorpayEnabled
                  }
                  onChange={changeSetting(
                    "razorpayEnabled"
                  )}
                />

                <div>
                  <p className="font-black">
                    Razorpay
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    Customers can pay online through Razorpay.
                  </p>
                </div>
              </label>

              <label className="flex gap-3 rounded-2xl border border-white/10 p-5">
                <input
                  type="checkbox"
                  checked={
                    settings.qrEnabled
                  }
                  onChange={changeSetting(
                    "qrEnabled"
                  )}
                />

                <div>
                  <p className="font-black">
                    Seller QR
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    Customers can pay directly to your UPI account.
                  </p>
                </div>
              </label>

            </div>

            <label className="mt-5 block text-sm font-bold text-white/60">
              Default method

              <select
                value={
                  settings.defaultMethod
                }
                onChange={changeSetting(
                  "defaultMethod"
                )}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              >
                <option value="razorpay">
                  Razorpay
                </option>

                <option value="seller_qr">
                  Seller QR
                </option>
              </select>
            </label>

          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">

            <h2 className="text-2xl font-black">
              UPI QR
            </h2>

            <label className="mt-5 block text-sm font-bold text-white/60">
              UPI ID

              <input
                value={
                  settings.upiId
                }
                onChange={changeSetting(
                  "upiId"
                )}
                placeholder="name@bank"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              />
            </label>

            {settings.qrCodeUrl && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-white/35">
                  Current QR
                </p>

                <img
                  src={
                    settings.qrCodeUrl
                  }
                  alt="Seller UPI QR"
                  className="h-64 w-64 rounded-2xl bg-white p-3 object-contain"
                />
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  setFile(
                    event.target
                      .files?.[0] ||
                      null
                  )
                }
                className="text-sm text-white/50"
              />

              <button
                type="button"
                onClick={upload}
                disabled={
                  uploading
                }
                className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
              >
                {uploading
                  ? "Uploading..."
                  : "Upload QR"}
              </button>

            </div>

            <p className="mt-3 text-xs leading-5 text-white/25">
              Use a clear official UPI QR image. The uploaded image is stored in Cloudinary.
            </p>

          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">

            <h2 className="text-2xl font-black">
              Seller Razorpay
            </h2>

            <label className="mt-5 block text-sm font-bold text-white/60">
              Key ID

              <input
                value={
                  settings.razorpayKeyId
                }
                onChange={changeSetting(
                  "razorpayKeyId"
                )}
                placeholder="rzp_..."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              />
            </label>

            <label className="mt-5 block text-sm font-bold text-white/60">
              Key Secret

              <input
                type="password"
                value={secret}
                onChange={(event) =>
                  setSecret(
                    event.target.value
                  )
                }
                placeholder={
                  settings.razorpaySecretConfigured
                    ? "Enter a new secret to replace the current one"
                    : "Enter Razorpay secret"
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              />
            </label>

            <div className="mt-3 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.03] p-4">
              <p className="text-xs font-black text-emerald-300">
                Secret protection
              </p>

              <p className="mt-2 text-xs leading-5 text-white/30">
                The Razorpay secret is encrypted on the server and is never returned to the browser.
              </p>
            </div>

            {settings.razorpaySecretConfigured && (
              <p className="mt-4 text-xs font-bold text-emerald-300">
                ✓ Razorpay secret is configured.
              </p>
            )}

          </section>

          <button
            type="submit"
            disabled={
              saving
            }
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-300 px-6 py-4 font-black text-slate-950 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save Payment Settings"}
          </button>

        </form>
      </main>
    </div>
  );
}