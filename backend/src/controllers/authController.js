const User = require("../models/User");

const {
  notifyUsers
} = require("../services/businessNotificationService");

const generateToken = require("../utils/generateToken");

/*
|--------------------------------------------------------------------------
| REGISTER CUSTOMER
|--------------------------------------------------------------------------
*/

const registerCustomer = async (req, res) => {
  const {
    name,
    email,
    phone,
    password
  } = req.body;

  if (
    !name ||
    !email ||
    !phone ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Name, email, phone and password are required"
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message:
        "Password must contain at least 8 characters"
    });
  }

  const normalizedEmail =
    email.toLowerCase().trim();

  const normalizedPhone =
    String(phone).trim();

  const existingUser =
    await User.findOne({
      $or: [
        {
          email: normalizedEmail
        },
        {
          phone: normalizedPhone
        }
      ]
    });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message:
        existingUser.email ===
        normalizedEmail
          ? "Email is already registered"
          : "Phone number is already registered"
    });
  }

  const user =
    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
      role: "customer"
    });

  const token =
    generateToken(user);

  return res.status(201).json({
    success: true,
    message:
      "Customer account created successfully",
    token,
    user
  });
};

/*
|--------------------------------------------------------------------------
| REGISTER SELLER
|--------------------------------------------------------------------------
*/

const registerSeller = async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    farmName,
    farmDescription,
    village,
    district,
    state
  } = req.body;

  if (
    !name ||
    !email ||
    !phone ||
    !password ||
    !farmName
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Name, email, phone, password and farm name are required"
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message:
        "Password must contain at least 8 characters"
    });
  }

  const normalizedEmail =
    email.toLowerCase().trim();

  const normalizedPhone =
    String(phone).trim();

  if (
    !/^[6-9][0-9]{9}$/.test(
      normalizedPhone
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Enter a valid 10-digit Indian mobile number"
    });
  }

  const existingUser =
    await User.findOne({
      $or: [
        {
          email: normalizedEmail
        },
        {
          phone: normalizedPhone
        }
      ]
    });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message:
        "Email or phone number is already registered"
    });
  }

  const seller =
    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
      role: "seller",

      sellerProfile: {
        farmName:
          farmName.trim(),

        farmDescription:
          farmDescription?.trim() ||
          "",

        village:
          village?.trim() ||
          "",

        district:
          district?.trim() ||
          "",

        state:
          state?.trim() ||
          "",

        approvalStatus:
          "pending"
      }
    });

  /*
  |--------------------------------------------------------------------------
  | NOTIFY ACTIVE ADMINS
  |--------------------------------------------------------------------------
  |
  | Notification failure must not make successful
  | seller registration fail.
  |
  */

  try {
    const admins =
      await User.find({
        role: "admin",
        isActive: true
      }).select("_id");

    if (admins.length > 0) {
      await notifyUsers({
        req,

        recipients:
          admins.map(
            (admin) =>
              admin._id
          ),

        type:
          "new_seller",

        title:
          "New seller registration",

        message:
          "A new seller has registered and is waiting for approval.",

        data: {
          sellerId:
            seller._id
        }
      });
    }
  } catch (
    notificationError
  ) {
    console.error(
      `New seller notification failed for ${seller._id}:`,
      notificationError.message
    );
  }

  /*
  |--------------------------------------------------------------------------
  | GENERATE SELLER TOKEN
  |--------------------------------------------------------------------------
  */

  const token =
    generateToken(seller);

  return res.status(201).json({
    success: true,
    message:
      "Seller account created. Waiting for administrator approval.",
    token,
    user: seller
  });
};

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

const login = async (req, res) => {
  const {
    email,
    password
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message:
        "Email and password are required"
    });
  }

  const normalizedEmail =
    email.toLowerCase().trim();

  const user =
    await User.findOne({
      email: normalizedEmail
    }).select("+password");

  if (!user) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid email or password"
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message:
        "Your account has been deactivated"
    });
  }

  const passwordMatches =
    await user.comparePassword(
      password
    );

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid email or password"
    });
  }

  user.lastLoginAt =
    new Date();

  await user.save({
    validateBeforeSave:
      false
  });

  const token =
    generateToken(user);

  /*
  |--------------------------------------------------------------------------
  | REMOVE PASSWORD FROM RESPONSE
  |--------------------------------------------------------------------------
  */

  user.password =
    undefined;

  return res.status(200).json({
    success: true,
    message:
      "Login successful",
    token,
    user
  });
};

/*
|--------------------------------------------------------------------------
| GET CURRENT USER
|--------------------------------------------------------------------------
*/

const getMe = async (
  req,
  res
) => {
  return res.status(200).json({
    success: true,
    user: req.user
  });
};

/*
|--------------------------------------------------------------------------
| UPDATE CURRENT USER PROFILE
|--------------------------------------------------------------------------
|
| PUT /api/auth/profile
|
| Allowed:
| - name
| - phone
|
| Seller only:
| - sellerProfile.farmName
| - sellerProfile.farmDescription
| - sellerProfile.village
| - sellerProfile.district
| - sellerProfile.state
|
| Never change from this endpoint:
| - email
| - password
| - role
| - isActive
| - seller approval status
| - payment credentials
|
*/

const updateProfile = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required."
      });
    }

    const {
      name,
      phone,
      sellerProfile
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | NAME VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      name !== undefined &&
      (!String(name).trim())
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name cannot be empty."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | LOAD USER
    |--------------------------------------------------------------------------
    */

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User account was not found."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE BASIC PROFILE
    |--------------------------------------------------------------------------
    */

    if (
      name !== undefined
    ) {
      user.name =
        String(name).trim();
    }

    /*
    |--------------------------------------------------------------------------
    | PHONE VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      phone !== undefined
    ) {
      const normalizedPhone =
        String(phone).trim();

      if (!normalizedPhone) {
        return res.status(400).json({
          success: false,
          message:
            "Phone number cannot be empty."
        });
      }

      if (
        !/^[6-9][0-9]{9}$/.test(
          normalizedPhone
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid 10-digit Indian mobile number."
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CHECK DUPLICATE PHONE
      |--------------------------------------------------------------------------
      */

      const phoneOwner =
        await User.findOne({
          phone:
            normalizedPhone,
          _id: {
            $ne: user._id
          }
        }).select("_id");

      if (phoneOwner) {
        return res.status(409).json({
          success: false,
          message:
            "This phone number is already registered with another account."
        });
      }

      user.phone =
        normalizedPhone;
    }

    /*
    |--------------------------------------------------------------------------
    | SELLER PROFILE UPDATE
    |--------------------------------------------------------------------------
    */

    if (
      user.role === "seller" &&
      sellerProfile &&
      typeof sellerProfile ===
        "object"
    ) {
      if (
        !user.sellerProfile
      ) {
        user.sellerProfile = {};
      }

      if (
        sellerProfile.farmName !==
        undefined
      ) {
        user.sellerProfile.farmName =
          String(
            sellerProfile.farmName
          ).trim();
      }

      if (
        sellerProfile.farmDescription !==
        undefined
      ) {
        user.sellerProfile.farmDescription =
          String(
            sellerProfile.farmDescription
          ).trim();
      }

      if (
        sellerProfile.village !==
        undefined
      ) {
        user.sellerProfile.village =
          String(
            sellerProfile.village
          ).trim();
      }

      if (
        sellerProfile.district !==
        undefined
      ) {
        user.sellerProfile.district =
          String(
            sellerProfile.district
          ).trim();
      }

      if (
        sellerProfile.state !==
        undefined
      ) {
        user.sellerProfile.state =
          String(
            sellerProfile.state
          ).trim();
      }

      /*
      |--------------------------------------------------------------------------
      | IMPORTANT
      |--------------------------------------------------------------------------
      |
      | Do NOT allow profile editing to modify
      | seller approval status.
      |
      */
    }

    /*
    |--------------------------------------------------------------------------
    | SAVE
    |--------------------------------------------------------------------------
    */

    await user.save();

    /*
    |--------------------------------------------------------------------------
    | REAL-TIME PROFILE UPDATE
    |--------------------------------------------------------------------------
    */

    const io =
      req.app.get("io");

    if (io) {
      io.to(
        `user:${user._id}`
      ).emit(
        "profile:updated",
        {
          userId:
            user._id,
          name:
            user.name,
          phone:
            user.phone,
          role:
            user.role,
          sellerProfile:
            user.role === "seller"
              ? {
                  farmName:
                    user
                      .sellerProfile
                      ?.farmName ||
                    "",

                  farmDescription:
                    user
                      .sellerProfile
                      ?.farmDescription ||
                    "",

                  village:
                    user
                      .sellerProfile
                      ?.village ||
                    "",

                  district:
                    user
                      .sellerProfile
                      ?.district ||
                    "",

                  state:
                    user
                      .sellerProfile
                      ?.state ||
                    "",

                  approvalStatus:
                    user
                      .sellerProfile
                      ?.approvalStatus ||
                    "pending"
                }
              : undefined
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | SUCCESS RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message:
        "Profile updated successfully.",
      user
    });
  } catch (error) {
    console.error(
      "Update profile error:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | DUPLICATE KEY HANDLING
    |--------------------------------------------------------------------------
    */

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "The updated information conflicts with an existing account."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | MONGOOSE VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      error?.name ===
      "ValidationError"
    ) {
      const messages =
        Object.values(
          error.errors || {}
        )
          .map(
            (item) =>
              item.message
          )
          .filter(Boolean);

      return res.status(400).json({
        success: false,
        message:
          messages[0] ||
          "Profile validation failed."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update profile."
    });
  }
};

/*
|--------------------------------------------------------------------------
| EXPORT CONTROLLERS
|--------------------------------------------------------------------------
*/

module.exports = {
  registerCustomer,
  registerSeller,
  login,
  getMe,
  updateProfile
};