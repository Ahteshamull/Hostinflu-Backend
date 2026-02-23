import express from "express";
import auth from "../auth/routes/index.js";
import user from "../users/routes/index.js";
import admin from "../admin/routes/index.js";
import legalDoc from "../legalDoc/routes/index.js";
import contact from "../contact/routes/index.js";
import notification from "../notification/routes/index.js";
import listing from "../listing/routes/index.js";
import search from "../search/routes/index.js";
import deal from "../deals/routes/index.js";
import collaboration from "../collaboration/routes/index.js";
import message from "../message/routes/index.js";
import dashboard from "../dashboard/routes/index.js";
import redeem from "../redeem/routes/index.js";
import referral from "../referral/routes/index.js";
import payment from "../payment/routes/index.js";
import transaction from "../Transactions/routes/index.js";
import earning from "../earning/routes/index.js";
import review from "../review/routes/index.js";
import gift from "../gift/routes/index.js";
import faq from "../faq/routes/index.js";
import report from "../report/routes/index.js";

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
router.use(baseurl, deal);
router.use(baseurl, collaboration);
router.use(baseurl, message);
router.use(baseurl, dashboard);
router.use(baseurl, redeem);
router.use(baseurl, referral);
router.use(baseurl, payment);
router.use(baseurl, transaction);
router.use(baseurl, earning);
router.use(baseurl, review);
router.use(baseurl, gift);
router.use(baseurl, faq);
router.use(baseurl, report);

// Update code
router.use(baseurl, (req, res) => {
  return res.status(404).send({
    success: false,
    error: true,
    message: "No matching API route found for this request",
  });
});

export default router;
