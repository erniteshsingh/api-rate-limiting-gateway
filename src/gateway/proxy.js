import { createProxyMiddleware } from "http-proxy-middleware";

const handleProxyError = (serviceName) => {
  return (error, req, res) => {
    console.error(`${serviceName} error:`, error.message);

    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message: `${serviceName} unavailable`,
      });
    }
  };
};

const productProxy = createProxyMiddleware({
  target: process.env.PRODUCT_SERVICE_URL,
  changeOrigin: true,

  on: {
    error: handleProxyError("Product service"),
  },
});

const userProxy = createProxyMiddleware({
  target: process.env.USER_SERVICE_URL,
  changeOrigin: true,

  on: {
    error: handleProxyError("User service"),
  },
});

export { productProxy, userProxy };
