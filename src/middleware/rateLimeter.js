const buckets = new Map();

const BUCKET_CAPACITY = 5;
const REFILL_RATE = 1;

const rateLimiter = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const currentTime = Date.now();

  let bucket = buckets.get(apiKey);

  if (!bucket) {
    bucket = {
      tokens: BUCKET_CAPACITY,
      lastRefillTime: currentTime,
    };
  }

  const elapsedTime = (currentTime - bucket.lastRefillTime) / 1000;

  const newTokens = elapsedTime * REFILL_RATE;

  bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + newTokens);

  bucket.lastRefillTime = currentTime;

  if (bucket.tokens < 1) {
    buckets.set(apiKey, bucket);

    return res.status(429).json({
      success: false,
      message: "Too many requests",
      statusCode: 429,
    });
  }

  bucket.tokens -= 1;

  buckets.set(apiKey, bucket);

  next();
};

export default rateLimiter;
