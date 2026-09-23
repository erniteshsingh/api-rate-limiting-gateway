const authenticate = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: "API key is required",
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      message: "Invalid API key",
    });
  }

  console.log("Authentication successful");

  next();
};

export default authenticate;
