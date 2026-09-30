import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import uploadRoutes from "./routes/upload.routes.js";
import policyRoutes from "./routes/policy.routes.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
  });
});

app.use("/api/upload", uploadRoutes);
app.use("/api/policies", policyRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
