import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // If running in-memory DB, automatically provision the admin user for instant testing
  if (process.env.USE_MEMORY_DB === 'true') {
    const { default: User } = await import('./models/User.js');
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@akatsuki.dev').toLowerCase().trim();
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        name: process.env.ADMIN_NAME || 'Akatsuki Leader',
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'AdminSecurePass123!',
        role: 'admin'
      });
      console.log(`[Database] Auto-provisioned admin account: ${adminEmail}`);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Akatsuki's Draft API Server running on port ${PORT}`);
    console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Gemini Model: ${process.env.GEMINI_MODEL || 'gemini-3.8-flash'}`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });

  // Handle server-level errors such as port collisions
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[Server Error] Port ${PORT} is already in use by another process.`);
      console.error(`Tip: You can free port ${PORT} or configure a different port in .env (e.g. PORT=5001).\n`);
    } else {
      console.error('[Server Error]', err);
    }
    process.exit(1);
  });

  // Handle graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      console.error('[Server] Could not close connections in time, forcefully shutting down.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer().catch((error) => {
  console.error('[Server Fatal Error]', error);
  process.exit(1);
});
