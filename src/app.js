import express from "express";
import proxy from "./gateway/proxy.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "API Rate Limiting Gateway is running",
  });
});

app.use("/api", proxy);

export default app;
