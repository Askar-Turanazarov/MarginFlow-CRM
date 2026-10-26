// npm run sim:on / npm run sim:off — switches the movement simulator.
// The flag is stored in the database; the running dev server picks it up within 3 seconds.
import "dotenv/config";
import { setSimulationEnabled } from "@/lib/simulation/engine";
import { prisma } from "@/lib/prisma";

async function main() {
  const command = process.argv[2];
  if (command !== "on" && command !== "off") {
    console.error("Usage: npm run sim:on | npm run sim:off");
    process.exit(1);
  }

  await setSimulationEnabled(command === "on");
  console.log(
    command === "on"
      ? "Simulation is ON: everyone is checked in and moves every 3 s while `npm run dev` is running."
      : "Simulation is OFF.",
  );
  await prisma.$disconnect();
}

main();
