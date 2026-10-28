import mongoose from 'mongoose';

let memoryServer = null;

/**
 * Connect to MongoDB database
 */
export const connectDB = async () => {
  let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/akatsuki_draft';

  // 1. If explicitly requested in-memory
  if (process.env.USE_MEMORY_DB === 'true' || mongoUri === 'memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    mongoUri = memoryServer.getUri();
    process.env.USE_MEMORY_DB = 'true';
    console.log(`[Database] In-memory MongoDB started at: ${mongoUri}`);

    const conn = await mongoose.connect(mongoUri);
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  }

  // 2. Attempt connecting to the configured URI with a quick 3s timeout
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    // If local MongoDB is not running, seamlessly fallback to in-memory MongoDB
    if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
      console.warn(`[Database Notice] No local MongoDB running on ${mongoUri} (${error.message}).`);
      console.log(`[Database] Auto-starting In-Memory MongoDB for instant zero-config development...`);

      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri();
      process.env.USE_MEMORY_DB = 'true';
      console.log(`[Database] In-memory MongoDB started at: ${mongoUri}`);

      const conn = await mongoose.connect(mongoUri);
      console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    }

    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database (used in tests or graceful shutdown)
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    if (memoryServer) {
      await memoryServer.stop();
    }
    console.log('[Database] MongoDB connection closed');
  } catch (error) {
    console.error(`[Database Error] Failed to close MongoDB connection: ${error.message}`);
  }
};
