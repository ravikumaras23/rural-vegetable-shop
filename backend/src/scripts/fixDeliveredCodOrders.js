const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const Order = require("../models/Order");

const fixDeliveredCodOrders = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log("MongoDB connected");

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
      "Matched:",
      result.matchedCount
    );

    console.log(
      "Updated:",
      result.modifiedCount
    );

    console.log(
      "Delivered COD orders repaired successfully."
    );
  } catch (error) {
    console.error(
      "Repair failed:",
      error
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

fixDeliveredCodOrders();