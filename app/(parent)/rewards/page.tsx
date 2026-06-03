import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RewardsManager } from "./RewardsManager";

export default async function RewardsPage() {
  const session = await auth();
  const rewards = await prisma.reward.findMany({
    where: { householdId: session!.user.householdId },
    orderBy: { createdAt: "desc" },
    include: { grants: { include: { child: true } } },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Rewards</h1>
      <RewardsManager rewards={rewards} />
    </div>
  );
}
