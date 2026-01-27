import { Router } from "express";

import {
  authenticateToken,
  requireHostRole,
} from "../../helper/middlewares/auth.middleware.js";
const router = Router();

import {
  createCheckoutSession,
  webhook,
  capturePayment,
  getPaymentStatus,
  getUserPayments,
} from "../controller/payment.controller.js";

// localhost:3000/api/v1/payment/checkout-session/:collaborationId
router.post(
  "/checkout-session/:collaborationId",
  authenticateToken,
  requireHostRole,

  createCheckoutSession,
);

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_KEY;
// console.log(STRIPE_WEBHOOK_SECRET);

// localhost:3000/api/v1/payment/webhook
router.post("/webhook", webhook);

// localhost:3000/api/v1/payment/capture/:paymentId
router.post(
  "/capture/:paymentId",
  authenticateToken,
  requireHostRole,
  capturePayment,
);

// localhost:3000/api/v1/payment/status/:paymentId
router.get("/status/:paymentId", authenticateToken, getPaymentStatus);

// localhost:3000/api/v1/payment/my-payments
router.get("/my-payments", authenticateToken, getUserPayments);

export default router;
