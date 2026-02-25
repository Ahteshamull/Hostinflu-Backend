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

export const stripeAccountOnboarding = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    // Check if Stripe is configured
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message:
          "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.",
      });
    }

    // Validate environment URLs
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
    const refreshUrl =
      process.env.ONBOARDING_REFRESH_URL || `${frontendUrl}/stripe-refresh`;
    const returnUrl =
      process.env.ONBOARDING_RETURN_URL || `${frontendUrl}/stripe-return`;

    // Find user
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // if user already has stripe account
    if (user.stripeAccountId) {
      const account = await stripe.accounts.retrieve(user.stripeAccountId);

      const cardPayments = account.capabilities?.card_payments;
      const transfers = account.capabilities?.transfers;
      const requirements = account.requirements?.currently_due || [];

      // if verified
      if (cardPayments === "active" && transfers === "active") {
        // update DB to mark as connected
        await userModel.findByIdAndUpdate(user.id, {
          isStripeConnected: true,
        });

        return res.status(200).json({
          success: true,
          status: "verified",
          message: "Stripe account verified successfully.",
          capabilities: account.capabilities,
        });
      }

      // if not verified → generate onboarding link
      const accountLinks = await stripe.accountLinks.create({
        account: user.stripeAccountId,
        refresh_url: `${refreshUrl}?accountId=${user.stripeAccountId}`,
        return_url: `${returnUrl}?accountId=${user.stripeAccountId}`,
        type: "account_onboarding",
      });

      // update DB to store stripeAccountId & mark connected
      await userModel.findByIdAndUpdate(user.id, {
        stripeAccountId: user.stripeAccountId,
        isStripeConnected: true,
      });

      return res.status(200).json({
        success: true,
        status: requirements.length > 0 ? "requirements_due" : "pending",
        message:
          requirements.length > 0
            ? "Additional information required for Stripe verification."
            : "Your Stripe account verification is under review.",
        requirements,
        onboardingLink: accountLinks.url,
      });
    }

    // if user has no stripe account → create new account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user?.email,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            delay_days: 2, // minimum allowed
          },
        },
      },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${refreshUrl}?accountId=${account.id}`,
      return_url: `${returnUrl}?accountId=${account.id}`,
      type: "account_onboarding",
    });

    // update DB with stripeAccountId & mark connected
    await userModel.findByIdAndUpdate(user.id, {
      stripeAccountId: account.id,
      isStripeConnected: true,
    });

    return res.status(200).json({
      success: true,
      status: "pending",
      message: "Your Stripe account verification is under review.",
      capabilities: account.capabilities,
      onboardingLink: accountLink.url,
    });
  } catch (error) {
    console.error("Error in stripe account onboarding:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating Stripe account onboarding",
      error: error.message,
    });
  }
};

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

    // Find collaboration
    const collaboration = await Collaborations.findById(collaborationId);

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        message: "Collaboration not found",
      });
    }

    // // Check if collaboration belongs to user
    // if (collaboration.userId.toString() !== userId.toString()) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "You can only create payment for your own collaborations",
    //   });
    // }

    // Calculate amount from collaboration compensation
    let amount = 0;

    if (collaboration.payment && collaboration.payment > 0) {
      amount = collaboration.payment;
    } else if (
      collaboration.compensation?.directPayment === true &&
      collaboration.compensation?.paymentAmount
    ) {
      amount = parseFloat(collaboration.compensation.paymentAmount);
    } else if (collaboration.compensation?.paymentAmount) {
      amount = parseFloat(collaboration.compensation.paymentAmount);
    } else {
      return res.status(400).json({
        success: false,
        message:
          "No payment amount found for this collaboration. Please ensure the collaboration has paymentAmount configured in compensation.",
        debug: {
          collaborationPayment: collaboration.payment,
          compensation: collaboration.compensation,
          hasDirectPayment: collaboration.compensation?.directPayment,
          hasPaymentAmount: !!collaboration.compensation?.paymentAmount,
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
              name: `Collaboration Payment - ${collaboration.description || "Service"}`,
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
      selectInfluencerOrHost: collaboration.selectInfluencerOrHost,
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
            status: "IN_PROGRESS", // payment amount hold in platform account
            paymentIntentId: session.payment_intent,
          });

          console.log("✅ Payment status updated to IN_PROGRESS");

          // Update collaboration payment status and status
          const updatedCollab = await Collaborations.findByIdAndUpdate(
            payment.title,
            {
              paymentStatus: "in_progress",
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

      case "payment_intent.amount_capturable_updated":
        console.log("💰 Processing payment_intent.amount_capturable_updated");
        const intent = event.data.object;

        // Find payment by payment intent ID
        const capturablePayment = await Payment.findOne({
          paymentIntentId: intent.id,
        });

        if (capturablePayment) {
          console.log("✅ Capturable payment found:", capturablePayment._id);

          // Update payment status to IN_PROGRESS (held in platform account)
          if (capturablePayment.status !== "IN_PROGRESS") {
            await Payment.findByIdAndUpdate(capturablePayment._id, {
              status: "IN_PROGRESS",
            });

            console.log("✅ Payment status updated to IN_PROGRESS (held)");

            // Update collaboration payment status and status
            const updatedCollab = await Collaborations.findByIdAndUpdate(
              capturablePayment.title,
              {
                paymentStatus: "in_progress",
                status: "ongoing",
              },
              { new: true },
            );

            console.log("✅ Collaboration updated for capturable payment:", {
              id: updatedCollab._id,
              status: updatedCollab.status,
              paymentStatus: updatedCollab.paymentStatus,
            });
          }
        } else {
          console.log("❌ Payment not found for capturable intent:", intent.id);
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
    const PLATFORM_PERCENT = 10; // 10% platform fee

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    // Find payment with collaboration details
    const payment = await Payment.findById(paymentId)
      .populate("userId")
      .populate({
        path: "title",
        populate: ["userId", "selectInfluencerOrHost"],
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Check if user owns the collaboration (host)
    const collaboration = payment.title;
    if (collaboration.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the collaboration creator can release payments",
      });
    }

    // Check if payment is in IN_PROGRESS status (held)
    if (payment.status !== "IN_PROGRESS") {
      return res.status(400).json({
        success: false,
        message:
          "Payment cannot be released. Current status: " + payment.status,
      });
    }

    if (!payment.paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment intent ID not found",
      });
    }

    // Check if collaboration is completed
    if (collaboration.status !== "completed") {
      return res.status(400).json({
        success: false,
        message:
          "Collaboration must be completed before payment can be released",
      });
    }

    const totalAmount = Math.round(payment.amount * 100); // Convert to cents
    const adminAmount = Math.round((totalAmount * PLATFORM_PERCENT) / 100);
    const influencerAmount = totalAmount - adminAmount;

    // Capture the payment
    const capturedIntent = await stripe.paymentIntents.capture(
      payment.paymentIntentId,
      {
        idempotencyKey: `capture_${payment._id}`,
      },
    );

    const chargeId = capturedIntent.latest_charge;

    if (!chargeId) {
      return res.status(400).json({
        success: false,
        message: "Charge not found after capture",
      });
    }

    // For now, we'll just mark as paid and calculate amounts
    // await stripe.transfers.create({
    //   amount: influencerAmount,
    //   currency: "usd",
    //   destination: influencerStripeAccountId,
    //   source_transaction: chargeId,
    // });

    // Update payment status and amounts
    await Payment.findByIdAndUpdate(paymentId, {
      status: "SUCCESS",
      adminAmount: adminAmount / 100, // Convert back to dollars
      influencerAmount: influencerAmount / 100, // Convert back to dollars
      platformFee: PLATFORM_PERCENT,
      capturedAt: new Date(),
    });

    // Update collaboration payment status
    await Collaborations.findByIdAndUpdate(collaboration._id, {
      paymentStatus: "paid",
    });

    return res.status(200).json({
      success: true,
      message: "Payment released successfully",
      data: {
        paymentId: payment._id,
        totalAmount: payment.amount,
        platformFee: PLATFORM_PERCENT,
        adminAmount: adminAmount / 100,
        influencerAmount: influencerAmount / 100,
        status: "SUCCESS",
        capturedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error releasing payment:", error);
    return res.status(500).json({
      success: false,
      message: "Error releasing payment",
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

export const userSpendingGrowth = async (req, res) => {
  try {
    const userId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Create date range for the specified year
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31); // December 31st

    // Get total spending for the year (host spending)
    const totalSpending = await Payment.aggregate([
      {
        $match: {
          userId: userId, // Host ID
          status: { $in: ["SUCCESS", "IN_PROGRESS", "HOLD"] },
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Get spending by month (host spending)
    const monthlySpending = await Payment.aggregate([
      {
        $match: {
          userId: userId, // Host ID
          status: { $in: ["SUCCESS", "IN_PROGRESS", "HOLD"] },
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Initialize all 12 months with 0 spending
    const monthlyData = [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 1; i <= 12; i++) {
      const monthData = monthlySpending.find((item) => item._id === i);
      monthlyData.push({
        month: months[i - 1],
        monthNumber: i,
        amount: monthData ? monthData.amount : 0,
        count: monthData ? monthData.count : 0,
      });
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "User spending growth retrieved successfully",
      data: {
        year,
        totalSpending: totalSpending[0]?.total || 0,
        monthlyData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving user spending growth",
      error: error.message,
    });
  }
};
