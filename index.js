import express from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";
import userRouter from "./routes/user.js";
import adminRouter from "./routes/admin.js";
import cookieParser from "cookie-parser";
import verifyToken from "./middleware/verifyToken.js";
import authorizeRole from "./middleware/authorizeRole.js";
import errorHandler from "./middleware/errorHandler.js";

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
app.use("/user", userRouter);
app.use("/admin", verifyToken, authorizeRole(0), adminRouter);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Copperstate server is listening on port ${port}`);
});
