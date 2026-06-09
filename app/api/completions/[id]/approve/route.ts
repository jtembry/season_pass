import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { getRewardTotal } from "@/lib/ledger";
import { getCurrentWeekBounds } from "@/lib/periods";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "PARENT") return Response.json({ error: "Forbidden" }, { status: 403 });
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

  // Check reward thresholds after commit. A reward's window decides which
  // total counts: WEEKLY sums the current ISO week, CUMULATIVE the all-time
  // total. A weekly reward can be earned once per week; a cumulative reward
  // is earned once, ever.
  const { start, end } = getCurrentWeekBounds();

  const rewards = await prisma.reward.findMany({
    where: { householdId: completion.householdId, active: true, mode: "THRESHOLD" },
  });

  for (const reward of rewards) {
    const total = await getRewardTotal(completion.childProfileId, reward.window);
    const prevTotal = total - pointsAwarded;
    if (prevTotal < reward.thresholdPoints && total >= reward.thresholdPoints) {
      const alreadyGranted = await prisma.rewardGrant.findFirst({
        where: {
          rewardId: reward.id,
          childProfileId: completion.childProfileId,
          ...(reward.window === "WEEKLY" ? { grantedAt: { gte: start, lt: end } } : {}),
        },
      });
      if (!alreadyGranted) {
        await prisma.rewardGrant.create({
          data: {
            rewardId: reward.id,
            childProfileId: completion.childProfileId,
            note: `Threshold reached: ${total} pts`,
          },
        });
      }
    }
  }

  return Response.json({ ok: true, pointsAwarded });
}
