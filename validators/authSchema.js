import { z } from "zod";

export const loginSchema = z.object({
  email: z.string("Please enter a valid email address").email("Please enter a valid email address"),

  password: z
    .string()
    .min(3, { message: "Password must be at least 3 characters long" })
    .max(40, { message: "Password cannot exceed 40 characters" }),
});

export const registerSchema = loginSchema.extend({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(100, { message: "Name cannot exceed 100 characters" }),

  otp: z
    .string("OTP must be exactly 4 digits string")
    .regex(/^\d{4}$/, "OTP must be exactly 4 digits string"),
});

export const sendOtpSchema = z.object({
  email: z.string("Please enter a valid email address").email("Please enter a valid email address"),
});

export const verifyOtpSchema = sendOtpSchema.extend({
  otp: z
    .string("OTP must be exactly 4 digits string")
    .regex(/^\d{4}$/, "OTP must be exactly 4 digits string"),
});

export const idTokenSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
});
