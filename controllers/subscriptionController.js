import { createSubscriptionUrl } from "../config/razorpay.js";
import Subscription from "../models/subscriptionModel.js";

export const createSubscription = async (req, res, next) => {
  const { planId } = req.body;
  const user = req.user;

  try {
    const subscriptionId = await createSubscriptionUrl(planId, user._id);
    await Subscription.create({ planId, userId: user.id, subscriptionId });
    res.json({ subscriptionId });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
