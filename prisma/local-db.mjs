// Local PostgreSQL without Docker (binaries from the embedded-postgres package).
//   npm run db:start  — start in background (creates .pgdata on first run); also runs before `npm run dev`
//   npm run db:stop   — stop
// pg_ctl is used instead of running postgres directly: it also works from an admin Windows account.
import "dotenv/config";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const platform = os.platform() === "win32" ? "windows" : os.platform();
const { pg_ctl, initdb } = await import(`@embedded-postgres/${platform}-${os.arch()}`);

const dataDir = path.resolve(".pgdata");
const port = process.env.DB_PORT ?? "5433";
const command = process.argv[2] ?? "start";
const run = (bin, args) => execFileSync(bin, args, { stdio: "inherit" });

if (command === "stop") {
  run(pg_ctl, ["stop", "-D", dataDir, "-m", "fast"]);
  process.exit(0);
}

if (!fs.existsSync(dataDir)) {
  const pwFile = path.join(os.tmpdir(), `marginflow-pw-${process.pid}`);
  fs.writeFileSync(pwFile, process.env.DB_PASSWORD);
  try {
    run(initdb, [
      "-D", dataDir,
      "-U", process.env.DB_USER,
      `--pwfile=${pwFile}`,
      "--auth=scram-sha-256",
      "--encoding=UTF8",
      "--locale=C",
    ]);
  } finally {
    fs.rmSync(pwFile, { force: true });
  }
}

// Already running (e.g. second `npm run dev`) — nothing to do. pg_ctl status exits non-zero when stopped.
try {
  execFileSync(pg_ctl, ["status", "-D", dataDir], { stdio: "ignore" });
  console.log(`PostgreSQL is already running on port ${port}.`);
  process.exit(0);
} catch {}

// stdio "ignore": the server inherits handles, a pipe would keep this command hanging. Logs go to server.log.
const logFile = path.join(dataDir, "server.log");
try {
  execFileSync(pg_ctl, ["start", "-D", dataDir, "-w", "-l", logFile, "-o", `-p ${port}`], { stdio: "ignore" });
} catch {
  console.error(`PostgreSQL did not start (already running?). See ${logFile}`);
  process.exit(1);
}
console.log(`PostgreSQL is running on port ${port}. Stop it with: npm run db:stop`);
