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

const app = express();
const port = process.env.PORT;

app.get("/", (req, res) => {
  res.send("Hey, this is copperstate server.");
});

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(helmet());
app.use(cookieParser());
app.use("/users", userRouter);
app.use(
  "/inventory",
  verifyToken,
  authorizeRoles(["admin", "inspector", "mechanic"]),
  inventoryRouter,
);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Copperstate server is listening on port ${port}`);
});
