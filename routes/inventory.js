import { Router } from "express";
import { carSchema, statusEnum } from "../schemas/car-schema.js";
import pool from "../conn.js";

const router = Router();

router.get("/", async (req, res) => {
  const [rows] = await pool.execute("SELECT * FROM cars");
  return res.status(200).json({ cars: rows, user: req.user });
});

router.post("/create", async (req, res) => {
  const result = carSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      fieldErrors: result.error.flatten().fieldErrors,
    });
  }

  const {
    year,
    make,
    model,
    location,
    windshield,
    rimDamage,
    camera,
    steering,
    status,
  } = result.data;

  const [insertResult] = await pool.execute(
    `INSERT INTO cars
       (year, make, model, location, windshield, rimDamage, camera, steering,
        status, statusLastUpdated, statusUpdatedBy, createdOn, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)`,
    [
      year,
      make,
      model,
      location,
      windshield,
      rimDamage,
      camera,
      steering,
      status,
      req.user.id,
      req.user.id,
    ],
  );

  const [rows] = await pool.execute("SELECT * FROM cars WHERE id = ?", [
    insertResult.insertId,
  ]);

  return res.status(201).json(rows[0]);
});

router.get("/:carId", async (req, res) => {
  const carId = parseInt(req.params.carId);
  if (isNaN(carId)) {
    return res.status(400).json({ error: "Invalid car ID." });
  }

  const [rows] = await pool.execute("SELECT * FROM cars WHERE id = ?", [carId]);

  if (rows.length === 0) {
    return res.status(404).json({ error: "Car not found." });
  }

  return res.status(200).json(rows[0]);
});

router.patch("/:carId/status", async (req, res) => {
  const carId = parseInt(req.params.carId);
  if (isNaN(carId)) {
    return res.status(400).json({ error: "Invalid car ID." });
  }

  const { newStatus } = req.body;
  if (!newStatus) {
    return res.status(400).json({ error: "Incomplete body." });
  }

  const result = statusEnum.safeParse(newStatus);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid status." });
  }

  await pool.execute(
    "UPDATE cars SET status = ?, statusLastUpdated = NOW(), statusUpdatedBy = ? WHERE id = ?",
    [newStatus, req.user.id, carId],
  );

  const [rows] = await pool.execute("SELECT * FROM cars WHERE id = ?", [carId]);

  if (rows.length === 0) {
    return res.status(404).json({ error: "Car not found." });
  }

  return res.status(200).json(rows[0]);
});

export default router;
