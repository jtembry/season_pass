import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const CATEGORY_LABELS: Record<string, string> = {
  GET_READY: "Get Ready",
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  BEDTIME: "Bedtime",
  STUDY: "Study",
  WEEKLY: "Weekly",
  DAILY_ANYTIME: "Daily (anytime)",
  BONUS: "Bonus",
};

export default async function TasksPage() {
  const session = await auth();
  const tasks = await prisma.taskDefinition.findMany({
    where: { householdId: session!.user.householdId },
    orderBy: [{ active: "desc" }, { category: "asc" }, { title: "asc" }],
  });

  const grouped = tasks.reduce<Record<string, typeof tasks>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Link href="/tasks/new" className="bg-blue-600 text-white text-sm rounded-lg px-4 py-2 hover:bg-blue-700">
          Add task
        </Link>
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-500 text-sm">No tasks yet.</p>
      ) : (
        Object.entries(grouped).map(([cat, catTasks]) => (
          <div key={cat}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {CATEGORY_LABELS[cat] ?? cat}
            </h2>
            <div className="space-y-1">
              {catTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className={`flex items-center gap-3 bg-white border rounded-lg px-4 py-3 hover:shadow-sm transition ${!task.active ? "opacity-50" : ""}`}
                >
                  <span className="text-xl">{task.icon ?? "📋"}</span>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{task.title}</span>
                    {!task.active && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <div>{task.points} pts</div>
                    <div>{task.cadence.toLowerCase()}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
