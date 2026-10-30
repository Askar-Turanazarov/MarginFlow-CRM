// The same daily cleanup as /api/cron/retention, for a local database: npm run db:cleanup
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { runRetention } from "../src/lib/retention";

runRetention()
  .then(({ points, rateLimits }) => console.log(`Removed ${points} old location points and ${rateLimits} rate-limit rows.`))
  .finally(() => prisma.$disconnect());
