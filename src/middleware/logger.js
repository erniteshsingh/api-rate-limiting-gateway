const logger = (req, res, next) => {
  console.log("2. Logger middleware");
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    console.log(
      `${req.method}method ${req.originalUrl}url → ${res.statusCode}code → ${duration}ms`,
    );
  });

  next();
};

export default logger;
