import "dotenv/config";
import app from "./app.js";
import startHealthCheck from "./health/healthCheck.js";
import connectDB from "./config/db.js";

import redis from "./config/redis.js";

await connectDB();
startHealthCheck();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
