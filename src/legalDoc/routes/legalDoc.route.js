import express from "express";
import { createDoc, getDoc } from "../controller/legalDoc.controller.js";

const router = express.Router();

//localhost:3000/api/v1/legalDoc/create-doc/:content
router.patch("/create-doc/:content", createDoc);

//localhost:3000/api/v1/legalDoc/get-doc/:content
router.get("/get-doc/:content", getDoc);

export default router;
