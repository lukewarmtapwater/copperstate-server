function authorizeRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({
        error: "You are not high enough in the hierarchy to access this route.",
      });
    } else {
      next();
    }
  };
}

export default authorizeRole;
