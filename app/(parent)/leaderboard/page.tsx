import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getWeeklyTotal, getAllTimeTotal } from "@/lib/ledger";
import { getISOWeekKey } from "@/lib/periods";

export default async function LeaderboardPage() {
  const session = await auth();
  const children = await prisma.childProfile.findMany({
    where: { householdId: session!.user.householdId },
    orderBy: { displayName: "asc" },
  });

  const standings = await Promise.all(
    children.map(async (c) => ({
      ...c,
      weeklyPoints: await getWeeklyTotal(c.id),
      allTimePoints: await getAllTimeTotal(c.id),
    }))
  );
  standings.sort((a, b) => b.weeklyPoints - a.weeklyPoints);

  const rewards = await prisma.reward.findMany({
    where: { householdId: session!.user.householdId, active: true },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <p className="text-sm text-gray-500">Week {getISOWeekKey()}</p>

      <div className="bg-white border rounded-xl overflow-hidden">
        {standings.map((child, i) => {
          const reward = rewards[0];
          const pct = reward ? Math.min(100, Math.round((child.weeklyPoints / reward.thresholdPoints) * 100)) : null;
          return (
            <div key={child.id} className="flex items-center gap-4 px-5 py-4 border-b last:border-0">
              <span className="text-xl font-bold text-gray-300 w-6 text-center">{i + 1}</span>
              <span className="text-2xl">{child.avatar ?? "🧒"}</span>
              <div className="flex-1">
                <p className="font-semibold">{child.displayName}</p>
                {reward && pct !== null && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{pct}%</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{child.weeklyPoints}</p>
                <p className="text-xs text-gray-400">this week</p>
              </div>
            </div>
          );
        })}
        {standings.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">No children yet.</p>
        )}
      </div>

      {rewards.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="font-semibold text-amber-800">🏆 Active reward</p>
          {rewards.map((r) => (
            <p key={r.id} className="text-sm text-amber-700 mt-1">
              {r.title} — {r.thresholdPoints} pts/{r.window.toLowerCase()}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
