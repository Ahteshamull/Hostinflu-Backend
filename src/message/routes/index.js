import express from "express";
import messageRoutes from "./message.route.js";

const router = express.Router();

// localhost:3000/api/v1/message/
router.use("/message", messageRoutes);

export default router;
