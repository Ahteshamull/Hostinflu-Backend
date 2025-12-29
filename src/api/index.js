import express from "express";
import auth from "../auth/routes/index.js";
import user from "../users/routes/index.js";
import admin from "../admin/routes/index.js";
import legalDoc from "../legalDoc/routes/index.js";
import contact from "../contact/routes/index.js";
import notification from "../notification/routes/index.js";
import listing from "../listing/routes/index.js";
import search from "../search/routes/index.js";

const router = express.Router();
const baseurl = process.env.BASE_URL || "/api/v1";

router.use(baseurl, auth);
router.use(baseurl, user);
router.use(baseurl, admin);
router.use(baseurl, legalDoc);
router.use(baseurl, contact);
router.use(baseurl, notification);
router.use(baseurl, listing);
router.use(baseurl, search);

// 404 fallback for API
router.use(baseurl, (req, res) => {
  return res.status(404).send({ error: "No API Found On This Route" });
});

export default router;
