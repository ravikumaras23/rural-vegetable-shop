const authorize = (
  ...allowedRolesInput
) => {
  const allowedRoles =
    allowedRolesInput
      .flat(Infinity)
      .map((role) =>
        String(role || "")
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);

  return (
    req,
    res,
    next
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required."
      });
    }

    const userRole =
      String(
        req.user.role || ""
      )
        .trim()
        .toLowerCase();

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message:
          "Your account does not have a valid role."
      });
    }

    if (
      allowedRoles.length === 0
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Authorization roles are not configured."
      });
    }

    if (
      !allowedRoles.includes(
        userRole
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          `Access denied. Required role: ${allowedRoles.join(
            ", "
          )}. Your role: ${userRole}.`
      });
    }

    next();
  };
};

module.exports = {
  authorize
};