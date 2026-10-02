const {
  createNotification,
  createNotifications
} = require("./notificationService");

const getIO = (req) => {
  return req.app.get("io");
};

/*
 * Notify a single user.
 */
const notifyUser = async ({
  req,
  recipient,
  type,
  title,
  message,
  data = {}
}) => {
  if (!recipient) {
    return null;
  }

  return createNotification({
    recipient,
    type,
    title,
    message,
    data,
    io: getIO(req)
  });
};

/*
 * Notify multiple users.
 */
const notifyUsers = async ({
  req,
  recipients,
  type,
  title,
  message,
  data = {}
}) => {
  if (
    !Array.isArray(recipients) ||
    recipients.length === 0
  ) {
    return [];
  }

  return createNotifications({
    recipients,
    type,
    title,
    message,
    data,
    io: getIO(req)
  });
};

module.exports = {
  notifyUser,
  notifyUsers
};