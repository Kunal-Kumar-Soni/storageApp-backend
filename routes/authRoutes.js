import express from "express";
import { loginWithGoogle, sendOtp, verifyOtp } from "../controllers/authController.js";
import { rateLimit } from "express-rate-limit";
import { slowDown } from "express-slow-down";

const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
});

const sendOtpThrottle = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: (hits) => hits * 100,
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
});

const verifyOtpThrottle = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: (hits) => hits * 100,
});

const router = express.Router();

router.post("/send-otp", sendOtpLimiter, sendOtpThrottle, sendOtp);

router.post("/verify-otp", verifyOtpLimiter, verifyOtpThrottle, verifyOtp);

router.post("/google", loginWithGoogle);

export default router;
