import express from "express";
import {
  dashboard,
} from "../controller/dashboard.controller.js";

const router = express.Router();

// Main dashboard endpoint - returns all data
// localhost:3000/api/v1/dashboard/
router.get("/", dashboard);



export default router;
