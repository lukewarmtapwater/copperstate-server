import { Router } from "express";
import { hash, compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import database from "../conn.js";
import "dotenv/config";
import verifyToken from "../middleware/verifyToken.js";
import { loginSchema, signUpSchema } from "../schemas/user-schema.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { ObjectId } from "mongodb";

const router = Router();

router.get("/", verifyToken, authorizeRoles([0]), async (req, res) => {
  const col = database.collection("users");
  const users = await col.find({}, { projection: { password: 0 } }).toArray();

  return res.status(200).json(users);
});

router.post("/sign-up", async (req, res) => {
  const result = signUpSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      fieldErrors: result.error.flatten().fieldErrors,
    });
  }

  const { email, password } = result.data;
  const col = database.collection("users");

  const oldUser = await col.findOne({ email: email.toLowerCase() });
  if (oldUser) {
    return res.status(409).json({
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

  return res.status(201).json(user);
});

router.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      fieldErrors: result.error.flatten().fieldErrors,
    });
  }

  const { email, password } = result.data;
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
    maxAge: 3 * 60 * 60 * 1000,
  });

  return res.status(200).json(user);
});

router.get("/me", verifyToken, async (req, res) =>
  res.status(200).json(req.user),
);

router.post(
  "/change-role",
  verifyToken,
  authorizeRoles([0]),
  async (req, res) => {
    const { userId, role } = req.body;

    if (!userId || (!role && role !== 0)) {
      return res.status(400).json({ error: "Incomplete body." });
    }

    const col = database.collection("users");

    const updatedUser = await col.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { role } },
      { returnDocument: "after" },
    );

    return res.status(200).json(updatedUser);
  },
);

router.get("/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;
  const usersCol = database.collection("users");
  const inventoryCol = database.collection("inventory");
  const user = await usersCol.findOne({ _id: new ObjectId(userId) });

  if (!user) {
    return res.status(404).json({
      error: "User not found.",
    });
  }

  const cars = await inventoryCol
    .find({ postedBy: new ObjectId(userId) })
    .toArray();

  return res.status(200).json({ cars, user });
});

export default router;
