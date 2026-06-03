import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getWeeklyTotal, getAllTimeTotal } from "@/lib/ledger";
import { ChildDetail } from "./ChildDetail";

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const child = await prisma.childProfile.findUnique({
    where: { id, householdId: session!.user.householdId },
    include: {
      assignments: { include: { task: true } },
      ledgerEntries: { orderBy: { occurredAt: "desc" }, take: 20 },
    },
  });
  if (!child) notFound();

  const tasks = await prisma.taskDefinition.findMany({
    where: { householdId: session!.user.householdId, active: true },
    orderBy: { title: "asc" },
  });

  const [weeklyPoints, allTimePoints] = await Promise.all([
    getWeeklyTotal(child.id),
    getAllTimeTotal(child.id),
  ]);

  return (
    <ChildDetail
      child={child}
      tasks={tasks}
      weeklyPoints={weeklyPoints}
      allTimePoints={allTimePoints}
    />
  );
}
