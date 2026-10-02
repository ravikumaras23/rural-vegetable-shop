const mongoose = require("mongoose");
const dotenv = require("dotenv");

const User = require("../models/User");

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    const adminEmail =
      process.env.ADMIN_EMAIL
        ?.trim()
        .toLowerCase();

    const adminPassword =
      process.env.ADMIN_PASSWORD;

    const adminName =
      process.env.ADMIN_NAME ||
      "System Administrator";

    if (!adminEmail) {
      throw new Error(
        "ADMIN_EMAIL is missing from .env"
      );
    }

    if (!adminPassword) {
      throw new Error(
        "ADMIN_PASSWORD is missing from .env"
      );
    }

    if (adminPassword.length < 8) {
      throw new Error(
        "ADMIN_PASSWORD must contain at least 8 characters"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN PHONE
    |--------------------------------------------------------------------------
    |
    | User schema requires a phone number for every account.
    | Use a dedicated admin phone number from the environment.
    |
    */

    const adminPhone =
      process.env.ADMIN_PHONE?.trim();

    if (!adminPhone) {
      throw new Error(
        "ADMIN_PHONE is missing from .env"
      );
    }

    if (
      !/^[6-9][0-9]{9}$/.test(
        adminPhone
      )
    ) {
      throw new Error(
        "ADMIN_PHONE must be a valid 10-digit Indian phone number"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK EXISTING ADMIN
    |--------------------------------------------------------------------------
    */

    const existingAdmin =
      await User.findOne({
        email: adminEmail
      }).select("+password");

    if (existingAdmin) {
      if (existingAdmin.role !== "admin") {
        throw new Error(
          "The ADMIN_EMAIL already belongs to a non-admin user"
        );
      }

      console.log(
        "Admin account already exists."
      );

      await mongoose.disconnect();

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK PHONE
    |--------------------------------------------------------------------------
    */

    const existingPhone =
      await User.findOne({
        phone: adminPhone
      });

    if (existingPhone) {
      throw new Error(
        "ADMIN_PHONE is already registered to another user"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE ADMIN
    |--------------------------------------------------------------------------
    */

    const admin =
      await User.create({
        name: adminName.trim(),

        email: adminEmail,

        phone: adminPhone,

        password: adminPassword,

        role: "admin",

        isActive: true,

        isVerified: true
      });

    console.log(
      `Admin created successfully: ${admin.email}`
    );

    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected"
    );
  } catch (error) {
    console.error(
      "Admin creation failed:",
      error.message
    );

    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }

    process.exit(1);
  }
};

createAdmin();