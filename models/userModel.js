import { model, Schema } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      minLength: [3, "Name should be in string and atleast three characters"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter valid email"],
    },
    password: {
      type: String,
      minlength: 4,
    },
    rootDirId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Directory",
    },
    picture: {
      type: String,
      default:
        "https://img.magnific.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg?semt=ais_hybrid&w=740&q=80",
    },
    role: {
      type: String,
      enum: ["Admin", "Manager", "User"],
      default: "User",
    },
    maxStorageInBytes: {
      type: Number,
      required: true,
      default: 1 * 1024 ** 3,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { strict: "throw", timestamps: true },
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = model("User", userSchema);
export default User;
