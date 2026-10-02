import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  Link,
  useNavigate
} from "react-router-dom";

import SellerSidebar from "../../components/seller/SellerSidebar.jsx";
import SellerHeader from "../../components/seller/SellerHeader.jsx";

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
| CONSTANTS
|--------------------------------------------------------------------------
*/

const MAX_IMAGES = 5;

const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;

const categories = [
  "Leafy Vegetables",
  "Root Vegetables",
  "Vegetables",
  "Gourds",
  "Beans",
  "Tomatoes",
  "Onions",
  "Potatoes",
  "Other"
];

const units = [
  {
    value: "kg",
    label: "Kilogram",
    short: "kg"
  },
  {
    value: "gram",
    label: "Gram",
    short: "g"
  },
  {
    value: "piece",
    label: "Piece",
    short: "piece"
  },
  {
    value: "bundle",
    label: "Bundle",
    short: "bundle"
  },
  {
    value: "dozen",
    label: "Dozen",
    short: "dozen"
  },
  {
    value: "litre",
    label: "Litre",
    short: "L"
  }
];

const initialForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  unit: "kg",
  stockQuantity: "",
  lowStockThreshold: "10",
  harvestDate: "",
  isOrganic: false
};

/*
|--------------------------------------------------------------------------
| API REQUEST
|--------------------------------------------------------------------------
*/

async function apiRequest(
  endpoint,
  options = {}
) {
  const token =
    localStorage.getItem(
      "token"
    );

  if (!token) {
    throw new Error(
      "Seller authentication token is missing. Please login again."
    );
  }

  const isFormData =
    options.body instanceof
    FormData;

  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,

        headers: {
          ...(isFormData
            ? {}
            : {
                "Content-Type":
                  "application/json"
              }),

          Authorization:
            `Bearer ${token}`,

          ...(options.headers || {})
        },

        cache: "no-store"
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    const error =
      new Error(
        data.message ||
          `Request failed with status ${response.status}`
      );

    error.status =
      response.status;

    error.code =
      data.code;

    throw error;
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| INDIA DATE
|--------------------------------------------------------------------------
*/

function getIndiaDateKey(
  date = new Date()
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(date);
}

/*
|--------------------------------------------------------------------------
| GET HARVEST DATE
|--------------------------------------------------------------------------
*/

function getHarvestDateInfo(
  value
) {
  if (!value) {
    return {
      type: "unset",
      title:
        "Harvest date not set",
      message:
        "Customers will not see a harvest-date notice for this product.",
      icon: "◌",
      wrapper:
        "border-slate-200 bg-slate-50",
      titleClass:
        "text-slate-700",
      textClass:
        "text-slate-500"
    };
  }

  const selected =
    new Date(
      `${value}T00:00:00+05:30`
    );

  if (
    Number.isNaN(
      selected.getTime()
    )
  ) {
    return {
      type: "unset",
      title:
        "Invalid harvest date",
      message:
        "Please choose a valid harvest date.",
      icon: "⚠️",
      wrapper:
        "border-red-200 bg-red-50",
      titleClass:
        "text-red-800",
      textClass:
        "text-red-600"
    };
  }

  const selectedKey =
    getIndiaDateKey(
      selected
    );

  const todayKey =
    getIndiaDateKey();

  if (
    selectedKey ===
    todayKey
  ) {
    return {
      type: "today",
      title:
        "Harvest is today",
      message:
        "This product is scheduled for harvest today.",
      icon: "✅",
      wrapper:
        "border-emerald-200 bg-emerald-50",
      titleClass:
        "text-emerald-800",
      textClass:
        "text-emerald-700"
    };
  }

  if (
    selectedKey >
    todayKey
  ) {
    const [year, month, day] =
      selectedKey
        .split("-")
        .map(Number);

    const display =
      new Date(
        year,
        month - 1,
        day
      ).toLocaleDateString(
        "en-IN",
        {
          day:
            "2-digit",
          month:
            "long",
          year:
            "numeric"
        }
      );

    return {
      type: "future",
      title:
        "Future harvest scheduled",
      message:
        `Harvest is scheduled for ${display}. Customers should see this as a future-freshness product until the harvest date arrives.`,
      icon: "🌱",
      wrapper:
        "border-amber-200 bg-amber-50",
      titleClass:
        "text-amber-800",
      textClass:
        "text-amber-700"
    };
  }

  return {
    type: "past",
    title:
      "Harvest date has passed",
    message:
      "This product has a harvest date in the past.",
    icon: "📅",
    wrapper:
      "border-blue-200 bg-blue-50",
    titleClass:
      "text-blue-800",
    textClass:
      "text-blue-700"
  };
}

/*
|--------------------------------------------------------------------------
| FIELD
|--------------------------------------------------------------------------
*/

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  min,
  max,
  step,
  disabled = false
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SECTION
|--------------------------------------------------------------------------
*/

function Section({
  number,
  eyebrow,
  title,
  description,
  children
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_15px_50px_rgba(15,23,42,0.045)]">

      <div className="flex gap-4 border-b border-slate-100 px-6 py-5 sm:px-7">

        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">
          {number}
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>

      </div>

      <div className="p-6 sm:p-7">
        {children}
      </div>

    </section>
  );
}

/*
|--------------------------------------------------------------------------
| SELLER ADD PRODUCT
|--------------------------------------------------------------------------
*/

export default function SellerAddProduct() {
  const navigate =
    useNavigate();

  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [
    form,
    setForm
  ] = useState(
    initialForm
  );

  const [
    images,
    setImages
  ] = useState([]);

  const [
    previews,
    setPreviews
  ] = useState([]);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const [
    success,
    setSuccess
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | FORM CHANGE
  |--------------------------------------------------------------------------
  */

  const handleChange =
    (event) => {
      const {
        name,
        value,
        type,
        checked
      } =
        event.target;

      setForm(
        (current) => ({
          ...current,

          [name]:
            type ===
            "checkbox"
              ? checked
              : value
        })
      );

      setError("");
      setSuccess("");
    };

  /*
  |--------------------------------------------------------------------------
  | IMAGE SELECTION
  |--------------------------------------------------------------------------
  */

  const handleImages =
    (event) => {
      const selected = Array.from(event.target.files || []);
      event.target.value = "";

      if (selected.length === 0) return;

      const remainingSlots = MAX_IMAGES - images.length;
      if (remainingSlots <= 0) {
        setError(`Maximum ${MAX_IMAGES} images are allowed.`);
        return;
      }

      const filesToAdd = selected.slice(0, remainingSlots);

      const invalidType = filesToAdd.find(
        (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      );
      if (invalidType) {
        setError("Only JPG, PNG and WebP images are allowed.");
        return;
      }

      const oversized = filesToAdd.find((file) => file.size > MAX_IMAGE_SIZE);
      if (oversized) {
        setError("Each image must be 5 MB or smaller.");
        return;
      }

      const nextPreviews = filesToAdd.map((file) => URL.createObjectURL(file));
      setImages((current) => [...current, ...filesToAdd].slice(0, MAX_IMAGES));
      setPreviews((current) => [...current, ...nextPreviews].slice(0, MAX_IMAGES));
      setError(selected.length > remainingSlots
        ? `Only ${remainingSlots} more image(s) could be added. Maximum ${MAX_IMAGES} images are allowed.`
        : "");
      setSuccess("");
    };

  /*
  |--------------------------------------------------------------------------
  | LIVE CAMERA
  |--------------------------------------------------------------------------
  */

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraLoading(false);
  };

  const openCamera = async () => {
    setCameraError("");
    setError("");

    if (images.length >= MAX_IMAGES) {
      setCameraError(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is unavailable. Use localhost or HTTPS in a supported browser.");
      return;
    }

    try {
      setCameraLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
    } catch (cameraErr) {
      console.error("Camera access error:", cameraErr);
      if (cameraErr.name === "NotAllowedError" || cameraErr.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Allow camera access in your browser settings and try again.");
      } else if (cameraErr.name === "NotFoundError" || cameraErr.name === "DevicesNotFoundError") {
        setCameraError("No camera was found on this device.");
      } else {
        setCameraError("Unable to open the camera. Check that it is connected and not being used by another application.");
      }
    } finally {
      setCameraLoading(false);
    }
  };

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !cameraStreamRef.current) return;
    videoRef.current.srcObject = cameraStreamRef.current;
    videoRef.current.play().catch((playError) => {
      console.error("Camera preview error:", playError);
      setCameraError("Unable to display the live camera preview.");
    });
  }, [cameraOpen]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera is not ready yet. Please wait a moment.");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setCameraError(`You can upload a maximum of ${MAX_IMAGES} images.`);
      stopCamera();
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Unable to capture the photo. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("Photo capture failed. Please try again.");
        return;
      }
      if (blob.size > MAX_IMAGE_SIZE) {
        setCameraError("The captured photo exceeds 5 MB. Please try again.");
        return;
      }

      const photo = new File([blob], `vegetable-${Date.now()}.jpg`, { type: "image/jpeg" });
      const previewUrl = URL.createObjectURL(photo);
      setImages((current) => [...current, photo].slice(0, MAX_IMAGES));
      setPreviews((current) => [...current, previewUrl].slice(0, MAX_IMAGES));
      setError("");
      setSuccess("");
      setCameraError("");
      stopCamera();
    }, "image/jpeg", 0.88);
  };

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | REMOVE IMAGE
  |--------------------------------------------------------------------------
  */

  const removeImage =
    (index) => {
      const removedPreview =
        previews[index];

      if (
        removedPreview
      ) {
        URL.revokeObjectURL(
          removedPreview
        );
      }

      setImages(
        (current) =>
          current.filter(
            (_, itemIndex) =>
              itemIndex !==
              index
          )
      );

      setPreviews(
        (current) =>
          current.filter(
            (_, itemIndex) =>
              itemIndex !==
              index
          )
      );
    };

  /*
  |--------------------------------------------------------------------------
  | CLEANUP URLS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      previews.forEach(
        (preview) =>
          URL.revokeObjectURL(
            preview
          )
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | HARVEST INFO
  |--------------------------------------------------------------------------
  */

  const harvestInfo =
    useMemo(
      () =>
        getHarvestDateInfo(
          form.harvestDate
        ),
      [
        form.harvestDate
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | STOCK INFO
  |--------------------------------------------------------------------------
  */

  const stockInfo =
    useMemo(() => {
      const stock =
        Number(
          form.stockQuantity
        ) || 0;

      const threshold =
        Number(
          form.lowStockThreshold
        ) || 0;

      if (
        form.stockQuantity ===
        ""
      ) {
        return {
          label:
            "Awaiting stock",
          className:
            "text-slate-500",
          background:
            "bg-slate-50"
        };
      }

      if (
        stock <=
        0
      ) {
        return {
          label:
            "Out of stock",
          className:
            "text-red-600",
          background:
            "bg-red-50"
        };
      }

      if (
        stock <=
        threshold
      ) {
        return {
          label:
            "Low stock",
          className:
            "text-orange-600",
          background:
            "bg-orange-50"
        };
      }

      return {
        label:
          "Healthy inventory",
        className:
          "text-emerald-600",
        background:
          "bg-emerald-50"
      };
    }, [
      form.stockQuantity,
      form.lowStockThreshold
    ]);

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */

  const validateForm =
    () => {
      const name =
        form.name.trim();

      const description =
        form.description.trim();

      const category =
        form.category.trim();

      const price =
        Number(
          form.price
        );

      const stock =
        Number(
          form.stockQuantity
        );

      const threshold =
        Number(
          form.lowStockThreshold
        );

      if (
        name.length <
        2
      ) {
        return (
          "Product name must contain at least 2 characters."
        );
      }

      if (
        name.length >
        150
      ) {
        return (
          "Product name cannot exceed 150 characters."
        );
      }

      if (
        description.length >
        2000
      ) {
        return (
          "Description cannot exceed 2000 characters."
        );
      }

      if (
        !category
      ) {
        return (
          "Please select a product category."
        );
      }

      if (
        !units.some(
          (unit) =>
            unit.value ===
            form.unit
        )
      ) {
        return (
          "Please select a valid selling unit."
        );
      }

      if (
        !Number.isFinite(
          price
        ) ||
        price <
        0
      ) {
        return (
          "Please enter a valid price."
        );
      }

      if (
        !Number.isFinite(
          stock
        ) ||
        stock <
        0
      ) {
        return (
          "Please enter a valid stock quantity."
        );
      }

      if (
        !Number.isFinite(
          threshold
        ) ||
        threshold <
        0
      ) {
        return (
          "Please enter a valid low-stock threshold."
        );
      }

      if (
        images.length <
        1
      ) {
        return (
          "At least one real vegetable image is required."
        );
      }

      if (
        images.length >
        MAX_IMAGES
      ) {
        return (
          `Maximum ${MAX_IMAGES} images are allowed.`
        );
      }

      return null;
    };

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  */

  const submitProduct =
    async (
      event
    ) => {
      event.preventDefault();

      const validationError =
        validateForm();

      if (
        validationError
      ) {
        setError(
          validationError
        );

        return;
      }

      try {
        setLoading(
          true
        );

        setError("");
        setSuccess("");

        const formData =
          new FormData();

        formData.append(
          "name",
          form.name.trim()
        );

        formData.append(
          "description",
          form.description.trim()
        );

        formData.append(
          "category",
          form.category.trim()
        );

        formData.append(
          "price",
          String(
            Number(
              form.price
            )
          )
        );

        formData.append(
          "unit",
          form.unit
        );

        formData.append(
          "stockQuantity",
          String(
            Number(
              form.stockQuantity
            )
          )
        );

        formData.append(
          "lowStockThreshold",
          String(
            Number(
              form.lowStockThreshold
            )
          )
        );

        formData.append(
          "isOrganic",
          String(
            form.isOrganic
          )
        );

        if (
          form.harvestDate
        ) {
          formData.append(
            "harvestDate",
            form.harvestDate
          );
        }

        images.forEach(
          (image) => {
            formData.append(
              "images",
              image
            );
          }
        );

        await apiRequest(
          "/api/products",
          {
            method:
              "POST",
            body:
              formData
          }
        );

        setSuccess(
          "Product created successfully and submitted for admin approval."
        );

        images.forEach(
          (_, index) => {
            if (
              previews[index]
            ) {
              URL.revokeObjectURL(
                previews[index]
              );
            }
          }
        );

        setForm(
          initialForm
        );

        setImages([]);
        setPreviews([]);

        setTimeout(
          () => {
            navigate(
              "/seller/products"
            );
          },
          800
        );
      } catch (
        err
      ) {
        console.error(
          "Product creation error:",
          err
        );

        setError(
          err.message ||
            "Product creation failed."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CURRENT UNIT
  |--------------------------------------------------------------------------
  */

  const selectedUnit =
    units.find(
      (unit) =>
        unit.value ===
        form.unit
    );

  return (
    <div className="min-h-screen bg-[#f5f8f7] text-slate-900">

      {/* ================================================================ */}
      {/* SIDEBAR                                                         */}
      {/* ================================================================ */}

      <SellerSidebar />

      {/* ================================================================ */}
      {/* MAIN                                                            */}
      {/* ================================================================ */}

      <main className="lg:ml-72">

        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

          {/* ============================================================ */}
          {/* HEADER                                                       */}
          {/* ============================================================ */}

          <SellerHeader
            title="Create Product"
            subtitle="Bring a fresh farm product into the RuralFresh marketplace."
            onRefresh={() => {
              stopCamera();
              setCameraError("");
              setForm(
                initialForm
              );

              setImages(
                []
              );

              previews.forEach(
                (preview) =>
                  URL.revokeObjectURL(
                    preview
                  )
              );

              setPreviews(
                []
              );

              setError("");
              setSuccess("");
            }}
            loading={
              loading
            }
          />

          {/* ============================================================ */}
          {/* FEEDBACK                                                     */}
          {/* ============================================================ */}

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">

              <span className="text-lg">
                ⚠️
              </span>

              <div>

                <p className="text-sm font-black text-red-800">
                  Product cannot be submitted
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600">
                  {error}
                </p>

              </div>

            </div>
          )}

          {success && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">

              <span className="text-lg">
                ✓
              </span>

              <div>

                <p className="text-sm font-black text-emerald-800">
                  Product created
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  {success}
                </p>

              </div>

            </div>
          )}

          {/* ============================================================ */}
          {/* LIVE PREVIEW HERO                                             */}
          {/* ============================================================ */}

          <section className="mb-6 overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-[0_25px_80px_rgba(15,23,42,0.13)] sm:p-8">

            <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.13em] text-emerald-300">
                    New marketplace listing
                  </span>

                  {form.isOrganic && (
                    <span className="rounded-full border border-green-300/20 bg-green-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.13em] text-green-300">
                      🌿 Organic
                    </span>
                  )}

                </div>

                <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                  {form.name ||
                    "Your vegetable product"}
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
                  {form.description.trim() ||
                    "Your product description will appear here as customers discover your listing."}
                </p>

              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">

                <HeroMetric
                  label="Price"
                  value={
                    form.price
                      ? `₹${Number(
                          form.price
                        ).toFixed(
                          2
                        )}`
                      : "₹0.00"
                  }
                />

                <HeroMetric
                  label="Unit"
                  value={
                    selectedUnit
                      ?.short ||
                    "kg"
                  }
                />

                <HeroMetric
                  label="Stock"
                  value={
                    form.stockQuantity ||
                    "0"
                  }
                />

                <HeroMetric
                  label="Images"
                  value={`${images.length}/${MAX_IMAGES}`}
                />

              </div>

            </div>

          </section>

          {/* ============================================================ */}
          {/* FORM                                                         */}
          {/* ============================================================ */}

          <form
            onSubmit={
              submitProduct
            }
          >

            <div className="grid gap-6 xl:grid-cols-[1fr_390px]">

              {/* ========================================================== */}
              {/* LEFT COLUMN                                                 */}
              {/* ========================================================== */}

              <div className="space-y-6">

                {/* ====================================================== */}
                {/* PRODUCT INFORMATION                                      */}
                {/* ====================================================== */}

                <Section
                  number="01"
                  eyebrow="Identity"
                  title="Product information"
                  description="Tell customers what they are buying and where it belongs in the marketplace."
                >

                  <div className="space-y-6">

                    <Field
                      label="Product Name"
                      name="name"
                      value={
                        form.name
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Fresh Tomato"
                      required
                      max="150"
                      disabled={
                        loading
                      }
                    />

                    <div className="grid gap-5 md:grid-cols-2">

                      <div>

                        <label
                          htmlFor="category"
                          className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400"
                        >
                          Category
                        </label>

                        <select
                          id="category"
                          name="category"
                          value={
                            form.category
                          }
                          onChange={
                            handleChange
                          }
                          required
                          disabled={
                            loading
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50"
                        >

                          <option value="">
                            Select category
                          </option>

                          {categories.map(
                            (
                              category
                            ) => (
                              <option
                                key={
                                  category
                                }
                                value={
                                  category
                                }
                              >
                                {
                                  category
                                }
                              </option>
                            )
                          )}

                        </select>

                      </div>

                      <div>

                        <label
                          htmlFor="unit"
                          className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400"
                        >
                          Selling Unit
                        </label>

                        <select
                          id="unit"
                          name="unit"
                          value={
                            form.unit
                          }
                          onChange={
                            handleChange
                          }
                          required
                          disabled={
                            loading
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50"
                        >

                          {units.map(
                            (
                              unit
                            ) => (
                              <option
                                key={
                                  unit.value
                                }
                                value={
                                  unit.value
                                }
                              >
                                {
                                  unit.label
                                }{" "}
                                (
                                {
                                  unit.short
                                }
                                )
                              </option>
                            )
                          )}

                        </select>

                      </div>

                    </div>

                    <div>

                      <div className="mb-2 flex items-center justify-between">

                        <label
                          htmlFor="description"
                          className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400"
                        >
                          Description
                        </label>

                        <span className="text-[10px] font-bold text-slate-300">
                          {
                            form.description
                              .length
                          }{" "}
                          / 2000
                        </span>

                      </div>

                      <textarea
                        id="description"
                        name="description"
                        value={
                          form.description
                        }
                        onChange={
                          handleChange
                        }
                        maxLength={
                          2000
                        }
                        rows={
                          7
                        }
                        placeholder="Describe freshness, farming method, quality, source and anything useful for customers..."
                        disabled={
                          loading
                        }
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50"
                      />

                    </div>

                  </div>

                </Section>

                {/* ====================================================== */}
                {/* PRICE & INVENTORY                                       */}
                {/* ====================================================== */}

                <Section
                  number="02"
                  eyebrow="Commercial"
                  title="Price & inventory"
                  description="Set how much the product costs and how much stock you currently have available."
                >

                  <div className="grid gap-5 md:grid-cols-3">

                    <Field
                      label="Selling Price"
                      name="price"
                      type="number"
                      value={
                        form.price
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="40.00"
                      min="0"
                      step="0.01"
                      required
                      disabled={
                        loading
                      }
                    />

                    <Field
                      label="Stock Quantity"
                      name="stockQuantity"
                      type="number"
                      value={
                        form.stockQuantity
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="100"
                      min="0"
                      step="0.001"
                      required
                      disabled={
                        loading
                      }
                    />

                    <Field
                      label="Low Stock Alert"
                      name="lowStockThreshold"
                      type="number"
                      value={
                        form.lowStockThreshold
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="10"
                      min="0"
                      step="0.001"
                      disabled={
                        loading
                      }
                    />

                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">

                    <div
                      className={`rounded-2xl p-4 ${stockInfo.background}`}
                    >

                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Inventory status
                      </p>

                      <p
                        className={`mt-1 text-sm font-black ${stockInfo.className}`}
                      >
                        {
                          stockInfo.label
                        }
                      </p>

                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">

                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Selling price
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-900">

                        ₹
                        {Number(
                          form.price ||
                            0
                        ).toFixed(
                          2
                        )}

                        <span className="font-semibold text-slate-400">
                          {" / "}
                          {
                            selectedUnit?.short
                          }
                        </span>

                      </p>

                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">

                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Alert threshold
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-900">
                        {
                          form.lowStockThreshold ||
                          0
                        }{" "}
                        {
                          selectedUnit?.short
                        }
                      </p>

                    </div>

                  </div>

                </Section>

                {/* ====================================================== */}
                {/* HARVEST                                                  */}
                {/* ====================================================== */}

                <Section
                  number="03"
                  eyebrow="Freshness"
                  title="Harvest scheduling"
                  description="Set the date when this vegetable is expected to be harvested."
                >

                  <div className="grid gap-6 lg:grid-cols-[300px_1fr]">

                    <div>

                      <label
                        htmlFor="harvestDate"
                        className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400"
                      >
                        Harvest Date
                      </label>

                      <input
                        id="harvestDate"
                        name="harvestDate"
                        type="date"
                        value={
                          form.harvestDate
                        }
                        onChange={
                          handleChange
                        }
                        disabled={
                          loading
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50"
                      />

                      <p className="mt-2 text-[11px] leading-5 text-slate-400">
                        This date is used by the customer-facing freshness workflow.
                      </p>

                    </div>

                    <div
                      className={`rounded-2xl border p-5 ${harvestInfo.wrapper}`}
                    >

                      <div className="flex items-start gap-3">

                        <div className="text-2xl">
                          {
                            harvestInfo.icon
                          }
                        </div>

                        <div>

                          <p
                            className={`text-sm font-black ${harvestInfo.titleClass}`}
                          >
                            {
                              harvestInfo.title
                            }
                          </p>

                          <p
                            className={`mt-1 text-sm leading-6 ${harvestInfo.textClass}`}
                          >
                            {
                              harvestInfo.message
                            }
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>

                  <label className="mt-6 flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/50">

                    <input
                      type="checkbox"
                      name="isOrganic"
                      checked={
                        form.isOrganic
                      }
                      onChange={
                        handleChange
                      }
                      disabled={
                        loading
                      }
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />

                    <span>

                      <span className="block text-sm font-black text-slate-900">
                        🌿 Organic product
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        Tell customers that this product is organically grown.
                      </span>

                    </span>

                  </label>

                </Section>

              </div>

              {/* ========================================================== */}
              {/* RIGHT COLUMN                                                */}
              {/* ========================================================== */}

              <div className="space-y-6">

                {/* ====================================================== */}
                {/* IMAGE GALLERY                                           */}
                {/* ====================================================== */}

                <Section
                  number="04"
                  eyebrow="Visual"
                  title="Product gallery"
                  description={`Capture up to ${MAX_IMAGES} fresh photos using your device camera.`}
                >

                  <div className="grid grid-cols-2 gap-3">

                    {previews.map(
                      (
                        preview,
                        index
                      ) => (

                        <div
                          key={
                            preview
                          }
                          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                        >

                          <img
                            src={
                              preview
                            }
                            alt={`Product preview ${index + 1}`}
                            className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                          />

                          <div className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-[9px] font-black text-white backdrop-blur">
                            {index ===
                            0
                              ? "PRIMARY"
                              : `IMAGE ${
                                  index +
                                  1
                                }`}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeImage(
                                index
                              )
                            }
                            className="absolute right-2 top-2 rounded-lg bg-red-600 px-2 py-1 text-[9px] font-black text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-700"
                          >
                            Remove
                          </button>

                        </div>

                      )
                    )}

                  </div>

                  {images.length < MAX_IMAGES && (
                    <div className="mt-4 space-y-3">
                      <button
                        type="button"
                        onClick={openCamera}
                        disabled={loading || cameraLoading}
                        className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-5 py-7 text-center transition hover:border-emerald-500 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">📷</span>
                        <span className="mt-3 text-sm font-black text-emerald-900">
                          {cameraLoading ? "Opening camera..." : "Open live camera"}
                        </span>
                        <span className="mt-1 text-[11px] text-emerald-700">Take a fresh photo of your vegetable</span>
                      </button>

                    </div>
                  )}

                  {cameraError && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
                      {cameraError}
                    </div>
                  )}

                  {cameraOpen && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-200 bg-slate-950">
                      <div className="flex items-center justify-between px-4 py-3 text-white">
                        <div>
                          <p className="text-sm font-black">Live vegetable camera</p>
                          <p className="text-[10px] text-white/60">Position the vegetable in the frame</p>
                        </div>
                        <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-300">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> LIVE
                        </span>
                      </div>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="max-h-[420px] min-h-[220px] w-full bg-black object-contain"
                      />
                      <div className="grid grid-cols-2 gap-3 p-4">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          disabled={loading || images.length >= MAX_IMAGES}
                          className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
                        >📸 Capture photo</button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                        >Cancel camera</button>
                      </div>
                      <p className="px-4 pb-4 text-center text-[10px] text-white/50">
                        {images.length} of {MAX_IMAGES} photos selected
                      </p>
                    </div>
                  )}

                  <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">

                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-500">
                      Photo guidance
                    </p>

                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      Capture clear photos of the actual vegetable using the live camera. The first captured photo will be used as the primary marketplace image.
                    </p>

                  </div>

                </Section>

                {/* ====================================================== */}
                {/* LIVE LISTING PREVIEW                                    */}
                {/* ====================================================== */}

                <div className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">

                  <div className="border-b border-slate-100 px-6 py-5">

                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                      Customer preview
                    </p>

                    <h2 className="mt-1 text-lg font-black text-slate-950">
                      Marketplace card
                    </h2>

                  </div>

                  <div className="p-6">

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

                      <div className="relative aspect-[4/3] bg-slate-100">

                        {previews[0] ? (

                          <img
                            src={
                              previews[0]
                            }
                            alt="Product preview"
                            className="h-full w-full object-cover"
                          />

                        ) : (

                          <div className="flex h-full flex-col items-center justify-center text-center">

                            <span className="text-5xl">
                              🥬
                            </span>

                            <p className="mt-3 text-xs font-bold text-slate-400">
                              Product image preview
                            </p>

                          </div>

                        )}

                        {form.isOrganic && (
                          <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/85 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700 shadow-sm backdrop-blur">
                            🌿 Organic
                          </span>
                        )}

                      </div>

                      <div className="p-5">

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <h3 className="truncate text-base font-black text-slate-900">
                              {form.name ||
                                "Fresh Vegetable"}
                            </h3>

                            <p className="mt-1 text-xs text-slate-400">
                              {form.category ||
                                "Vegetable category"}
                            </p>

                          </div>

                          <div className="text-right">

                            <p className="text-lg font-black text-emerald-700">
                              ₹
                              {Number(
                                form.price ||
                                  0
                              ).toFixed(
                                2
                              )}
                            </p>

                            <p className="text-[10px] text-slate-400">
                              /
                              {
                                selectedUnit?.short
                              }
                            </p>

                          </div>

                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">

                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">
                            {Number(
                              form.stockQuantity ||
                                0
                            ) >
                            0
                              ? "In stock"
                              : "Stock pending"}
                          </span>

                          {harvestInfo.type ===
                            "future" && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-amber-700">
                              🌱 Fresh harvest scheduled
                            </span>
                          )}

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

                {/* ====================================================== */}
                {/* SUBMIT PANEL                                            */}
                {/* ====================================================== */}

                <div className="sticky top-6 overflow-hidden rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Publishing
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-900">
                        Ready for review
                      </p>

                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      ✓
                    </div>

                  </div>

                  <div className="mt-5 space-y-3">

                    <SummaryRow
                      label="Images"
                      value={`${images.length} / ${MAX_IMAGES}`}
                    />

                    <SummaryRow
                      label="Category"
                      value={
                        form.category ||
                        "Not selected"
                      }
                    />

                    <SummaryRow
                      label="Harvest"
                      value={
                        form.harvestDate ||
                        "Not specified"
                      }
                    />

                    <SummaryRow
                      label="Inventory"
                      value={
                        form.stockQuantity
                          ? `${form.stockQuantity} ${selectedUnit?.short}`
                          : "Not entered"
                      }
                    />

                  </div>

                  <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">

                    <p className="text-xs font-black text-amber-800">
                      Admin approval
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-amber-700">
                      New products are submitted for administrator moderation before becoming customer-visible.
                    </p>

                  </div>

                  <button
                    type="submit"
                    disabled={
                      loading
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Uploading Product...
                      </>
                    ) : (
                      <>
                        Submit Product
                        <span>
                          →
                        </span>
                      </>
                    )}

                  </button>

                  <Link
                    to="/seller/products"
                    className="mt-3 block rounded-2xl border border-slate-200 px-5 py-3.5 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </Link>

                </div>

              </div>

            </div>

          </form>

        </div>

      </main>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| HERO METRIC
|--------------------------------------------------------------------------
*/

function HeroMetric({
  label,
  value
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 backdrop-blur-xl">

      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30">
        {label}
      </p>

      <p className="mt-1 truncate text-lg font-black text-white">
        {value}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SUMMARY ROW
|--------------------------------------------------------------------------
*/

function SummaryRow({
  label,
  value
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">

      <span className="text-xs font-semibold text-slate-400">
        {label}
      </span>

      <span className="max-w-[60%] truncate text-right text-xs font-black text-slate-800">
        {value}
      </span>

    </div>
  );
}