/**
 * CLI seeder. Run with: npm run db:seed  (or --dry to preview counts).
 * Requires MONGO_URI in the environment.
 */

async function main() {
  // Load .env.local before importing the seed module
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

  const { seedAll } = await import("../src/lib/server/seed");

  const isDry = process.argv.includes("--dry");
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
