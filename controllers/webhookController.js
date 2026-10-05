import Razorpay from "razorpay";
import Subscription from "../models/subscriptionModel.js";
import User from "../models/userModel.js";

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

const PLAN = {
  plan_TezFOTuBXRSszs: {
    storageQuotaBytes: 2 * 1024 ** 4,
  },
  plan_TezGc86qpAviFU: {
    storageQuotaBytes: 2 * 1024 ** 4,
  },
  plan_TezIEf0LoEdsWx: {
    storageQuotaBytes: 5 * 1024 ** 4,
  },
  plan_TezK4Wc6EwJrT6: {
    storageQuotaBytes: 5 * 1024 ** 4,
  },
  plan_TezLgBhYeFr1Tj: {
    storageQuotaBytes: 10 * 1024 ** 4,
  },
  plan_TezNVbbASNC2kt: {
    storageQuotaBytes: 10 * 1024 ** 4,
  },
};

const defaultStorageQuota = 1 * 1024 ** 3;

export const handleRazorpayWebhook = async (req, res) => {
  const webhookSignature = req.headers["x-razorpay-signature"];
  if (!webhookSignature) {
    return res.status(400).json({ error: "Authentication error" });
  }

  const isValidateSignature = Razorpay.validateWebhookSignature(
    JSON.stringify(req.body),
    webhookSignature,
    webhookSecret,
  );
  if (!isValidateSignature) {
    return res.status(400).json({ error: "Authentication error" });
  }

  if (req.body.event === "subscription.activated") {
    const { id, plan_id, status } = req.body.payload.subscription.entity;

    // 👇 TEMPORARY LOG 1
    console.log("Razorpay plan_id:", plan_id);
    console.log("PLAN:", PLAN[plan_id]);

    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: id },
      { $set: { status } },
    );

    // 👇 TEMPORARY LOG 2
    console.log("Subscription after update:", subscription);

    const updatedUser = await User.findByIdAndUpdate(
      subscription.userId,
      {
        $set: {
          maxStorageInBytes: PLAN[plan_id].storageQuotaBytes,
        },
      },
      { new: true },
    );

    // 👇 TEMPORARY LOG 3
    console.log("Updated user:", updatedUser);

    return res.json({ message: "subscription activated!" });
  } else if (req.body.event === "subscription.paused") {
    const { id, status } = req.body.payload.subscription.entity;
    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: id },
      { $set: { status } },
      { returnDocument: "after" },
    );

    await User.findByIdAndUpdate(subscription.userId, {
      $set: { maxStorageInBytes: defaultStorageQuota },
    });

    return res.json({ message: "subscription paused!" });
  } else if (req.body.event === "subscription.resumed") {
    const { id, plan_id, status } = req.body.payload.subscription.entity;
    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: id },
      { $set: { status } },
      { returnDocument: "after" },
    );

    await User.findByIdAndUpdate(subscription.userId, {
      $set: { maxStorageInBytes: PLAN[plan_id].storageQuotaBytes },
    });

    return res.json({ message: "subscription resumed!" });
  } else if (req.body.event === "subscription.cancelled") {
    const { id, status } = req.body.payload.subscription.entity;
    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: id },
      { $set: { status: status, expireAt: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000) } },
      { returnDocument: "after" },
    );

    await User.findByIdAndUpdate(subscription.userId, {
      $set: { maxStorageInBytes: defaultStorageQuota },
    });

    return res.json({ message: "subscription cancelled!" });
  }
  return res.status(400).json({ error: "Something went wrong!" });
};
