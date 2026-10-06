import express from "express";
import { createSubscription, getSubscription } from "../controllers/subscriptionController.js";

const router = express.Router();

router.get("/", getSubscription);
router.post("/", createSubscription);

export default router;
