const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await mongoose.connection.db.collection('users').find({ provider: 'google' }).toArray();
  console.log(users.map(u => ({ username: u.username, email: u.email, googleEmail: u.googleEmail })));
  process.exit(0);
}
run();
