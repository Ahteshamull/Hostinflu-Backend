import express from "express";
import {
  allUser,
  updateUser,
  deleteUser,
} from "../controller/user.controller.js";
import {
  upload,
  errorCheck,
} from "../../helper/middlewares/imageControlMiddleware.js";
const router = express.Router();

//localhost:3000/api/v1/user/all-users
router.get("/all-users", allUser);

//localhost:3000/api/v1/user/update-user/:id
router.put("/update-user/:id", upload.single("image"), errorCheck, updateUser);

//localhost:3000/api/v1/user/delete-user/:id
router.delete("/delete-user/:id", deleteUser);

export default router;
