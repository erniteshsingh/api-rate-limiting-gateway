const sendSuccess = (res, message, data = null, statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      ...(data !== null && { data }),
    });
  };
  
  const sendError = (res, statusCode, message) => {
    return res.status(statusCode).json({
      success: false,
      message,
      statusCode,
    });
  };
  
  export { sendSuccess, sendError };