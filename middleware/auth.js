import redisClient from "../config/redis.js";
import User from "../models/userModel.js";

export default async function checkAuth(req, res, next) {
  const { sid } = req.signedCookies;

  if (!sid) {
    res.clearCookie("sid");
    return res.status(401).json({ error: "Not logged in!" });
  }

  const redisKey = `session:${sid}`;
  const session = await redisClient.json.get(redisKey);

  if (!session) {
    return res.status(401).json({ error: "Not logged in!" });
  }

  const user = await User.findById(session.userId);

  req.user = user;
  next();
}

export const checkNotRegularUser = (req, res, next) => {
  if (req.user.role !== "User") return next();
  res.status(403).json({ error: "You can't access users" });
};

export const checkNotAdminUser = (req, res, next) => {
  if (req.user.role === "Admin") return next();
  res.status(403).json({ error: "You can't delete users" });
};
