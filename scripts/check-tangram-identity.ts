/**
 * Verify every seeded tangram puzzle accepts the identity placement
 * (position 0,0, rotation 0 for all 7 pieces). Requires MONGODB_URI/MONGO_URI.
 * Run: npx tsx scripts/check-tangram-identity.ts
 */
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#")) {
      const eq = t.indexOf("=");
      if (eq > 0) {
        const k = t.slice(0, eq).trim();
        if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim();
      }
    }
  }
}

async function main() {
  const mongoose = (await import("mongoose")).default;
  const { connectDB } = await import("@/lib/server/db");
  const { default: TangramPuzzle } = await import("@/lib/server/models/TangramPuzzle");
  const { verifyPuzzleSolution } = await import("@/lib/server/tangram/geometry/engine");

  await connectDB();
  const docs = await TangramPuzzle.find({ game: "tangram" }).lean();
  const bad: string[] = [];
  for (const d of docs) {
    const states = (d.pieceShapeIds as string[]).map((pieceId) => ({
      pieceId,
      position: { x: 0, y: 0 },
      rotation: 0,
      flipped: false,
      placed: true,
      snapped: true,
    }));
    const r = await verifyPuzzleSolution({ puzzleId: d.puzzleId, pieceStates: states });
    if (!r.valid) bad.push(`${d.puzzleId} (${d.difficulty}): ${r.errors.slice(0, 2).join("; ")}`);
  }
  console.log(`[check] total=${docs.length} bad=${bad.length}`);
  for (const b of bad.slice(0, 20)) console.log(`[check] bad: ${b}`);
  await mongoose.disconnect();
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
