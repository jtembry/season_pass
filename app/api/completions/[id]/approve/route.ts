import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { getWeeklyTotal } from "@/lib/ledger";
import { getCurrentWeekBounds } from "@/lib/periods";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const completion = await prisma.completion.findUnique({
    where: { id },
    include: { task: true },
  });
  if (!completion || completion.householdId !== session.user.householdId)
    return Response.json({ error: "Not found" }, { status: 404 });
  if (completion.status !== "PENDING_REVIEW")
    return Response.json({ error: "Not pending review" }, { status: 409 });

  const { reviewNote } = await req.json().catch(() => ({}));
  const pointsAwarded = completion.task.points;

  await prisma.$transaction([
    prisma.completion.update({
      where: { id },
      data: {
        status: "APPROVED",
        pointsAwarded,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        reviewNote: reviewNote || null,
      },
    }),
    prisma.pointsLedgerEntry.create({
      data: {
        householdId: completion.householdId,
        childProfileId: completion.childProfileId,
        type: "COMPLETION",
        amount: pointsAwarded,
        sourceCompletionId: id,
        note: completion.task.title,
      },
    }),
  ]);

  // Check reward thresholds after commit
  const weeklyTotal = await getWeeklyTotal(completion.childProfileId);
  const { start, end } = getCurrentWeekBounds();

  const rewards = await prisma.reward.findMany({
    where: { householdId: completion.householdId, active: true, mode: "THRESHOLD", window: "WEEKLY" },
  });

  for (const reward of rewards) {
    const prevTotal = weeklyTotal - pointsAwarded;
    if (prevTotal < reward.thresholdPoints && weeklyTotal >= reward.thresholdPoints) {
      const alreadyGranted = await prisma.rewardGrant.findFirst({
        where: {
          rewardId: reward.id,
          childProfileId: completion.childProfileId,
          grantedAt: { gte: start, lt: end },
        },
      });
      if (!alreadyGranted) {
        await prisma.rewardGrant.create({
          data: {
            rewardId: reward.id,
            childProfileId: completion.childProfileId,
            note: `Threshold reached: ${weeklyTotal} pts`,
          },
        });
      }
    }
  }

  return Response.json({ ok: true, pointsAwarded });
}
