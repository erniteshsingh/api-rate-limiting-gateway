const authorizeAdmin = (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
  
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }
  
    console.log("Authorization successful");
  
    next();
  };
  
  export default authorizeAdmin;