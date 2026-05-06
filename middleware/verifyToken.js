import jwt from "jsonwebtoken";
import "dotenv/config";
import pool from "../conn.js";

async function verifyToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const [rows] = await pool.execute(
      "SELECT id, email, role, lastLogin, createdOn FROM users WHERE email = ?",
      [decoded.email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "User not found." });
    }

    req.user = rows[0];

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

export default verifyToken;
