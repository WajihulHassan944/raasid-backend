// models/Inquiry.js
import mongoose from 'mongoose';

const inquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
     reply: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export const Inquiry = mongoose.model('Inquiry', inquirySchema);