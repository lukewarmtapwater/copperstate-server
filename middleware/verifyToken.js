import jwt from "jsonwebtoken";
import "dotenv/config";
import getDatabase from "../conn.js";

async function verifyToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Not logged in!" });
  }

  const database = await getDatabase();
  const col = database.collection("users");

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await col.findOne({ email: decoded.email });

    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    const { password, ...safeUser } = user;
    req.user = safeUser;

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

export default verifyToken;
