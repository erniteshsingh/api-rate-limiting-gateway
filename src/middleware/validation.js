const validateRequest = (req, res, next) => {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNumber = Number(page);

    if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer",
      });
    }
  }

  if (limit !== undefined) {
    const limitNumber = Number(limit);

    if (!Number.isInteger(limitNumber) || limitNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Limit must be a positive integer",
      });
    }
  }

  console.log("Request validation passed");

  next();
};

export default validateRequest;
