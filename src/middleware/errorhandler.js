import { sendError } from "../utils/response.js";

const errorHandler = (err, req, res, next) => {
  console.error("Unhandled error:", err);

  return sendError(res, 500, "Internal server error");
};

export default errorHandler;
