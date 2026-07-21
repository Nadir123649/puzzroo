// One-off script: grant the `admin` role to users by email.
//
// Usage (from repo root, with a MongoDB connection string):
//   MONGO_URI="mongodb+srv://..." node scripts/grantAdmin.mjs \
//     mhassan.irfan82@gmail.com aliaunnn@gmail.com
//
// This connects directly to the database and sets role: "admin" on each
// matching account. Re-run any time to (re)grant access. Not part of the
// Next.js build — it lives outside /src.
import mongoose from 'mongoose'

const emails = process.argv.slice(2)
if (emails.length === 0) {
  console.error('Usage: MONGO_URI=... node scripts/grantAdmin.mjs email1 email2 ...')
  process.exit(1)
}

const uri = process.env.MONGO_URI
if (!uri) {
  console.error('Error: MONGO_URI environment variable is required.')
  process.exit(1)
}

await mongoose.connect(uri)
const users = mongoose.connection.collection('users')

let promoted = 0
for (const raw of emails) {
  const email = raw.toLowerCase().trim()
  const res = await users.updateOne({ email }, { $set: { role: 'admin' } })
  console.log(`email=${email} matched=${res.matchedCount} modified=${res.modifiedCount}`)
  promoted += res.modifiedCount
}

console.log(`Done. ${promoted} user(s) promoted to admin.`)
await mongoose.disconnect()
