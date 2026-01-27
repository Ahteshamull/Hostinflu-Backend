import mongoose from "mongoose";
import userModel from "../../auth/schema/auth.modal.js";
import Collaborations from "../../collaboration/schema/collaboration.modal.js";
import Payment from "../schema/payment.modal.js";
import Deal from "../../deals/schema/deal.modal.js";
import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const createCheckoutSession = async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message:
          "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.",
      });
    }

    const userId = req.user?._id || req.user?.id || req.user?.userId;
    const { collaborationId } = req.params;
    const { description } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    if (!collaborationId) {
      return res.status(400).json({
        success: false,
        message: "Collaboration ID is required",
      });
    }

    // Find user
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find collaboration with populated deal
    const collaboration = await Collaborations.findById(
      collaborationId,
    ).populate({
      path: "selectDeal",
      model: "Deal",
    });

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found",
      });
    }

    // Debug: Check what we got
    // Collaboration data already available

    // If selectDeal is still not populated, try manual fetch
    if (
      !collaboration.selectDeal ||
      typeof collaboration.selectDeal === "string"
    ) {
      const dealData = await Deal.findById(collaboration.selectDeal);
      collaboration.selectDeal = dealData;
    }

    // Additional check: try to fetch deal by the original ID from database
    if (!collaboration.selectDeal) {
      const originalCollaboration =
        await Collaborations.findById(collaborationId);

      if (originalCollaboration.selectDeal) {
        const dealData = await Deal.findById(originalCollaboration.selectDeal);
        collaboration.selectDeal = dealData;
      }
    }

    // Check if collaboration belongs to user
    if (collaboration.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only create payment for your own collaborations",
      });
    }

    // Calculate amount from collaboration payment or deal compensation
    let amount = 0;

    if (collaboration.payment && collaboration.payment > 0) {
      amount = collaboration.payment;
    } else if (
      collaboration.selectDeal?.compensation?.directPayment === true &&
      collaboration.selectDeal?.compensation?.paymentAmount
    ) {
      amount = parseFloat(collaboration.selectDeal.compensation.paymentAmount);
    } else if (collaboration.selectDeal?.compensation?.paymentAmount) {
      amount = parseFloat(collaboration.selectDeal.compensation.paymentAmount);
    } else {
      return res.status(400).json({
        success: false,
        message:
          "No payment amount found for this collaboration. Please ensure the deal has paymentAmount configured in compensation.",
        debug: {
          collaborationPayment: collaboration.payment,
          dealCompensation: collaboration.selectDeal?.compensation,
          hasDirectPayment:
            collaboration.selectDeal?.compensation?.directPayment,
          hasPaymentAmount:
            !!collaboration.selectDeal?.compensation?.paymentAmount,
        },
      });
    }

    // Convert amount to cents (Stripe uses cents)
    const amountInCents = Math.round(amount * 100);

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Collaboration Payment - ${collaboration.selectDeal?.description || "Service"}`,
              description: description || "Payment for collaboration",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,

      // Hold payment in platform account for manual capture
      payment_intent_data: {
        capture_method: "manual",
        description: description || "Payment for collaboration",
        metadata: {
          collaborationId: collaboration._id.toString(),
          userId: userId.toString(),
          influencerId: collaboration.selectInfluencerOrHost?.toString(),
        },
      },
    });

    // Get payment intent ID
    let paymentIntentId = checkoutSession.payment_intent;

    // Create payment record in database
    const payment = await Payment.create({
      amount: amount,
      description: description || "Payment for collaboration",
      currency: "usd",
      sessionId: checkoutSession.id,
      paymentIntentId: paymentIntentId,
      status: "PENDING",
      provider: "STRIPE",
      userId: userId,
      title: collaboration._id,
    });

    return res.status(200).json({
      success: true,
      message: "Checkout session created successfully",
      data: {
        checkoutUrl: checkoutSession.url,
        checkoutSessionId: checkoutSession.id,
        paymentId: payment._id,
        amount: amount,
      },
    });
  } catch (error) {
    // console.error("Error creating checkout session:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating checkout session",
      error: error.message,
    });
  }
};

export const webhook = async (req, res) => {
  try {
    console.log("🔔 Webhook received");

    // Check if Stripe is configured
    if (!stripe) {
      console.log("❌ Stripe not configured in webhook");
      return res.status(500).json({
        success: false,
        message:
          "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.",
      });
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_KEY;

    if (!sig || !webhookSecret) {
      console.log("❌ Missing webhook signature or secret");
      return res.status(400).json({
        success: false,
        message: "Stripe signature or webhook secret not found",
      });
    }

    let event;

    try {
      // Use raw body for signature verification
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      console.log("✅ Webhook signature verified, event type:", event.type);
    } catch (err) {
      console.log("❌ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        console.log("💰 Processing checkout.session.completed");
        const session = event.data.object;

        // Find payment by session ID
        const payment = await Payment.findOne({ sessionId: session.id });

        if (payment) {
          console.log("✅ Payment found:", payment._id);

          // Update payment status and payment intent ID
          await Payment.findByIdAndUpdate(payment._id, {
            status: "SUCCESS",
            paymentIntentId: session.payment_intent,
          });

          console.log("✅ Payment status updated to SUCCESS");

          // Update collaboration payment status and status
          const updatedCollab = await Collaborations.findByIdAndUpdate(
            payment.title,
            {
              paymentStatus: "paid",
              status: "ongoing",
            },
            { new: true },
          );

          console.log("✅ Collaboration updated:", {
            id: updatedCollab._id,
            status: updatedCollab.status,
            paymentStatus: updatedCollab.paymentStatus,
          });
        } else {
          console.log("❌ Payment not found for session:", session.id);
        }
        break;

      case "payment_intent.payment_failed":
        const paymentIntent = event.data.object;

        // Find payment by payment intent ID
        const failedPayment = await Payment.findOne({
          paymentIntentId: paymentIntent.id,
        });

        if (failedPayment) {
          await Payment.findByIdAndUpdate(failedPayment._id, {
            status: "FAILED",
          });
        }
        break;

      case "checkout.session.expired":
        const expiredSession = event.data.object;

        // Find payment by session ID
        const expiredPayment = await Payment.findOne({
          sessionId: expiredSession.id,
        });

        if (expiredPayment) {
          await Payment.findByIdAndUpdate(expiredPayment._id, {
            status: "CANCELLED",
          });
        }
        break;

      default:
        // Unhandled event type
        break;
    }

    // Return a 200 response to acknowledge receipt of the event
    console.log("✅ Webhook processed successfully");
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).json({
      success: false,
      message: "Webhook error",
      error: error.message,
    });
  }
};

export const capturePayment = async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message:
          "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.",
      });
    }

    const { paymentId } = req.params;
    const userId = req.user?._id || req.user?.id || req.user?.userId;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    // Find payment
    const payment = await Payment.findById(paymentId).populate("userId");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Check if user owns the payment
    if (payment.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only capture your own payments",
      });
    }

    // Check if payment is in PENDING status
    if (payment.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message:
          "Payment cannot be captured. Current status: " + payment.status,
      });
    }

    if (!payment.paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment intent ID not found",
      });
    }

    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(
      payment.paymentIntentId,
    );

    // Update payment status
    await Payment.findByIdAndUpdate(paymentId, {
      status: "SUCCESS",
    });

    return res.status(200).json({
      success: true,
      message: "Payment captured successfully",
      data: {
        paymentId: payment._id,
        amount: payment.amount,
        status: "SUCCESS",
        capturedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error capturing payment:", error);
    return res.status(500).json({
      success: false,
      message: "Error capturing payment",
      error: error.message,
    });
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user?._id || req.user?.id || req.user?.userId;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    // Find payment
    const payment = await Payment.findById(paymentId)
      .populate("userId", "name email")
      .populate("title", "status payment");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Check if user owns the payment
    if (payment.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own payments",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment status retrieved successfully",
      data: {
        payment: {
          _id: payment._id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          description: payment.description,
          sessionId: payment.sessionId,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          collaboration: payment.title,
        },
      },
    });
  } catch (error) {
    console.error("Error getting payment status:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting payment status",
      error: error.message,
    });
  }
};

export const getUserPayments = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.userId;
    const { page = 1, limit = 10, status } = req.query;

    const filter = { userId, isDeleted: false };

    if (status) {
      filter.status = status.toUpperCase();
    }

    const skip = (page - 1) * limit;

    const payments = await Payment.find(filter)
      .populate("title", "status payment")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await Payment.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Payments retrieved successfully",
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error getting user payments:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting user payments",
      error: error.message,
    });
  }
};
