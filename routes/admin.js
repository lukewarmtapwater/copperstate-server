import { Router } from "express";
import database from "../conn.js";

const router = Router();

router.get("/users", async (req, res) => {
  const col = database.collection("users");
  const users = await col.find({}, { projection: { password: 0 } }).toArray();

  res.status(200).json(users.filter((user) => user.email !== req.user.email));
});

router.post("/change-role", async (req, res) => {
  const { userEmail, role } = req.body;

  if (!userEmail || (!role && role !== 0)) {
    return res.status(400).json({ success: false, error: "Incomplete body." });
  }

  if (req.user.email === userEmail) {
    return res.status(403).json({
      success: false,
      error: "You cannot update your own role.",
    });
  }

  const col = database.collection("users");

  await col.updateOne(
    { email: userEmail },
    { $set: { role } },
    { returnDocument: "after" },
  );

  return res.status(200).json({ success: true });
});

export default router;
