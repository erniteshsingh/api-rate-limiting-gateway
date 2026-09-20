import { createProxyMiddleware } from "http-proxy-middleware";

const proxy = createProxyMiddleware({
  target: process.env.BACKEND_URL,
  changeOrigin: true,
});

export default proxy;
