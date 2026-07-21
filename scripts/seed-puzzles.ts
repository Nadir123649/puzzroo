/**
 * CLI seeder. Run with: npm run db:seed  (or --dry to preview counts).
 * Requires MONGO_URI in the environment.
 */
import { seedAll } from "../src/lib/server/seed";

const isDry = process.argv.includes("--dry");

async function main() {
  console.log(`[seed] starting${isDry ? " (dry run)" : ""}...`);
  const results = await seedAll(isDry);
  for (const r of results) {
    console.log(
      `[seed] ${r.game.padEnd(16)} total=${r.total} inserted=${r.inserted} updated=${r.updated}`
    );
  }
  console.log("[seed] done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
