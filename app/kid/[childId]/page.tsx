import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getRewardTotal } from "@/lib/ledger";
import { getDailyPeriodKey, getISOWeekKey, getCurrentWeekBounds } from "@/lib/periods";
import { KidView } from "./KidView";

export default async function KidModePage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;

  const session = await auth();
  if (!session) redirect("/login");
  // A kid may only open their own kid mode; a parent may open any child in
  // their household.
  if (session.user.role === "CHILD" && session.user.childProfileId !== childId) {
    redirect(`/kid/${session.user.childProfileId}`);
  }

  const child = await prisma.childProfile.findUnique({ where: { id: childId } });
  if (!child) notFound();
  if (child.householdId !== session.user.householdId) notFound();

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

  const rewards = await prisma.reward.findMany({
    where: { householdId: child.householdId, active: true },
  });

  // Headline points and the leaderboard follow the first active reward's
  // window (weekly vs all-time total) so they stay consistent.
  const pointsWindow = rewards[0]?.window ?? "WEEKLY";
  const pointsLabel = pointsWindow === "WEEKLY" ? "pts this week" : "pts total";

  const leaderboard = await Promise.all(
    siblings.map(async (s) => ({
      id: s.id,
      displayName: s.displayName,
      avatar: s.avatar,
      points: await getRewardTotal(s.id, pointsWindow),
    }))
  );
  leaderboard.sort((a, b) => b.points - a.points);

  const points = await getRewardTotal(childId, pointsWindow);

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
      points={points}
      pointsLabel={pointsLabel}
      rewards={rewards}
      leaderboard={leaderboard}
      recentGrants={recentGrants}
      today={today}
      thisWeek={thisWeek}
    />
  );
}
