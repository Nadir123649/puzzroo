/**
 * CLI index sync tool. Run with: npm run db:indexes
 * Creates all schema-defined indexes in MongoDB.
 * Safe to run multiple times (syncIndexes is idempotent).
 */

async function main() {
  const fs = await import("fs");
  const path = await import("path");
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const k = trimmed.slice(0, eqIdx).trim();
          const v = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[k]) process.env[k] = v;
        }
      }
    }
  }

  const mongoose = (await import("mongoose")).default;

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGODB_URI or MONGO_URI required in .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  // Import ALL models so their schemas register indexes
  await import("@/lib/server/models/CrossMathPlaySession");
  await import("@/lib/server/models/CrossMathPuzzle");
  // Add other model imports as needed

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log(`Found ${collections.length} collections`);

  for (const modelName of Object.keys(mongoose.models)) {
    const model = mongoose.models[modelName];
    const colName = model.collection.name;
    console.log(`\nSyncing indexes for ${modelName} (collection: ${colName})...`);
    try {
      const before = await db.collection(colName).indexes();
      console.log(`  Before: ${before.length} index(es)`);

      await model.syncIndexes();

      const after = await db.collection(colName).indexes();
      console.log(`  After: ${after.length} index(es)`);
      for (const idx of after) {
        console.log(`    ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? " (unique)" : ""}${idx.partialFilterExpression ? ` partial: ${JSON.stringify(idx.partialFilterExpression)}` : ""}${idx.expireAfterSeconds ? ` TTL: ${idx.expireAfterSeconds}s` : ""}`);
      }
    } catch (err: any) {
      console.error(`  FAILED: ${err.message}`);
    }
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
