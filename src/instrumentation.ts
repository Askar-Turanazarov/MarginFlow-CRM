// Runs once when the Next.js server starts. Starts the movement simulator loop;
// it does nothing until the simulation is switched on (npm run sim:on or the admin button).
// Vercel has no always-on process: there the polling routes take the steps (/api/presence).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.VERCEL) return;
  const { startSimulationLoop } = await import("@/lib/simulation/engine");
  startSimulationLoop();
}
