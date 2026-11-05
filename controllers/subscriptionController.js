import { createSubscriptionUrl } from "../config/razorpay.js";
import Subscription from "../models/subscriptionModel.js";

export const createSubscription = async (req, res, next) => {
  const { planId } = req.body;
  const user = req.user;

  try {
    const existingSubscription = await Subscription.findOne({ userId: user.id, planId });

    if (existingSubscription && existingSubscription.status === "active") {
      return res.status(409).json({ message: "You have already subscribed this plan!" });
    }

    if (existingSubscription && existingSubscription.status === "created") {
      return res.json({ subscriptionId: existingSubscription.subscriptionId });
    }

    const subscriptionId = await createSubscriptionUrl(planId, user._id);
    await Subscription.create({
      planId,
      userId: user.id,
      subscriptionId,
      expireAt: new Date(Date.now() + 60 * 60 * 24 * 1000),
    });
    return res.json({ subscriptionId });
  } catch (error) {
    next(error);
  }
};

export const getSubscription = async (req, res, next) => {
  try {
    const user = req.user;
    const subscribedPlan = await Subscription.find({ userId: user.id, status: "active" }).distinct(
      "planId",
    );
    return res.json({ subscribedPlanIds: subscribedPlan });
  } catch (error) {
    next(error);
  }
};
