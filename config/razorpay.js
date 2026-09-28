import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createSubscriptionUrl = async (planId, userId) => {
  const { id } = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 120,
    notes: { userId },
  });
  return id;
};
