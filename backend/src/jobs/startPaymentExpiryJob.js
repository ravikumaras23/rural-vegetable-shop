const processExpiredPayments =
  require("./paymentExpiryJob");

const startPaymentExpiryJob = () => {
  const interval = 60 * 1000;

  const run = async () => {
    try {
      await processExpiredPayments();
    } catch (error) {
      console.error(
        "Payment expiry job failed:",
        error.message
      );
    }
  };

  // Run once when the server starts.
  run();

  // Then check every 60 seconds.
  const timer = setInterval(
    run,
    interval
  );

  console.log(
    "Payment expiry job started"
  );

  return () => {
    clearInterval(timer);

    console.log(
      "Payment expiry job stopped"
    );
  };
};

module.exports =
  startPaymentExpiryJob;