import { Router } from "express";
import carSchema from "../schemas/car-schema.js";
import database from "../conn.js";
import { ObjectId } from "mongodb";

const router = Router();

router.get("/", async (req, res) => {
  const col = database.collection("inventory");
  const cars = await col.find({}).toArray();

  return res.status(200).json({ cars, user: req.user });
});

router.post("/create", async (req, res) => {
  const result = carSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      fieldErrors: result.error.flatten().fieldErrors,
    });
  }

  const col = database.collection("inventory");
  await col.insertOne({
    ...result.data,
    createdOn: new Date(),
    postedBy: req.user._id,
  });

  return res.status(201).json(result);
});

router.get("/:carId", async (req, res) => {
  const { carId } = req.params;
  const col = database.collection("inventory");
  const car = await col.findOne({ _id: new ObjectId(carId) });

  if (!car) {
    return res.status(404).json({
      error: "Car not found.",
    });
  }

  return res.status(200).json(car);
});

export default router;
