import { Router } from "express";
import { carSchema, statusEnum } from "../schemas/car-schema.js";
import getDatabase from "../conn.js";
import { ObjectId } from "mongodb";

const router = Router();

router.get("/", async (req, res) => {
  const database = await getDatabase();
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

  const database = await getDatabase();
  const col = database.collection("inventory");
  await col.insertOne({
    ...result.data,
    status: {
      value: result.data.status,
      lastUpdated: new Date(),
      updatedBy: req.user._id,
    },
    createdOn: new Date(),
    postedBy: req.user._id,
  });

  return res.status(201).json(result);
});

router.get("/:carId", async (req, res) => {
  const { carId } = req.params;
  const database = await getDatabase();
  const col = database.collection("inventory");
  const car = await col.findOne({ _id: new ObjectId(carId) });

  if (!car) {
    return res.status(404).json({
      error: "Car not found.",
    });
  }

  return res.status(200).json(car);
});

router.patch("/:carId/status", async (req, res) => {
  const { carId } = req.params;
  const { newStatus } = req.body;

  if (!newStatus) {
    return res.status(400).json({ error: "Incomplete body." });
  }

  const result = statusEnum.safeParse(newStatus);

  if (!result.success) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const database = await getDatabase();
  const col = database.collection("inventory");
  const updatedCar = await col.findOneAndUpdate(
    { _id: new ObjectId(carId) },
    {
      $set: {
        status: {
          value: newStatus,
          lastUpdated: new Date(),
          updatedBy: req.user._id,
        },
      },
    },
    {
      returnDocument: "after",
    },
  );

  return res.status(200).json(updatedCar);
});

export default router;
