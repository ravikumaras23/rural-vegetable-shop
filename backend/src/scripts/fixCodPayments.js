const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const Order = require("../models/Order");

const fixCodPayments = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "MongoDB connected"
    );

    const result =
      await Order.updateMany(
        {
          paymentMethod: "cod",
          orderStatus: "delivered",
          paymentStatus: {
            $ne: "paid"
          }
        },
        {
          $set: {
            paymentStatus: "paid"
          }
        }
      );

    console.log(
      `Matched orders: ${result.matchedCount}`
    );

    console.log(
      `Updated orders: ${result.modifiedCount}`
    );

    console.log(
      "COD payment repair completed."
    );
  } catch (error) {
    console.error(
      "COD payment repair failed:",
      error
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

fixCodPayments();