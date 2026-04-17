import { Router } from "express";
import { hash, compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import database from "../conn.js";
import "dotenv/config";
import verifyToken from "../middleware/verifyToken.js";
import { loginSchema, signUpSchema } from "../schemas/user-schema.js";

const router = Router();

router.post("/sign-up", async (req, res) => {
  const result = signUpSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      fieldErrors: result.error.flatten().fieldErrors,
    });
  }

  const { email, password } = result.data;
  const col = database.collection("users");

  const oldUser = await col.findOne({ email: email.toLowerCase() });
  if (oldUser) {
    return res.status(409).json({
      success: false,
      error: "User already exists. Please login.",
    });
  }

  const encryptedUserPassword = await hash(password, 10);

  const user = {
    email: email.toLowerCase(),
    password: encryptedUserPassword,
    accountCreated: new Date(),
    lastLogin: new Date(),
    role: 3,
  };

  await col.insertOne(user);

  const token = jwt.sign({ email: user.email }, process.env.SECRET_KEY, {
    expiresIn: "3h",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 3 * 60 * 60 * 1000,
  });

  res.status(201).json({ success: true });
});

router.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      fieldErrors: result.error.flatten().fieldErrors,
    });
  }

  const { email, password } = result.data;
  const col = database.collection("users");
  const user = await col.findOne({ email: email.toLowerCase() });

  if (!user || !(await compare(password, user.password))) {
    return res
      .status(401)
      .json({ success: false, error: "Invalid email or password." });
  }

  await col.updateOne({ email }, { $set: { lastLogin: new Date() } });

  const token = jwt.sign({ email }, process.env.SECRET_KEY, {
    expiresIn: "3h",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 3 * 60 * 60 * 1000,
  });

  return res.status(200).json({ success: true });
});

router.get("/me", verifyToken, async (req, res) =>
  res.status(200).json(req.user),
);

router.post("/log-out", async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  res.status(200).json({ success: true });
});

export default router;
