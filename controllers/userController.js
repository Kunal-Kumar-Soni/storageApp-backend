import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import mongoose, { Types } from "mongoose";
import OTP from "../models/otpModel.js";
import redisClient from "../config/redis.js";
import z from "zod";
import { loginSchema, registerSchema } from "../validators/authSchema.js";

export const registerUser = async (req, res, next) => {
  const { success, data, error } = registerSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({ error: z.flattenError(error).fieldErrors });
  }

  const { name, email, password, otp } = data;

  const otpRecord = await OTP.findOne({ otp, email });
  if (!otpRecord) {
    return res.status(400).json({ error: "Invalid or Expired OTP" });
  }

  await otpRecord.deleteOne();

  const session = await mongoose.startSession();

  try {
    const rootDirId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    session.startTransaction();

    await Directory.insertOne(
      {
        _id: rootDirId,
        name: `root-${email}`,
        parentDirId: null,
        userId,
      },
      { session },
    );

    await User.insertOne({ _id: userId, name, email, password, rootDirId }, { session });

    await session.commitTransaction();

    res.status(201).json({ message: "User registered" });
  } catch (err) {
    console.dir(err, { depth: null });
    await session.abortTransaction();
    if (err.code === 121) {
      res.status(400).json({ error: "Invalid input, please enter valid details" });
    } else if (err.code === 11000) {
      return res.status(409).json({
        error: "this email is already exist",
        message:
          "A user with this email address already exists. Please try logging in or use a different email.",
      });
    } else {
      next(err);
    }
  }
};

export const loginUser = async (req, res) => {
  const { success, data } = loginSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({ error: "Invalid Credentials" });
  }

  const { email, password } = data;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: "Invalid Credentials" });
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(404).json({ error: "Invalid Credentials" });
  }

  const allSessions = await redisClient.ft.search("userIdIdx", `@userId:{${user.id}}`, {
    RETURN: [],
  });

  if (allSessions.total >= 2) {
    await redisClient.del(allSessions.documents[0].id);
  }

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
  res.json({ message: "Logged In" });
};

export const getUser = async (req, res) => {
  const rootDir = await Directory.findById(req.user.rootDirId);
  res.status(200).json({
    name: req.user.name,
    email: req.user.email,
    picture: req.user.picture,
    role: req.user.role,
    maxStorageInBytes: req.user.maxStorageInBytes,
    usedStorageInBytes: rootDir.size,
  });
};

export const getAllUsers = async (req, res) => {
  const users = await User.find({ deleted: false }).lean();
  if (users.length === 0) {
    return res.status(404).json({ error: "No user found!" });
  }

  const allSessions = (await redisClient.ft.search("userIdIdx", "*", { RETURN: ["userId"] }))
    .documents;

  const allSessionsUserId = allSessions.map((s) => s.value.userId);
  const allSessionsUserIdSet = new Set(allSessionsUserId);

  const transformUsers = users.map(({ _id, name, email }) => ({
    id: _id,
    name,
    email,
    isLoggedIn: allSessionsUserIdSet.has(_id.toString()),
  }));
  res.json(transformUsers);
};

export const logoutUser = async (req, res) => {
  const { sid } = req.signedCookies;
  await redisClient.del(`session:${sid}`);
  res.clearCookie("sid");
  res.status(204).end();
};

export const logoutById = async (req, res, next) => {
  try {
    const allSessions = (
      await redisClient.ft.search("userIdIdx", `@userId:{${req.params.userId}}`, {
        RETURN: [],
      })
    ).documents;

    const userIds = allSessions.map((s) => s.id);
    await redisClient.del(userIds);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const deleteUserById = async (req, res, next) => {
  const { userId } = req.params;
  if (req.user._id.toString() === userId) {
    return res.status(403).json({ error: "You can't delete yourself" });
  }

  try {
    const allSessions = (
      await redisClient.ft.search("userIdIdx", `@userId:{${req.params.userId}}`, {
        RETURN: [],
      })
    ).documents;

    const userIds = allSessions.map((s) => s.id);
    await redisClient.del(userIds);
    await User.findByIdAndUpdate(userId, { deleted: true });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const logoutAllUser = async (req, res) => {
  try {
    const { sid } = req.signedCookies;
    const sessionId = await redisClient.json.get(`session:${sid}`);

    const selectedSessions = (
      await redisClient.ft.search("userIdIdx", `@userId:{${sessionId.userId}}`, {
        RETURN: [],
      })
    ).documents;

    const sessionIds = selectedSessions.map((s) => s.id);
    await redisClient.del(sessionIds);

    res.status(204).end();
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "my error" });
  }
};
