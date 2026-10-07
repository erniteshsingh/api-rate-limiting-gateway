import { hashApiKey } from "../utils/apiKey.js";
import Client from "../model/client.model.js";
import { sendError } from "../utils/response.js";

const authenticate = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return sendError(res, 401, "API key is required");
    }

    const apiKeyHash = hashApiKey(apiKey);

    const client = await Client.findOne({ apiKeyHash });

    if (!client) {
      return sendError(res, 401, "Invalid API key ");
    }

    if (client.status !== "active") {
      return sendError(res, 401, "API key is revoked");
    }

    req.client = client;

    console.log(`Authentication successful: ${client.name} (${client.plan})`);

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return sendError(res, 500, "Authentication service error");
  }
};

export default authenticate;
