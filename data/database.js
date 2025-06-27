import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const { connection } = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "backendapi",
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`Database connected with ${connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err; // important to propagate error
  }
};
