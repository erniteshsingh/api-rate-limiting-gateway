import redis from "../config/redis.js";
import { sendError } from "../utils/response.js";

const BUCKET_TTL = Number(process.env.RATE_LIMIT_TTL);

const rateLimiterScript = `
  local tokens = redis.call("HGET", KEYS[1], "tokens")
  local lastRefillTime = redis.call("HGET", KEYS[1], "lastRefillTime")

  local capacity = tonumber(ARGV[1])
  local refillRate = tonumber(ARGV[2])
  local currentTime = tonumber(ARGV[3])
  local bucketTTL = tonumber(ARGV[4])

  if not tokens then
    tokens = capacity
    lastRefillTime = currentTime
  else
    tokens = tonumber(tokens)
    lastRefillTime = tonumber(lastRefillTime)

    local elapsedTime =
      (currentTime - lastRefillTime) / 1000

    local newTokens =
      elapsedTime * refillRate

    tokens = math.min(
      capacity,
      tokens + newTokens
    )

    lastRefillTime = currentTime
  end

  if tokens < 1 then
    redis.call(
      "HSET",
      KEYS[1],
      "tokens",
      tokens,
      "lastRefillTime",
      lastRefillTime
    )

    redis.call(
      "EXPIRE",
      KEYS[1],
      bucketTTL
    )

    return 0
  end

  tokens = tokens - 1

  redis.call(
    "HSET",
    KEYS[1],
    "tokens",
    tokens,
    "lastRefillTime",
    lastRefillTime
  )

  redis.call(
    "EXPIRE",
    KEYS[1],
    bucketTTL
  )

  return 1
`;

const rateLimiter = async (req, res, next) => {
  try {
    const client = req.client;

    const { capacity, refillRate } = client.rateLimit;

    const currentTime = Date.now();

    const key = `rate_limit:${client._id}`;

    const result = await redis.eval(
      rateLimiterScript,
      1,
      key,
      capacity,
      refillRate,
      currentTime,
      BUCKET_TTL,
    );

    if (result === 0) {
      return sendError(res, 429, "Too many requests");
    }

    next();
  } catch (error) {
    console.error("Rate limiter error:", error.message);

    return sendError(res, 500, "Rate limiter error");
  }
};

export default rateLimiter;
