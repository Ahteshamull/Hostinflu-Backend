import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true],
      trim: true,
    },
    email: {
      type: String,
      required: [true],
      unique: [true],
      trim: true,
    },
    password: {
      type: String,
      required: [true],
      trim: true,
    },
    confirmPassword: {
      type: String,
      required: [true],
      trim: true,
    },
    otp: {
      type: Number,
    },
    phone: {
      type: String,
    },
    userName: {
      type: String,
      unique: true,
      required: [true, "Username is required"],
      trim: true,
      lowercase: true,
      minlength: [5, "Username must be at least 5 characters"],
      maxlength: [20, "Username must not exceed 20 characters"],
      match: [
        /^[a-z0-9_]+$/,
        "Username can only contain lowercase letters, numbers, and underscore (_)",
      ],
    },
    country: {
      type: String,
    },
    state: {
      type: String,
    },
    city: {
      type: String,
    },
    zipCode: {
      type: String,
    },
    fullAddress: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    aboutMe: {
      type: String,
    },
    image: {
      type: String,
    },
    role: {
      type: String,
      enum: ["host", "influencer"],
      default: "influencer",
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
