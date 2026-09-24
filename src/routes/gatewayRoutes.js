import express from "express";
import { productProxy, userProxy,orderProxy } from "../gateway/proxy.js";

const router = express.Router();

router.use("/products", productProxy);
router.use("/users", userProxy);
router.use("/orders",orderProxy)

export default router;