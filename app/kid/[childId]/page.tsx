import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getWeeklyTotal } from "@/lib/ledger";
import { getDailyPeriodKey, getISOWeekKey, getCurrentWeekBounds } from "@/lib/periods";
import { KidView } from "./KidView";

export default async function KidModePage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;

  const child = await prisma.childProfile.findUnique({ where: { id: childId } });
  if (!child) notFound();

  const today = getDailyPeriodKey();
  const thisWeek = getISOWeekKey();
  const { start, end } = getCurrentWeekBounds();

  const assignments = await prisma.taskAssignment.findMany({
    where: { childProfileId: childId },
    include: { task: true },
  });

  const completions = await prisma.completion.findMany({
    where: {
      childProfileId: childId,
      periodKey: { in: [today, thisWeek] },
    },
  });

  const siblings = await prisma.childProfile.findMany({
    where: { householdId: child.householdId },
    orderBy: { displayName: "asc" },
  });

  const siblingWeeklyPoints = await Promise.all(
    siblings.map(async (s) => ({
      id: s.id,
      displayName: s.displayName,
      avatar: s.avatar,
      points: await getWeeklyTotal(s.id),
    }))
  );
  siblingWeeklyPoints.sort((a, b) => b.points - a.points);

  const weeklyPoints = await getWeeklyTotal(childId);

  const rewards = await prisma.reward.findMany({
    where: { householdId: child.householdId, active: true },
  });

  const recentGrants = await prisma.rewardGrant.findMany({
    where: {
      childProfileId: childId,
      grantedAt: { gte: start, lt: end },
    },
    include: { reward: true },
  });

  return (
    <KidView
      child={child}
      assignments={assignments}
      completions={completions}
      weeklyPoints={weeklyPoints}
      rewards={rewards}
      leaderboard={siblingWeeklyPoints}
      recentGrants={recentGrants}
      today={today}
      thisWeek={thisWeek}
    />
  );
}
