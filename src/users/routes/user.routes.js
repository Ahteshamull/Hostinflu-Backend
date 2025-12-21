import express from "express";
import { allUser } from "../controller/user.controller.js";
const router = express.Router();

//localhost:3000/api/v1/user/all-users
router.get("/all-users", allUser);
export default router;
