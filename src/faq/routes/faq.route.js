import express from "express";
import {
  createFaq,
  getAllFaqs,
  getFaqById,
  updateFaq,
  deleteFaq,
} from "../controller/faq.controller.js";
import { authenticateToken } from "../../helper/middlewares/auth.middleware.js";

const router = express.Router();

// localhost:3000/api/v1/faq/create-faq
router.post("/create-faq", authenticateToken, createFaq);

// localhost:3000/api/v1/faq/get-all-faqs
router.get("/get-all-faqs", getAllFaqs);

// localhost:3000/api/v1/faq/get-faq/:id
router.get("/get-faq/:id", getFaqById);

// localhost:3000/api/v1/faq/update-faq/:id
router.patch("/update-faq/:id", authenticateToken, updateFaq);

// localhost:3000/api/v1/faq/delete-faq/:id
router.delete("/delete-faq/:id", authenticateToken, deleteFaq);

export default router;
