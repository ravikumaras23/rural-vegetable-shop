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

const UNITS = [
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

const CATEGORIES = [
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

const EMPTY_FORM = {
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
| NORMALIZE STATUS
|--------------------------------------------------------------------------
*/

function normalizeStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

/*
|--------------------------------------------------------------------------
| INDIA DATE KEY
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

      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit"
    }
  ).format(date);
}

/*
|--------------------------------------------------------------------------
| HARVEST DATE KEY
|--------------------------------------------------------------------------
*/

function getHarvestDateKey(
  value
) {
  if (!value) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return getIndiaDateKey(
    parsed
  );
}

/*
|--------------------------------------------------------------------------
| HARVEST INFORMATION
|--------------------------------------------------------------------------
*/

function getHarvestInfo(
  value
) {
  const harvestKey =
    getHarvestDateKey(
      value
    );

  if (!harvestKey) {
    return {
      state: "none",
      title:
        "No harvest date",
      description:
        "This product does not have a harvest date set.",
      className:
        "border-slate-200 bg-slate-50",
      titleClass:
        "text-slate-700",
      textClass:
        "text-slate-500"
    };
  }

  const today =
    getIndiaDateKey();

  if (
    harvestKey ===
    today
  ) {
    return {
      state: "today",
      title:
        "Harvest is today",
      description:
        "This product is ready for today's packing and fulfillment workflow.",
      className:
        "border-emerald-200 bg-emerald-50",
      titleClass:
        "text-emerald-800",
      textClass:
        "text-emerald-700"
    };
  }

  if (
    harvestKey >
    today
  ) {
    return {
      state: "future",
      title:
        "Harvest is scheduled",
      description:
        `Harvest date: ${formatDate(
          value
        )}. Packing should remain unavailable until the harvest date is reached.`,
      className:
        "border-amber-200 bg-amber-50",
      titleClass:
        "text-amber-800",
      textClass:
        "text-amber-700"
    };
  }

  return {
    state: "past",
    title:
      "Harvest date passed",
    description:
      `This product's harvest date was ${formatDate(
        value
      )}.`,
    className:
      "border-blue-200 bg-blue-50",
    titleClass:
      "text-blue-800",
    textClass:
      "text-blue-700"
  };
}

/*
|--------------------------------------------------------------------------
| FORMAT DATE
|--------------------------------------------------------------------------
*/

function formatDate(
  value
) {
  const key =
    getHarvestDateKey(
      value
    );

  if (!key) {
    return "Not specified";
  }

  const [
    year,
    month,
    day
  ] =
    key
      .split("-")
      .map(Number);

  return new Date(
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
}

/*
|--------------------------------------------------------------------------
| INPUT COMPONENT
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
        className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400"
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
| SECTION CARD
|--------------------------------------------------------------------------
*/

function SectionCard({
  eyebrow,
  title,
  description,
  children,
  className = ""
}) {
  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_15px_50px_rgba(15,23,42,0.045)] ${className}`}
    >
      <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {description}
          </p>
        )}
      </div>

      <div className="p-6 sm:p-7">
        {children}
      </div>
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| STATUS PILL
|--------------------------------------------------------------------------
*/

function ProductStatusPill({
  status
}) {
  const normalized =
    normalizeStatus(
      status
    );

  const config = {
    pending: {
      label:
        "Pending Review",
      style:
        "border-amber-200 bg-amber-50 text-amber-700"
    },

    approved: {
      label:
        "Approved",
      style:
        "border-emerald-200 bg-emerald-50 text-emerald-700"
    },

    rejected: {
      label:
        "Rejected",
      style:
        "border-red-200 bg-red-50 text-red-700"
    },

    out_of_stock: {
      label:
        "Out of Stock",
      style:
        "border-orange-200 bg-orange-50 text-orange-700"
    },

    inactive: {
      label:
        "Inactive",
      style:
        "border-slate-200 bg-slate-50 text-slate-600"
    }
  };

  const current =
    config[normalized] || {
      label:
        status ||
        "Unknown",
      style:
        "border-slate-200 bg-slate-50 text-slate-600"
    };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] ${current.style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {current.label}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| SELLER EDIT PRODUCT
|--------------------------------------------------------------------------
*/

export default function SellerEditProduct() {
  const {
    id
  } = useParams();

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
    EMPTY_FORM
  );

  const [
    productStatus,
    setProductStatus
  ] = useState(
    ""
  );

  const [
    existingImages,
    setExistingImages
  ] = useState([]);

  const [
    newImages,
    setNewImages
  ] = useState([]);

  const [
    previews,
    setPreviews
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    removingImage,
    setRemovingImage
  ] = useState("");

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
  | LOAD PRODUCT
  |--------------------------------------------------------------------------
  */

  const loadProduct =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setError("");
          setSuccess("");

          const response =
            await apiRequest(
              "/api/products/seller/my-products?limit=100"
            );

          const products =
            Array.isArray(
              response.products
            )
              ? response.products
              : Array.isArray(
                  response.data
                )
              ? response.data
              : [];

          const product =
            products.find(
              (item) =>
                String(
                  item._id
                ) ===
                String(id)
            );

          if (!product) {
            throw new Error(
              "Product not found or you do not own this product."
            );
          }

          setProductStatus(
            product.status ||
              ""
          );

          setForm({
            name:
              product.name ||
              "",

            description:
              product.description ||
              "",

            category:
              product.category ||
              "",

            price:
              product.price ??
              "",

            unit:
              product.unit ||
              "kg",

            stockQuantity:
              product.stockQuantity ??
              "",

            lowStockThreshold:
              product.lowStockThreshold ??
              10,

            harvestDate:
              product.harvestDate
                ? String(
                    product.harvestDate
                  ).slice(
                    0,
                    10
                  )
                : "",

            isOrganic:
              Boolean(
                product.isOrganic
              )
          });

          setExistingImages(
            Array.isArray(
              product.images
            )
              ? product.images
              : []
          );
        } catch (
          err
        ) {
          console.error(
            "Load product error:",
            err
          );

          setError(
            err.message ||
              "Unable to load product."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [id]
    );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadProduct();
  }, [
    loadProduct
  ]);

  /*
  |--------------------------------------------------------------------------
  | CLEANUP PREVIEW URLS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      previews.forEach(
        (preview) => {
          URL.revokeObjectURL(
            preview
          );
        }
      );
    };
  }, [
    previews
  ]);

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
  | ADD NEW IMAGES
  |--------------------------------------------------------------------------
  */

  const handleNewImages =
    (event) => {
      const selected =
        Array.from(
          event.target.files ||
            []
        );

      if (
        selected.length ===
        0
      ) {
        return;
      }

      const remainingSlots =
        MAX_IMAGES -
        existingImages.length;

      if (
        selected.length >
        remainingSlots
      ) {
        setError(
          `You can add only ${remainingSlots} more image${
            remainingSlots ===
            1
              ? ""
              : "s"
          }. Maximum ${MAX_IMAGES} images are allowed.`
        );

        event.target.value =
          "";

        return;
      }

      const validFiles =
        selected.filter(
          (file) =>
            [
              "image/jpeg",
              "image/png",
              "image/webp"
            ].includes(
              file.type
            )
        );

      if (
        validFiles.length !==
        selected.length
      ) {
        setError(
          "Only JPG, PNG and WebP images are allowed."
        );

        event.target.value =
          "";

        return;
      }

      const tooLarge =
        validFiles.some(
          (file) =>
            file.size >
            5 *
              1024 *
              1024
        );

      if (
        tooLarge
      ) {
        setError(
          "Each image must be 5 MB or smaller."
        );

        event.target.value =
          "";

        return;
      }

      setNewImages(
        validFiles
      );

      setPreviews(
        validFiles.map(
          (file) =>
            URL.createObjectURL(
              file
            )
        )
      );

      setError("");
      setSuccess("");

      event.target.value =
        "";
    };

  /*
  |--------------------------------------------------------------------------
  | REMOVE NEW IMAGE
  |--------------------------------------------------------------------------
  */

  const removeNewImage =
    (index) => {
      const nextImages =
        newImages.filter(
          (_, imageIndex) =>
            imageIndex !==
            index
        );

      const nextPreviews =
        previews.filter(
          (_, imageIndex) =>
            imageIndex !==
            index
        );

      if (
        previews[index]
      ) {
        URL.revokeObjectURL(
          previews[index]
        );
      }

      setNewImages(
        nextImages
      );

      setPreviews(
        nextPreviews
      );
    };

  /*
  |--------------------------------------------------------------------------
  | REMOVE EXISTING IMAGE
  |--------------------------------------------------------------------------
  */

  const removeExistingImage =
    async (
      image
    ) => {
      if (
        existingImages.length <=
        1
      ) {
        window.alert(
          "A product must have at least one image."
        );

        return;
      }

      const confirmed =
        window.confirm(
          "Remove this product image?"
        );

      if (
        !confirmed
      ) {
        return;
      }

      try {
        setRemovingImage(
          image.publicId
        );

        setError("");
        setSuccess("");

        const encodedPublicId =
          encodeURIComponent(
            image.publicId
          );

        const response =
          await apiRequest(
            `/api/products/${id}/images/${encodedPublicId}`,
            {
              method:
                "DELETE"
            }
          );

        const updatedImages =
          Array.isArray(
            response.product
              ?.images
          )
            ? response
                .product
                .images
            : existingImages.filter(
                (item) =>
                  item.publicId !==
                  image.publicId
              );

        setExistingImages(
          updatedImages
        );

        setSuccess(
          "Product image removed successfully."
        );
      } catch (
        err
      ) {
        console.error(
          "Remove image error:",
          err
        );

        setError(
          err.message ||
            "Unable to remove image."
        );
      } finally {
        setRemovingImage(
          ""
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | VALIDATE FORM
  |--------------------------------------------------------------------------
  */

  const validateForm =
    () => {
      const name =
        form.name.trim();

      const category =
        form.category.trim();

      const price =
        Number(
          form.price
        );

      const stockQuantity =
        Number(
          form.stockQuantity
        );

      const lowStockThreshold =
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
        !category
      ) {
        return (
          "Please select a product category."
        );
      }

      if (
        !UNITS.some(
          (unit) =>
            unit.value ===
            form.unit
        )
      ) {
        return (
          "Please select a valid unit."
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
          stockQuantity
        ) ||
        stockQuantity <
          0
      ) {
        return (
          "Please enter a valid stock quantity."
        );
      }

      if (
        !Number.isFinite(
          lowStockThreshold
        ) ||
        lowStockThreshold <
          0
      ) {
        return (
          "Please enter a valid low-stock threshold."
        );
      }

      if (
        existingImages.length +
          newImages.length <
        1
      ) {
        return (
          "The product must have at least one image."
        );
      }

      if (
        existingImages.length +
          newImages.length >
        MAX_IMAGES
      ) {
        return (
          `A maximum of ${MAX_IMAGES} images are allowed.`
        );
      }

      return null;
    };

  /*
  |--------------------------------------------------------------------------
  | SAVE
  |--------------------------------------------------------------------------
  */

  const submit =
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
        setSaving(
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

        newImages.forEach(
          (image) => {
            formData.append(
              "images",
              image
            );
          }
        );

        await apiRequest(
          `/api/products/${id}`,
          {
            method:
              "PUT",

            body:
              formData
          }
        );

        setSuccess(
          "Product updated successfully."
        );

        setNewImages(
          []
        );

        previews.forEach(
          (preview) => {
            URL.revokeObjectURL(
              preview
            );
          }
        );

        setPreviews(
          []
        );

        await loadProduct();

        setTimeout(
          () => {
            navigate(
              "/seller/products"
            );
          },
          700
        );
      } catch (
        err
      ) {
        console.error(
          "Update product error:",
          err
        );

        setError(
          err.message ||
            "Unable to update product."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | PRODUCT METRICS
  |--------------------------------------------------------------------------
  */

  const stockState =
    useMemo(
      () => {
        const stock =
          Number(
            form.stockQuantity
          ) || 0;

        const threshold =
          Number(
            form.lowStockThreshold
          ) || 0;

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
            "Healthy stock",
          className:
            "text-emerald-600",
          background:
            "bg-emerald-50"
        };
      },
      [
        form.stockQuantity,
        form.lowStockThreshold
      ]
    );

  const harvestInfo =
    useMemo(
      () =>
        getHarvestInfo(
          form.harvestDate
        ),
      [
        form.harvestDate
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | LOADING PAGE
  |--------------------------------------------------------------------------
  */

  if (
    loading
  ) {
    return (
      <div className="min-h-screen bg-[#f5f8f7]">

        <SellerSidebar />

        <main className="lg:ml-72">

          <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

            <SellerHeader
              title="Edit Product"
              subtitle="Loading your product workspace..."
              loading
            />

            <div className="grid gap-6 xl:grid-cols-[1fr_390px]">

              <div className="space-y-6">

                <SkeletonCard />

                <SkeletonCard />

              </div>

              <SkeletonCard />

            </div>

          </div>

        </main>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR WITHOUT PRODUCT
  |--------------------------------------------------------------------------
  */

  if (
    error &&
    !form.name
  ) {
    return (
      <div className="min-h-screen bg-[#f5f8f7]">

        <SellerSidebar />

        <main className="lg:ml-72">

          <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

            <SellerHeader
              title="Edit Product"
              subtitle="We couldn't load this product."
            />

            <div className="mx-auto max-w-2xl rounded-[30px] border border-red-200 bg-white p-10 text-center shadow-sm">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
                ⚠️
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-950">
                Product unavailable
              </h2>

              <p className="mt-3 text-sm leading-6 text-red-600">
                {error}
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3">

                <button
                  type="button"
                  onClick={
                    loadProduct
                  }
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Try Again
                </button>

                <Link
                  to="/seller/products"
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  ← Products
                </Link>

              </div>

            </div>

          </div>

        </main>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

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
            title="Edit Product"
            subtitle="Refine your product listing, pricing, inventory and harvest information."
            loading={
              saving
            }
          />

          {/* ============================================================ */}
          {/* STATUS / FEEDBACK                                            */}
          {/* ============================================================ */}

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">

              <span className="text-lg">
                ⚠️
              </span>

              <div>

                <p className="text-sm font-black text-red-800">
                  Update needs attention
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
                  Saved successfully
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  {success}
                </p>

              </div>

            </div>
          )}

          {/* ============================================================ */}
          {/* PRODUCT HERO                                                  */}
          {/* ============================================================ */}

          <section className="mb-6 overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-[0_25px_80px_rgba(15,23,42,0.12)] sm:p-8">

            <div className="pointer-events-none absolute" />

            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">

              <div>

                <div className="flex flex-wrap items-center gap-3">

                  <ProductStatusPill
                    status={
                      productStatus
                    }
                  />

                  {form.isOrganic && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-300">
                      🌿 Organic
                    </span>
                  )}

                </div>

                <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                  {form.name ||
                    "Unnamed Product"}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                  Changes to your product are saved through the live marketplace API.
                </p>

              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

                <HeroMetric
                  label="Price"
                  value={`₹${Number(
                    form.price ||
                      0
                  ).toFixed(
                    2
                  )}`}
                />

                <HeroMetric
                  label="Stock"
                  value={`${Number(
                    form.stockQuantity ||
                      0
                  )} ${form.unit}`}
                />

                <HeroMetric
                  label="Images"
                  value={
                    existingImages.length +
                    newImages.length
                  }
                />

              </div>

            </div>

          </section>

          {/* ============================================================ */}
          {/* MAIN FORM                                                     */}
          {/* ============================================================ */}

          <form
            onSubmit={
              submit
            }
          >

            <div className="grid gap-6 xl:grid-cols-[1fr_390px]">

              {/* ========================================================== */}
              {/* LEFT                                                       */}
              {/* ========================================================== */}

              <div className="space-y-6">

                {/* ====================================================== */}
                {/* INFORMATION                                             */}
                {/* ====================================================== */}

                <SectionCard
                  eyebrow="01 · Identity"
                  title="Product information"
                  description="Keep the marketplace listing clear, searchable and useful to customers."
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
                        saving
                      }
                    />

                    <div className="grid gap-5 md:grid-cols-2">

                      <div>

                        <label
                          htmlFor="category"
                          className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400"
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
                            saving
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50"
                        >

                          <option value="">
                            Select category
                          </option>

                          {CATEGORIES.map(
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
                          className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400"
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
                            saving
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50"
                        >

                          {UNITS.map(
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

                      <label
                        htmlFor="description"
                        className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400"
                      >
                        Description
                      </label>

                      <textarea
                        id="description"
                        name="description"
                        value={
                          form.description
                        }
                        onChange={
                          handleChange
                        }
                        rows={
                          6
                        }
                        maxLength={
                          2000
                        }
                        placeholder="Describe freshness, quality, farming method and anything useful for customers..."
                        disabled={
                          saving
                        }
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50"
                      />

                      <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400">

                        <span>
                          Customer-facing description
                        </span>

                        <span>
                          {
                            form.description.length
                          }{" "}
                          / 2000
                        </span>

                      </div>

                    </div>

                  </div>

                </SectionCard>

                {/* ====================================================== */}
                {/* PRICING                                                 */}
                {/* ====================================================== */}

                <SectionCard
                  eyebrow="02 · Commercial"
                  title="Price & inventory"
                  description="Set the current selling price and the stock level available to customers."
                >

                  <div className="grid gap-5 md:grid-cols-3">

                    <Field
                      label="Price"
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
                        saving
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
                        saving
                      }
                    />

                    <Field
                      label="Low Stock Threshold"
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
                        saving
                      }
                    />

                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">

                    <div
                      className={`rounded-2xl p-4 ${stockState.background}`}
                    >

                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Inventory state
                      </p>

                      <p
                        className={`mt-1 text-sm font-black ${stockState.className}`}
                      >
                        {
                          stockState.label
                        }
                      </p>

                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">

                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Current price
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-900">
                        ₹
                        {Number(
                          form.price ||
                            0
                        ).toFixed(
                          2
                        )}{" "}
                        /{" "}
                        {
                          form.unit
                        }
                      </p>

                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">

                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Alert level
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-900">
                        {
                          form.lowStockThreshold
                        }{" "}
                        {
                          form.unit
                        }
                      </p>

                    </div>

                  </div>

                </SectionCard>

                {/* ====================================================== */}
                {/* HARVEST                                                 */}
                {/* ====================================================== */}

                <SectionCard
                  eyebrow="03 · Freshness"
                  title="Harvest scheduling"
                  description="Customers and order fulfillment use this date to understand when the produce is ready."
                >

                  <div className="grid gap-6 lg:grid-cols-[300px_1fr]">

                    <div>

                      <label
                        htmlFor="harvestDate"
                        className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400"
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
                          saving
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 disabled:bg-slate-50"
                      />

                    </div>

                    <div
                      className={`rounded-2xl border p-5 ${harvestInfo.className}`}
                    >

                      <div className="flex items-start gap-3">

                        <div className="text-2xl">

                          {harvestInfo.state ===
                          "future"
                            ? "🌱"
                            : harvestInfo.state ===
                              "today"
                            ? "✅"
                            : harvestInfo.state ===
                              "past"
                            ? "📅"
                            : "◌"}

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
                              harvestInfo.description
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
                        saving
                      }
                      className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />

                    <span>

                      <span className="block text-sm font-black text-slate-900">
                        Organic produce
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        Mark this product as organically grown.
                      </span>

                    </span>

                  </label>

                </SectionCard>

              </div>

              {/* ========================================================== */}
              {/* RIGHT                                                       */}
              {/* ========================================================== */}

              <div className="space-y-6">

                {/* ====================================================== */}
                {/* IMAGES                                                 */}
                {/* ====================================================== */}

                <SectionCard
                  eyebrow="04 · Visual"
                  title="Product gallery"
                  description={`${existingImages.length + newImages.length} / ${MAX_IMAGES} images`}
                >

                  <div className="grid grid-cols-2 gap-3">

                    {existingImages.map(
                      (
                        image
                      ) => (

                        <div
                          key={
                            image.publicId
                          }
                          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                        >

                          <img
                            src={
                              image.url
                            }
                            alt={
                              form.name ||
                              "Product"
                            }
                            className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                          />

                          <div className="absolute inset-x-2 bottom-2 flex justify-between gap-2 opacity-0 transition group-hover:opacity-100">

                            <span className="rounded-lg bg-black/60 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">
                              Current
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                removeExistingImage(
                                  image
                                )
                              }
                              disabled={
                                removingImage ===
                                image.publicId
                              }
                              className="rounded-lg bg-red-600 px-2.5 py-1 text-[9px] font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                            >
                              {removingImage ===
                              image.publicId
                                ? "..."
                                : "Remove"}
                            </button>

                          </div>

                        </div>

                      )
                    )}

                    {previews.map(
                      (
                        preview,
                        index
                      ) => (

                        <div
                          key={
                            preview
                          }
                          className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50"
                        >

                          <img
                            src={
                              preview
                            }
                            alt={`New product ${index + 1}`}
                            className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                          />

                          <div className="absolute inset-x-2 bottom-2 flex justify-between gap-2">

                            <span className="rounded-lg bg-emerald-600 px-2 py-1 text-[9px] font-black text-white">
                              New
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                removeNewImage(
                                  index
                                )
                              }
                              className="rounded-lg bg-red-600 px-2.5 py-1 text-[9px] font-black text-white"
                            >
                              Remove
                            </button>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                  {existingImages.length +
                    newImages.length <
                    MAX_IMAGES && (
                    <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center transition hover:border-emerald-300 hover:bg-emerald-50/40">

                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                        ＋
                      </span>

                      <span className="mt-3 text-sm font-black text-slate-800">
                        Add product images
                      </span>

                      <span className="mt-1 text-[11px] leading-5 text-slate-400">
                        JPG, PNG or WebP · Max 5 MB each
                      </span>

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={
                          handleNewImages
                        }
                        className="hidden"
                        disabled={
                          saving
                        }
                      />

                    </label>
                  )}

                  <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">

                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-500">
                      Image tip
                    </p>

                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      Use clear, well-lit photos of the actual vegetables.
                      The first image acts as the primary marketplace image.
                    </p>

                  </div>

                </SectionCard>

                {/* ====================================================== */}
                {/* SAVE PANEL                                              */}
                {/* ====================================================== */}

                <div className="sticky top-6 rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Publishing state
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-900">
                        Changes are live
                      </p>

                    </div>

                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      ✓
                    </span>

                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">

                    <div className="flex items-center justify-between">

                      <span className="text-xs font-semibold text-slate-500">
                        Product status
                      </span>

                      <ProductStatusPill
                        status={
                          productStatus
                        }
                      />

                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">

                      <span className="text-xs font-semibold text-slate-500">
                        Harvest
                      </span>

                      <span className="text-right text-xs font-black text-slate-800">
                        {form.harvestDate
                          ? formatDate(
                              form.harvestDate
                            )
                          : "Not set"}
                      </span>

                    </div>

                  </div>

                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >

                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        Save Product
                        <span>
                          →
                        </span>
                      </>
                    )}

                  </button>

                  <Link
                    to="/seller/products"
                    className="mt-3 block rounded-2xl border border-slate-200 px-5 py-3.5 text-center text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Cancel
                  </Link>

                  <p className="mt-4 text-center text-[10px] leading-5 text-slate-400">
                    Your product remains protected by
                    the seller authorization rules on the backend.
                  </p>

                </div>

                {/* ====================================================== */}
                {/* WORKFLOW                                                */}
                {/* ====================================================== */}

                <div className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6">

                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                    Marketplace workflow
                  </p>

                  <div className="mt-5 space-y-4">

                    <WorkflowStep
                      number="01"
                      title="Update listing"
                      text="Save the latest product details."
                      active
                    />

                    <WorkflowStep
                      number="02"
                      title="Marketplace review"
                      text="Admin moderation controls approval."
                    />

                    <WorkflowStep
                      number="03"
                      title="Customer visibility"
                      text="Approved products appear in the marketplace."
                    />

                  </div>

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

      <p className="mt-1 text-lg font-black text-white">
        {value}
      </p>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| WORKFLOW STEP
|--------------------------------------------------------------------------
*/

function WorkflowStep({
  number,
  title,
  text,
  active = false
}) {
  return (
    <div className="flex gap-3">

      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[10px] font-black ${
          active
            ? "bg-emerald-600 text-white"
            : "bg-white text-slate-400 shadow-sm"
        }`}
      >
        {number}
      </div>

      <div>

        <p className="text-xs font-black text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-[11px] leading-5 text-slate-400">
          {text}
        </p>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| LOADING SKELETON
|--------------------------------------------------------------------------
*/

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[28px] border border-slate-200 bg-white p-7">

      <div className="h-3 w-28 rounded-full bg-slate-100" />

      <div className="mt-4 h-7 w-56 rounded-xl bg-slate-100" />

      <div className="mt-6 space-y-4">

        <div className="h-12 rounded-2xl bg-slate-100" />

        <div className="h-12 rounded-2xl bg-slate-100" />

        <div className="h-24 rounded-2xl bg-slate-100" />

      </div>

    </div>
  );
}