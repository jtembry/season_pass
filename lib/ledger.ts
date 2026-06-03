import { prisma } from "@/lib/prisma";
import { getCurrentWeekBounds } from "@/lib/periods";

export async function getWeeklyTotal(childProfileId: string): Promise<number> {
  const { start, end } = getCurrentWeekBounds();
  const result = await prisma.pointsLedgerEntry.aggregate({
    where: { childProfileId, occurredAt: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function getAllTimeTotal(childProfileId: string): Promise<number> {
  const result = await prisma.pointsLedgerEntry.aggregate({
    where: { childProfileId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}
