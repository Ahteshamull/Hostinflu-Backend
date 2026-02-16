import mongoose from "mongoose";
const { Schema } = mongoose;

const legalDocSchema = new Schema(
  {
    content: {
      type: String,
      enum: ["termsAndCondition", "privacyPolicy", "aboutUs"],
      required: [true, "Content type is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("LegalDoc", legalDocSchema);
