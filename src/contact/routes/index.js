import express from "express";

import contact from "./contact.route.js";

const router = express.Router();

// localhost:3000/api/v1/contact/
router.use("/contact", contact);

export default router;
