import "dotenv/config";
import app from "./app.js";

import redis from "./config/redis.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
