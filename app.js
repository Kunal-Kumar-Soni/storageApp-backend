import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import directoryRoutes from "./routes/directoryRoutes.js";
import filesRoutes from "./routes/filesRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import checkAuth from "./middleware/auth.js";
import { connectDB } from "./config/db.js";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { spawn } from "child_process";
import crypto from "crypto";

await connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
});

app.use(helmet());
app.use(globalLimiter);
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.get("/", (req, res) => {
  return res.json({ message: "hello from storageApp!" });
});

app.post("/github-webhook", (req, res) => {
  const githubWebhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  const givenSignature = req.headers["X-Hub-Signature-256"];
  const calculatedSignature = crypto
    .createHmac("sha1", githubWebhookSecret)
    .update(JSON.stringify(payload))
    .digest("hex");

  if (givenSignature !== calculatedSignature) {
    console.log("Invalid webhook signature");
    return res.sendStatus(401);
  }

  res.json({ message: "OK" });
  const bashChildProcess = spawn("bash", ["/home/ubuntu/deploy-frontend.sh"]);

  bashChildProcess.stdout.on("data", (data) => {
    process.stdout.write(data);
  });

  bashChildProcess.stderr.on("data", (err) => {
    process.stderr.write(err);
  });

  bashChildProcess.on("close", (code) => {
    if (code === 0) {
      console.log("Script executed successfully!");
    } else {
      console.log("Script failed");
    }
  });

  bashChildProcess.on("error", (err) => {
    console.log("Error in the spawning process!");
    console.log(err);
  });
});

app.use("/directory", checkAuth, directoryRoutes);
app.use("/file", checkAuth, filesRoutes);
app.use("/subscriptions", checkAuth, subscriptionRoutes);
app.use("/", userRoutes);
app.use("/auth", authRoutes);
app.use("/webhooks", webhookRoutes);

app.use((err, req, res, next) => {
  // return res.status(err.status || 500).json({ error: "Something went wrong!" });
  return res.json(err);
});

app.listen(PORT, () => {
  console.log(`server started port at ${PORT}`);
});
