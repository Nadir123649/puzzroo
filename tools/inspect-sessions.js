const { MongoClient } = require('mongodb');
const fs = require('fs');

function getUri() {
  const txt = fs.readFileSync('.env.local', 'utf8');
  const m = txt.match(/MONGO_URI=(.*)/);
  return m ? m[1].trim() : null;
}

(async () => {
  const uri = getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const users = db.collection('users');
  const sessions = db.collection('loginsessions');

  // Find the user who owns the most-recent isCurrent session
  const recent = await sessions.findOne({}, { sort: { createdAt: -1 } });
  console.log('Most recent session userId:', recent?.userId?.toString(), 'provider:', JSON.stringify(recent?.provider), 'isCurrent:', recent?.isCurrent);

  const owner = await users.findOne({ _id: recent.userId }, { provider: 1, linkedProviders: 1, firebaseProvider: 1, firebaseUid: 1, password: 1, email: 1, username: 1 });
  console.log('Owner user:', JSON.stringify(owner, null, 2));

  console.log('\n=== ALL sessions for owner ===');
  const s = await sessions.find({ userId: recent.userId }).sort({ createdAt: -1 }).toArray();
  for (const x of s) {
    console.log(JSON.stringify({ isCurrent: x.isCurrent, provider: x.provider, createdAt: x.createdAt }));
  }

  await client.close();
})().catch(e => { console.error(e); process.exit(1); });
