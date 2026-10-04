import { createProxyMiddleware } from "http-proxy-middleware";
import { sendError } from "../utils/response.js";
import services from "../config/services.js";

const GATEWAY_TIMEOUT = Number(process.env.GATEWAY_TIMEOUT);

const MAX_RETRIES = Number(process.env.MAX_RETRIES);

const RETRY_DELAY = Number(process.env.RETRY_DELAY);

const createServiceProxy = (serviceName, target) => {
  let proxy;

  const handleProxyError = (error, req, res) => {
    console.error(`${serviceName} error:`, error.message);

    const retryCount = req.retryCount || 0;

    if (retryCount < MAX_RETRIES && !res.headersSent) {
      req.retryCount = retryCount + 1;

      console.log(
        `${serviceName}: retrying request (${req.retryCount}/${MAX_RETRIES})`,
      );

      setTimeout(() => {
        proxy(req, res);
      }, RETRY_DELAY);

      return;
    }

    if (!res.headersSent) {
      return sendError(res, 502, `${serviceName} unavailable`);
    }
  };

  proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: GATEWAY_TIMEOUT,

    on: {
      error: handleProxyError,
    },
  });

  return proxy;
};

const productProxy = createServiceProxy(
  "Product service",
  services.products.url,
);

const userProxy = createServiceProxy("User service", services.users.url);

const orderProxy = createServiceProxy("Order service", services.orders.url);

export { productProxy, userProxy, orderProxy };
