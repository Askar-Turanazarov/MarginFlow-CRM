import { prisma } from "@/lib/prisma";

/** URL of the office plan image; without an uploaded image the built-in test plan is shown. */
export async function getPlanImage() {
  const plan = await prisma.officePlan.findUnique({ where: { id: 1 }, select: { mimeType: true, updatedAt: true } });
  return plan?.mimeType
    ? { url: `/api/office-plan/image?v=${plan.updatedAt.getTime()}`, isTestPlan: false }
    : { url: "/office-plan-demo.svg", isTestPlan: true };
}
