require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus_vault';

async function resetDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected successfully.');

    const db = mongoose.connection.db;

    // 1. Wipe customer users
    const usersRes = await db.collection('users').deleteMany({});
    console.log(`✓ Deleted ${usersRes.deletedCount} customer user accounts.`);

    // 2. Wipe transactions
    const txnsRes = await db.collection('transactions').deleteMany({});
    console.log(`✓ Deleted ${txnsRes.deletedCount} transaction records.`);

    // 3. Wipe orders
    const ordersRes = await db.collection('orders').deleteMany({});
    console.log(`✓ Deleted ${ordersRes.deletedCount} order records.`);

    // 4. Wipe customer subscriptions
    const subsRes = await db.collection('subscriptions').deleteMany({});
    console.log(`✓ Deleted ${subsRes.deletedCount} subscription records.`);

    // 5. Ensure Superadmin account (Aryan / 5669) exists and is active
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('5669', salt);

    await db.collection('admins').updateOne(
      { username: 'Aryan' },
      { $set: { username: 'Aryan', password_hash: hash, last_login: new Date() } },
      { upsert: true }
    );
    console.log('✓ Admin account "Aryan" (password: 5669) verified and preserved.');

    console.log('\n🌟 Database reset complete! All customer data & transactions have been cleared.');
    process.exit(0);
  } catch (err) {
    console.error('Reset error:', err.message);
    process.exit(1);
  }
}

resetDatabase();
