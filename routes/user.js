import { Router } from "express";
import { hash, compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import database from "../conn.js";
import "dotenv/config";
import verifyToken from "../middleware/verifyToken.js";

/* 
  4 states: Admin, Mechanic, Inspector, Unassigned
  0: Admin
  1: Inspector
  2: Mechanic
  3: Unassigned
  */

const router = Router();

router.post("/sign-up", async (req, res) => {
  const { email, password } = req.body;

  if (!(email && password)) {
    return res.status(400).json({ error: "Provide email and password." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  if (password.length < 5) {
    return res.status(400).json({ error: "Password is too small." });
  }

  if (!req.body["repeat-password"]) {
    return res.status(400).json({ error: "You have to repeat the password." });
  }

  if (password != req.body["repeat-password"]) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  if (!req.body["remember"] || req.body["remember"] === "off") {
    return res
      .status(400)
      .json({ error: "You have to agree to the terms and conditions." });
  }

  const col = database.collection("users");

  const oldUser = await col.findOne({ email: email.toLowerCase() });
  if (oldUser) {
    return res
      .status(409)
      .json({ error: "User already exists. Please login." });
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
  });

  res.status(201).json({ success: true });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!(email && password)) {
    return res.status(400).json({ error: "Provide both email and password." });
  }

  const col = database.collection("users");
  const user = await col.findOne({ email: email.toLowerCase() });

  if (!user || !(await compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  await col.updateOne({ email }, { $set: { lastLogin: new Date() } });

  const token = jwt.sign({ email }, process.env.SECRET_KEY, {
    expiresIn: "3h",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  return res.status(200).json({ success: true });
});

router.get("/me", verifyToken, async (req, res) =>
  res.status(200).json(req.user),
);

router.get("/log-out", async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    domain: ".copperstate-server.vercel.app",
    path: "/",
  });

  return res.status(200).json({ success: true });
});

export default router;
