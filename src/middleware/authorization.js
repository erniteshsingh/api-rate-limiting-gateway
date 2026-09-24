import { sendError } from "../utils/response.js";

const authorizeAdmin = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (apiKey !== process.env.ADMIN_API_KEY) {
    return sendError(res, 403, "Admin access required");
  }

  console.log("Authorization successful");

  next();
};

export default authorizeAdmin;
