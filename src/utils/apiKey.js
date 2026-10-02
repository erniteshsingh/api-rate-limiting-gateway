import crypto from "crypto";

const generateApiKey = () => {
  const randomPart = crypto.randomBytes(32).toString("hex");

  return `rk_live_${randomPart}`;
};

const hashApiKey = (apiKey) => {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
};

export { generateApiKey, hashApiKey };
