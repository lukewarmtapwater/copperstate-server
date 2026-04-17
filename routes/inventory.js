import { Router } from "express";
import carSchema from "../schemas/car-schema.js";
import database from "../conn.js";

const router = Router();

router.get("/", async (req, res) => {
  const col = database.collection("inventory");
  const cars = await col.find({}).toArray();

  res.status(200).json({ cars });
});

router.post("/create", async (req, res) => {
  const result = carSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: result.error.flatten().fieldErrors,
    });
  }

  const col = database.collection("inventory");
  await col.insertOne({
    ...result.data,
    createdOn: new Date(),
    postedBy: req.user.email,
  });

  res.status(200).json(result);
});

export default router;
