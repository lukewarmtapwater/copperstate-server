import jwt from "jsonwebtoken";
import "dotenv/config";
import database from "../conn.js";

async function verifyToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, error: "Not logged in!" });
  }

  const col = database.collection("users");

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await col.findOne({
      email: decoded.email,
    });
    const { password, ...safeUser } = user;

    user.token = token;
    req.user = safeUser;

    next();
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: "An error occurred. Check your token." });
  }
}

export default verifyToken;
