import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReviewQueue } from "./ReviewQueue";

export default async function ReviewPage() {
  const session = await auth();
  const completions = await prisma.completion.findMany({
    where: { householdId: session!.user.householdId, status: "PENDING_REVIEW" },
    include: {
      task: true,
      child: true,
      verifications: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { submittedAt: "asc" },
  });

  // Sort: NOT_DONE/UNSURE first (surface suspicious ones)
  const sorted = [...completions].sort((a, b) => {
    const priority = (c: typeof completions[0]) => {
      const v = c.verifications[0]?.verdict;
      if (v === "NOT_DONE") return 0;
      if (v === "UNSURE") return 1;
      return 2;
    };
    return priority(a) - priority(b);
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Review Queue</h1>
      {sorted.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">All caught up! No completions pending review.</p>
      ) : (
        <ReviewQueue completions={sorted} />
      )}
    </div>
  );
}
