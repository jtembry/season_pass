import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRewardTotal } from "@/lib/ledger";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const householdId = session!.user.householdId;

  const [pendingCount, children, rewards] = await Promise.all([
    prisma.completion.count({ where: { householdId, status: "PENDING_REVIEW" } }),
    prisma.childProfile.findMany({ where: { householdId }, orderBy: { displayName: "asc" } }),
    prisma.reward.findMany({ where: { householdId, active: true } }),
  ]);

  // The headline progress tracks the first active reward. Its window decides
  // whether we count weekly points or the all-time total.
  const reward = rewards[0];
  const pointsWindow = reward?.window ?? "WEEKLY";
  const pointsLabel = pointsWindow === "WEEKLY" ? "pts this week" : "pts total";

  const childTotals = await Promise.all(
    children.map(async (c) => ({
      ...c,
      points: await getRewardTotal(c.id, pointsWindow),
    }))
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {pendingCount > 0 && (
        <Link
          href="/review"
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 hover:bg-amber-100 transition"
        >
          <div>
            <p className="font-semibold text-amber-800">Review queue</p>
            <p className="text-sm text-amber-700">{pendingCount} completion{pendingCount !== 1 ? "s" : ""} waiting for approval</p>
          </div>
          <span className="text-2xl font-bold text-amber-600">{pendingCount}</span>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {childTotals.map((child) => {
          const pct = reward ? Math.min(100, Math.round((child.points / reward.thresholdPoints) * 100)) : null;
          return (
            <div key={child.id} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{child.displayName}</p>
                  <p className="text-sm text-gray-500">{child.points} {pointsLabel}</p>
                </div>
                {child.avatar && (
                  <span className="text-3xl">{child.avatar}</span>
                )}
              </div>
              {reward && pct !== null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{reward.title}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {children.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-3">No children yet.</p>
          <Link href="/children/new" className="text-blue-600 hover:underline text-sm">Add a child profile →</Link>
        </div>
      )}
    </div>
  );
}
