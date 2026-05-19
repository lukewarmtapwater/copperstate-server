import { Router } from "express";
import { carSchema, statusEnum } from "../schemas/car-schema.js";
import pool from "../conn.js";
import upload from "../upload.js";
import validateImages from "../utils/validateImages.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { search, startDate, endDate, sort, page = 1, limit = 10, userId } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    let query = "SELECT *, (SELECT image_path FROM car_images WHERE car_id = cars.id LIMIT 1) as image FROM cars";
    let countQuery = "SELECT COUNT(*) as total FROM cars";
    const conditions = [];
    const values = [];

    if (userId) {
      conditions.push("createdBy = ?");
      values.push(userId);
    }

    if (search) {
      conditions.push(
        "(CONCAT(make, ' ', model, ' ', year) LIKE ? OR CONCAT(year, ' ', make, ' ', model) LIKE ?)"
      );
      const searchTerm = `%${search}%`;
      values.push(searchTerm, searchTerm);
    }

    if (startDate) {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart)) {
        conditions.push("createdOn >= ?");
        values.push(parsedStart);
      }
    }

    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd)) {
        conditions.push("createdOn <= ?");
        parsedEnd.setHours(23, 59, 59, 999);
        values.push(parsedEnd);
      }
    }

    if (conditions.length > 0) {
      const whereClause = " WHERE " + conditions.join(" AND ");
      query += whereClause;
      countQuery += whereClause;
    }

    if (sort === "Oldest to Latest") {
      query += " ORDER BY createdOn ASC";
    } else {
      query += " ORDER BY createdOn DESC";
    }

    query += " LIMIT ? OFFSET ?";
    const queryValues = [...values, limitNum, offset];

    const [rows] = await pool.query(query, queryValues);
    const [countRows] = await pool.query(countQuery, values);
    const [todayRows] = await pool.query(
      "SELECT COUNT(*) as today FROM cars WHERE DATE(createdOn) = CURDATE()"
    );

    const totalCount = countRows[0].total;
    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      cars: rows,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
      createdToday: todayRows[0].today,
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/create", upload.array("images"), async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const fieldErrors = {};

    const result = carSchema.safeParse(req.body);
    const imageErrors = validateImages(req.files, true);

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

router.get("/:carId", async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

router.put(
  "/:carId",
  authorizeRoles(["admin"]),
  upload.array("images"),
  async (req, res, next) => {
    const conn = await pool.getConnection();

    try {
      const carId = parseInt(req.params.carId);

      if (isNaN(carId)) {
        return res.status(400).json({ error: "Invalid car ID." });
      }

      await conn.beginTransaction();

      const [carRows] = await conn.execute("SELECT id FROM cars WHERE id = ?", [carId]);
      if (carRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: "Car not found." });
      }

      const fieldErrors = {};
      const result = carSchema.safeParse(req.body);

      if (!result.success) {
        Object.assign(fieldErrors, result.error.flatten().fieldErrors);
      }

      const [existingImages] = await conn.execute(
        "SELECT image_path FROM car_images WHERE car_id = ?",
        [carId]
      );

      let deletedImages = req.body.deletedImages || [];
      if (typeof deletedImages === "string") {
        deletedImages = [deletedImages];
      }

      const remainingImages = existingImages.filter(
        (img) => !deletedImages.includes(img.image_path)
      );

      const newImages = req.files || [];

      if (remainingImages.length + newImages.length === 0) {
        fieldErrors.images = ["At least one image is required."];
      } else {
        const imageErrors = validateImages(newImages, false);
        if (imageErrors.length > 0) {
          fieldErrors.images = imageErrors;
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        await conn.rollback();
        return res.status(400).json({ fieldErrors });
      }

      const data = result.data;

      await conn.execute(
        `UPDATE cars SET
         year = ?, make = ?, model = ?, location = ?, windshield = ?,
         rimDamage = ?, camera = ?, steering = ?, status = ?
         WHERE id = ?`,
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
          carId,
        ]
      );

      if (deletedImages.length > 0) {
        const placeholders = deletedImages.map(() => "?").join(",");
        await conn.execute(
          `DELETE FROM car_images WHERE car_id = ? AND image_path IN (${placeholders})`,
          [carId, ...deletedImages]
        );
      }

      if (newImages.length > 0) {
        const values = newImages.map((file) => [carId, file.filename]);
        await conn.query("INSERT INTO car_images (car_id, image_path) VALUES ?", [
          values,
        ]);
      }

      await conn.commit();

      const [rows] = await conn.execute("SELECT * FROM cars WHERE id = ?", [carId]);
      return res.status(200).json(rows[0]);
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  }
);

router.patch("/:carId/status", upload.none(), async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/:carId",
  authorizeRoles(["admin"]),
  async (req, res, next) => {
    const conn = await pool.getConnection();

    try {
      const carId = parseInt(req.params.carId);

      if (isNaN(carId)) {
        return res.status(400).json({ error: "Invalid car ID." });
      }

      const [carRows] = await conn.execute("SELECT id FROM cars WHERE id = ?", [
        carId,
      ]);

      if (carRows.length === 0) {
        return res.status(404).json({ error: "Car not found." });
      }

      await conn.beginTransaction();

      await conn.execute("DELETE FROM car_images WHERE car_id = ?", [carId]);
      await conn.execute("DELETE FROM cars WHERE id = ?", [carId]);

      await conn.commit();

      return res.status(200).json({ message: "Car deleted successfully." });
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  },
);

export default router;
