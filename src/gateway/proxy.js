import { createProxyMiddleware } from "http-proxy-middleware";
import { sendError } from "../utils/response.js";
import services from "../config/services.js";

import { canRequest, recordFailure, recordSuccess } from "./circuitBreaker.js";

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

    recordFailure(serviceName);

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

      proxyRes: (proxyRes) => {
        if (proxyRes.statusCode >= 200 && proxyRes.statusCode < 500) {
          recordSuccess(serviceName);
        }
      },
    },
  });

  return (req, res, next) => {
    if (!canRequest(serviceName)) {
      console.log(`${serviceName}: circuit OPEN, request blocked`);

      return sendError(res, 503, `${serviceName} temporarily unavailable`);
    }

    proxy(req, res, next);
  };
};

const productProxy = createServiceProxy(
  "Product service",
  services.products.url,
);

const userProxy = createServiceProxy("User service", services.users.url);

const orderProxy = createServiceProxy("Order service", services.orders.url);

export { productProxy, userProxy, orderProxy };
