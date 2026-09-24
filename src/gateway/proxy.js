import { createProxyMiddleware } from "http-proxy-middleware";
import { sendError } from "../utils/response.js";
import services from "../config/services.js";

const handleProxyError = (serviceName) => {
  return (error, req, res) => {
    console.error(`${serviceName} error:`, error.message);

    if (!res.headersSent) {
      return sendError(res, 502, `${serviceName} unavailable`);
    }
  };
};

const productProxy = createProxyMiddleware({
  target: services.products.url,
  changeOrigin: true,

  on: {
    error: handleProxyError("Product service"),
  },
});

const userProxy = createProxyMiddleware({
  target: services.users.url,
  changeOrigin: true,

  on: {
    error: handleProxyError("User service"),
  },
});

const orderProxy = createProxyMiddleware({
  target: services.orders.url,
  changeOrigin: true,

  on: {
    error: handleProxyError("Order service"),
  },
});

export { productProxy, userProxy, orderProxy };
