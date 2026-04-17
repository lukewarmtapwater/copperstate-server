function authorizeRole(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to access this route.",
      });
    }

    next();
  };
}

export default authorizeRole;
