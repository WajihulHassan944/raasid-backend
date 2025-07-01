import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: false,
    },
    lastName: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
    type: [String],
    enum: ["user", "admin", "subadmin"],
    default: ["user"],
  },
  },
  { timestamps: true } 
);

export const User = mongoose.model("User", schema);
