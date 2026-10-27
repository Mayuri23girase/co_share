import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User.js';

const seedAdmin = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/akatsuki_draft';
  const adminName = process.env.ADMIN_NAME || 'Akatsuki Leader';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@akatsuki.dev').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass123!';

  console.log('--- Akatsuki\'s Draft: Admin Seeding ---');
  console.log(`Connecting to database: ${mongoUri}`);

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // Check if user already exists
    let user = await User.findOne({ email: adminEmail });

    if (user) {
      if (user.role === 'admin') {
        console.log(`[Admin Seed] Admin user already exists with email: ${adminEmail}`);
      } else {
        user.role = 'admin';
        await user.save();
        console.log(`[Admin Seed] Existing user '${adminEmail}' updated to role 'admin'.`);
      }
    } else {
      user = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      console.log(`[Admin Seed] Successfully created admin user:`);
      console.log(`  Name:  ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role:  ${user.role}`);
    }

    console.log('Admin seeding completed successfully.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Admin Seed Error] Failed to seed admin user:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedAdmin();
