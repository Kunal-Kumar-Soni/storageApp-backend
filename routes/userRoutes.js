import express from "express";
import checkAuth, { checkNotAdminUser, checkNotRegularUser } from "../middleware/auth.js";
import {
  deleteUserById,
  getAllUsers,
  getUser,
  loginUser,
  logoutAllUser,
  logoutById,
  logoutUser,
  registerUser,
} from "../controllers/userController.js";
import { rateLimit } from "express-rate-limit";
import { slowDown } from "express-slow-down";

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
});

const sendLoginThrottle = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: (hits) => hits * 100,
});

const router = express.Router();

router.post("/user/register", registerLimiter, registerUser);

router.post("/user/login", loginLimiter, sendLoginThrottle, loginUser);

router.get("/user", checkAuth, getUser);

router.get("/users", checkAuth, checkNotRegularUser, getAllUsers);

router.post("/users/:userId/logout", checkAuth, checkNotRegularUser, logoutById);

router.delete("/users/:userId", checkAuth, checkNotAdminUser, deleteUserById);

router.post("/user/logout", logoutUser);

router.post("/user/logout-all", logoutAllUser);

export default router;
