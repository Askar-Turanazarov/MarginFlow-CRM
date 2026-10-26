"use server";

import { revalidatePath } from "next/cache";
import { setSimulationEnabled } from "@/lib/simulation/engine";
import { requireUser } from "@/lib/session";

/** Admin button: the same switch as `npm run sim:on` / `npm run sim:off`. */
export async function toggleSimulation(enabled: boolean) {
  await requireUser(["ADMIN"]);
  await setSimulationEnabled(enabled);
  revalidatePath("/", "layout");
}
