import express from "express";

import logger from "./middleware/logger.js";
import validateRequest from "./middleware/validation.js";
import authenticate from "./middleware/auth.js";
import authorizeAdmin from "./middleware/authorization.js";
import gatewayRoutes from "./routes/gatewayRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import rateLimiter from "./middleware/rateLimeter.js";
import errorHandler from "./middleware/errorhandler.js";

const app = express();

app.use(express.json());

app.use(logger);
app.use(validateRequest);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "API Rate Limiting Gateway is running",
  });
});

app.get("/api/admin", authorizeAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to admin area",
  });
});

// Temporary client creation route
app.use("/api", clientRoutes);

// Gateway routes
app.use("/api", authenticate, rateLimiter, gatewayRoutes);

app.use(errorHandler);

export default app;
