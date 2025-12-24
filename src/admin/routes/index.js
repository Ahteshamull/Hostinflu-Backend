import express from "express";
import admin from "./admin.route.js";

const router = express.Router();

// localhost:3000/api/v1/admin/
router.use("/admin", admin);

export default router;
