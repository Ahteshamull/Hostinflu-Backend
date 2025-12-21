import express from "express";
import auth from "../auth/routes/index.js";
import user from "../users/routes/index.js";

const router = express.Router();
const baseurl = process.env.BASE_URL || "/api/v1";

router.use(baseurl, auth);
router.use(baseurl, user);

// 404 fallback for API
router.use(baseurl, (req, res) => {
  return res.status(404).send({ error: "No API Found On This Route" });
});

export default router;
