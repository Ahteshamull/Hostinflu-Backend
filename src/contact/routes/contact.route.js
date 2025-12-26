import express from "express";
import multer from "multer";
import { createContact } from "../controller/contact.controller.js";

const router = express.Router();

// Configure multer for form-data
const upload = multer();

//localhost:3000/api/v1/contact/create-contact
router.post("/create-contact", upload.none(), createContact);

export default router;
