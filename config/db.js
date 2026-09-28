import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected Database");
  } catch (err) {
    console.log(err);
    console.log("couldn't connect to the database");
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  console.log("Disconnected Database");
  await mongoose.disconnect();
  process.exit(0);
});
