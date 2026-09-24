import { sendError } from "../utils/response.js";

const validateRequest = (req, res, next) => {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNumber = Number(page);

    if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
      return sendError(res, 400, "Page must be a positive integer");
    }
  }

  if (limit !== undefined) {
    const limitNumber = Number(limit);

    if (!Number.isInteger(limitNumber) || limitNumber <= 0) {
      return sendError(res, 400, "Limit must be a positive integer");
    }
  }

  console.log("Request validation passed");

  next();
};

export default validateRequest;
