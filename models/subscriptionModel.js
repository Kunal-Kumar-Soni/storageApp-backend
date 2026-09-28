import { model, Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriptionId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    planId: {
      type: String,
      required: true,
    },
    // billingCycle: {
    //   type: String,
    //   enum: ["Monthly", "Yearly"],
    // },
    expireAt: {
      type: Date,
      expires: 0,
    },
    status: {
      type: String,
      enum: ["created", "active", "pending", "past_due", "paused", "cancelled", "in_grace"],
      default: "created",
    },
  },
  { strict: "throw", timestamps: true },
);

const Subscription = model("Subscription", subscriptionSchema);
export default Subscription;
