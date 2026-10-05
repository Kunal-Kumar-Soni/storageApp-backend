import mongoose, { Types } from "mongoose";
import OTP from "../models/otpModel.js";
import User from "../models/userModel.js";
import { verifyIdToken } from "../services/googleAuthService.js";
import { sendOtpService } from "../services/sendOtpService.js";
import Directory from "../models/directoryModel.js";
import redisClient from "../config/redis.js";
import { idTokenSchema, sendOtpSchema, verifyOtpSchema } from "../validators/authSchema.js";

export const sendOtp = async (req, res, next) => {
  const { success, data } = sendOtpSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({ error: "Invalid Otp" });
  }

  const { email } = data;
  const resData = await sendOtpService(email);
  res.status(201).json(resData);
};

export const verifyOtp = async (req, res, next) => {
  const { success, data } = verifyOtpSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({ error: "Invalid Otp" });
  }

  const { otp, email } = data;

  const otpRecord = await OTP.findOne({ otp, email });
  if (!otpRecord) {
    return res.status(400).json({ error: "Invalid or Expired OTP" });
  }
  return res.json({ message: "OTP verified!" });
};

export const loginWithGoogle = async (req, res, next) => {
  const { success, data } = idTokenSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({ error: "Invalid ID token" });
  }

  const { idToken } = data;
  const userData = await verifyIdToken(idToken);
  const { name, email, picture } = userData;

  const user = await User.findOne({ email });
  if (user) {
    if (user.deleted) {
      return res
        .status(403)
        .json({ error: "Your account has been deleted, please contact admin to recover" });
    }

    const allSessions = await redisClient.ft.search("userIdIdx", `@userId:{${user.id}}`, {
      RETURN: [],
    });

    if (allSessions.total >= 2) {
      await redisClient.del(allSessions.documents[0].id);
    }

    // if (!user.picture.includes("img.magnific.com")) {
    //   user.picture = picture;
    //   await user.save();
    // }

    const sessionId = crypto.randomUUID();
    const redisKey = `session:${sessionId}`;
    await redisClient.json.set(redisKey, "$", { userId: user._id });
    await redisClient.expire(redisKey, 60 * 60 * 24 * 7);

    res.cookie("sid", sessionId, {
      httpOnly: true,
      signed: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 1000 * 60 * 24 * 7,
    });

    return res.json({ message: "logged in" });
  }

  const mongooseSession = await mongoose.startSession();

  try {
    const rootDirId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    mongooseSession.startTransaction();

    await Directory.insertOne(
      {
        _id: rootDirId,
        name: `root-${email}`,
        parentDirId: null,
        userId,
      },
      { mongooseSession },
    );

    await User.insertOne({ _id: userId, name, email, picture, rootDirId }, { mongooseSession });

    const sessionId = crypto.randomUUID();
    const redisKey = `session:${sessionId}`;
    await redisClient.json.set(redisKey, "$", { userId: user._id });
    await redisClient.expire(redisKey, 60 * 60 * 24 * 7);

    res.cookie("sid", sessionId, {
      httpOnly: true,
      signed: true,
      sameSite: "lax",
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    mongooseSession.commitTransaction();

    res.status(201).json({ message: "account registered and logged in!" });
  } catch (err) {
    mongooseSession.abortTransaction();
    next(err);
  }
};
