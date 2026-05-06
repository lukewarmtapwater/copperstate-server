import { Router } from "express";
import { hash, compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../conn.js";
import "dotenv/config";
import verifyToken from "../middleware/verifyToken.js";
import { loginSchema, signUpSchema, roleEnum } from "../schemas/user-schema.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

router.get("/", verifyToken, authorizeRoles(["admin"]), async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, email, lastLogin, createdOn, role FROM users",
  );
  return res.status(200).json(rows);
});

router.post("/sign-up", async (req, res) => {
  const result = signUpSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      fieldErrors: result.error.flatten().fieldErrors,
    });
  }

  const { email, password } = result.data;

  const [existing] = await pool.execute(
    "SELECT id FROM users WHERE email = ?",
    [email.toLowerCase()],
  );

  if (existing.length > 0) {
    return res
      .status(409)
      .json({ error: "User already exists. Please login." });
  }

  const encryptedPassword = await hash(password, 10);

  const [insertResult] = await pool.execute(
    "INSERT INTO users (email, password, lastLogin, createdOn, role) VALUES (?, ?, NOW(), NOW(), 'unassigned')",
    [email.toLowerCase(), encryptedPassword],
  );

  const [newRows] = await pool.execute(
    "SELECT id, email, lastLogin, createdOn, role FROM users WHERE id = ?",
    [insertResult.insertId],
  );

  const token = jwt.sign({ email: newRows[0].email }, process.env.SECRET_KEY, {
    expiresIn: "3h",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 3 * 60 * 60 * 1000,
  });

  return res.status(201).json(newRows[0]);
});

router.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      fieldErrors: result.error.flatten().fieldErrors,
    });
  }

  const { email, password } = result.data;

  const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [
    email.toLowerCase(),
  ]);

  const user = rows[0];

  if (!user || !(await compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  await pool.execute("UPDATE users SET lastLogin = NOW() WHERE id = ?", [
    user.id,
  ]);

  const token = jwt.sign({ email: user.email }, process.env.SECRET_KEY, {
    expiresIn: "3h",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 3 * 60 * 60 * 1000,
  });

  const { password: _pw, ...safeUser } = user;
  return res.status(200).json(safeUser);
});

router.get("/me", verifyToken, async (req, res) =>
  res.status(200).json(req.user),
);

router.patch(
  "/:userId/role",
  verifyToken,
  authorizeRoles(["admin"]),
  async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    const { newRole } = req.body;
    if (!newRole) {
      return res.status(400).json({ error: "Incomplete body." });
    }

    const roleResult = roleEnum.safeParse(newRole);
    if (!roleResult.success) {
      return res.status(400).json({ error: "Invalid role." });
    }

    const [result] = await pool.execute(
      "UPDATE users SET role = ? WHERE id = ?",
      [newRole, userId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const [updated] = await pool.execute(
      "SELECT id, email, lastLogin, createdOn, role FROM users WHERE id = ?",
      [userId],
    );

    return res.status(200).json(updated[0]);
  },
);

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });
  return res.status(200).json({ message: "Logged out successfully." });
});

router.get("/:userId", verifyToken, async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID." });
  }

  const [userRows] = await pool.execute(
    "SELECT id, email, lastLogin, createdOn, role FROM users WHERE id = ?",
    [userId],
  );

  if (userRows.length === 0) {
    return res.status(404).json({ error: "User not found." });
  }

  const [carRows] = await pool.execute(
    "SELECT * FROM cars WHERE createdBy = ?",
    [userId],
  );

  return res.status(200).json({ user: userRows[0], cars: carRows });
});

export default router;
