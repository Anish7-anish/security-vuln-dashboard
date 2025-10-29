import mongoose from 'mongoose';

let connectionPromise = null;

export default async function connectDB() {
  // If already connected, reuse the existing connection
  if (mongoose.connection.readyState >= 1) return mongoose.connection;

  if (!connectionPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('❌ Missing MONGODB_URI env var');

    // Start connecting
    connectionPromise = mongoose.connect(uri, { maxPoolSize: 10,
          serverSelectionTimeoutMS: 60000,
          socketTimeoutMS: 600000,
          connectTimeoutMS: 600000,
          family: 4,
     })
      .then(() => {
        const { host, name, user, port } = mongoose.connection;
        console.log(`✅ Connected to MongoDB Atlas`);
        console.log(`   → Host: ${host || "N/A"}`);
        console.log(`   → DB Name: ${name || "N/A"}`);
        console.log(`   → User: ${user || "N/A"}`);
        console.log(`   → Port: ${port || "Atlas cluster"}`);
        return mongoose.connection;
      })
      .catch((err) => {
        console.error("❌ MongoDB connection error:", err);
        throw err;
      });
  }

  return connectionPromise;
}
