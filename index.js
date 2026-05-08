import express from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";
import userRouter from "./routes/user.js";
import cookieParser from "cookie-parser";
import verifyToken from "./middleware/verifyToken.js";
import authorizeRoles from "./middleware/authorizeRoles.js";
import errorHandler from "./middleware/errorHandler.js";
import inventoryRouter from "./routes/inventory.js";
import upload from "./upload.js";
import path from "path";
import fs from "fs";

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(helmet());
app.use(cookieParser());
app.use("/users", upload.none(), userRouter);
app.use(
  "/inventory",
  verifyToken,
  authorizeRoles(["admin", "inspector", "mechanic"]),
  inventoryRouter,
);
app.get(
  "/uploads/:imageName",
  verifyToken,
  authorizeRoles(["admin", "inspector", "mechanic"]),
  (req, res) => {
    const imagePath = path.join(process.cwd(), "uploads", req.params.imageName);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        error: "Image not found",
      });
    }

    return res.sendFile(imagePath);
  },
);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Copperstate server is listening on port ${port}`);
});
