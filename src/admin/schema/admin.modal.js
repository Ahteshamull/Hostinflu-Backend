import mongoose from "mongoose";
const { Schema } = mongoose;

const adminSchema = new Schema(
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
    address: {
      type: String,
    },
    image: {
      type: String,
    },
    role: {
      type: String,
      enum: ["superAdmin", "admin"],
      default: "admin",
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Admin", adminSchema);
