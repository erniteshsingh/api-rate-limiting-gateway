const logger = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    const clientName = req.client?.name || "anonymous";

    const logLevel =
      res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";

    console.log(
      `[${logLevel}] [${req.method}] ${req.originalUrl} → ${res.statusCode} → ${duration}ms → client: ${clientName}`,
    );
  });

  next();
};

export default logger;
