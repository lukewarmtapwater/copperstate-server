import { Router } from "express";
import { carSchema, statusEnum } from "../schemas/car-schema.js";
import pool from "../conn.js";
import upload from "../upload.js";
import validateImages from "../utils/validateImages.js";

const router = Router();

router.get("/", async (req, res) => {
  const [rows] = await pool.execute("SELECT * FROM cars");
  return res.status(200).json({ cars: rows, user: req.user });
});

router.post("/create", upload.array("images"), async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const fieldErrors = {};

    const result = carSchema.safeParse(req.body);
    const imageErrors = validateImages(req.files);

    if (!result.success) {
      Object.assign(fieldErrors, result.error.flatten().fieldErrors);
    }

    if (imageErrors.length > 0) {
      fieldErrors.images = imageErrors;
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({ fieldErrors });
    }

    const data = result.data;

    const [insertResult] = await conn.execute(
      `INSERT INTO cars
       (year, make, model, location, windshield, rimDamage, camera, steering,
        status, statusLastUpdated, statusUpdatedBy, createdOn, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)`,
      [
        data.year,
        data.make,
        data.model,
        data.location,
        data.windshield,
        data.rimDamage,
        data.camera,
        data.steering,
        data.status,
        req.user.id,
        req.user.id,
      ],
    );

    const carId = insertResult.insertId;

    const values = req.files.map((file) => [carId, file.filename]);

    if (values.length > 0) {
      await conn.query("INSERT INTO car_images (car_id, image_path) VALUES ?", [
        values,
      ]);
    }

    await conn.commit();

    const [rows] = await conn.execute("SELECT * FROM cars WHERE id = ?", [
      carId,
    ]);

    return res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ error: "Something went wrong" });
  } finally {
    conn.release();
  }
});

router.get("/:carId", async (req, res) => {
  const carId = parseInt(req.params.carId);

  if (isNaN(carId)) {
    return res.status(400).json({ error: "Invalid car ID." });
  }

  const [carRows] = await pool.execute("SELECT * FROM cars WHERE id = ?", [
    carId,
  ]);

  if (carRows.length === 0) {
    return res.status(404).json({ error: "Car not found." });
  }

  const [imageRows] = await pool.execute(
    "SELECT image_path FROM car_images WHERE car_id = ?",
    [carId],
  );

  const car = carRows[0];

  car.images = imageRows.map((img) => img.image_path);

  return res.status(200).json(car);
});

router.patch("/:carId/status", upload.none(), async (req, res) => {
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
