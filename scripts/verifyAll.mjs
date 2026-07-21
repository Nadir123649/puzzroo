import mongoose from 'mongoose'

const uri = process.env.MONGO_URI
await mongoose.connect(uri)
const c = mongoose.connection.collection('users')
const before = await c.countDocuments({ isVerified: false })
const r = await c.updateMany({ isVerified: false }, { $set: { isVerified: true } })
const after = await c.countDocuments({ isVerified: false })
console.log(`unverified before: ${before}, modified: ${r.modifiedCount}, unverified after: ${after}`)
await mongoose.disconnect()
