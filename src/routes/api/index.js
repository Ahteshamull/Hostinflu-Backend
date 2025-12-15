import express from "express";
import auth from "./auth.js"; 
import user from "./user.js"; 
// import message from "./message.js";

const router = express.Router();

// localhost:3000/api/v1/auth/
router.use("/auth", auth);

// localhost:3000/api/v1/user/
router.use("/user", user);

// // localhost:3000/api/v1/message/
// router.use("/message", message);

export default router;
