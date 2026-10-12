import { sendError } from "../utils/response.js";

const errorHandler = (err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return sendError(
      res,
      413,
      "Request body too large. Maximum allowed size is 100kb.",
    );
  }

  console.error("Unhandled error:", err);

  return sendError(res, 500, "Internal server error");
};

export default errorHandler;
