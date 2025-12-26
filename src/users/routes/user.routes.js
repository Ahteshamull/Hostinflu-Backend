import express from "express";
import {
  allUser,
  singleUser,
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

//localhost:3000/api/v1/user/single-user/:id
router.get("/single-user/:id", singleUser);

//localhost:3000/api/v1/user/update-user/:id
router.patch("/update-user/:id", upload.single("image"), errorCheck, updateUser);

//localhost:3000/api/v1/user/delete-user/:id
router.delete("/delete-user/:id", deleteUser);

export default router;
