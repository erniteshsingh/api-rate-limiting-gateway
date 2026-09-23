import express from "express";
import { productProxy, userProxy } from "../gateway/proxy.js";

const router = express.Router();

router.use("/products", productProxy);
router.use("/users", userProxy);

export default router;