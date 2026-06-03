"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChildProfile, TaskDefinition, TaskAssignment, PointsLedgerEntry } from "@/app/generated/prisma/client";

type Props = {
  child: ChildProfile & {
    assignments: (TaskAssignment & { task: TaskDefinition })[];
    ledgerEntries: PointsLedgerEntry[];
  };
  tasks: TaskDefinition[];
  weeklyPoints: number;
  allTimePoints: number;
};

export function ChildDetail({ child, tasks, weeklyPoints, allTimePoints }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const assignedIds = new Set(child.assignments.map((a) => a.taskDefinitionId));

  async function toggleAssignment(taskId: string) {
    setLoading(true);
    const assigned = assignedIds.has(taskId);
    await fetch(`/api/children/${child.id}/assignments`, {
      method: assigned ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskDefinitionId: taskId }),
    });
    setLoading(false);
    router.refresh();
  }

  async function deleteChild() {
    if (!confirm(`Remove ${child.displayName}? This cannot be undone.`)) return;
    setLoading(true);
    await fetch(`/api/children/${child.id}`, { method: "DELETE" });
    setLoading(false);
    router.push("/children");
    router.refresh();
  }

  const ledgerTypeLabel: Record<string, string> = {
    COMPLETION: "Task",
    BONUS: "Bonus",
    ADJUSTMENT: "Adjustment",
    REDEMPTION: "Redemption",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{child.avatar ?? "🧒"}</span>
          <div>
            <h1 className="text-2xl font-bold">{child.displayName}</h1>
            <p className="text-sm text-gray-500">{weeklyPoints} pts this week · {allTimePoints} total</p>
          </div>
        </div>
        <button onClick={deleteChild} className="text-sm text-red-500 hover:text-red-700">Remove</button>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Assigned tasks</h2>
        <div className="space-y-2">
          {tasks.map((task) => (
            <label
              key={task.id}
              className="flex items-center gap-3 bg-white border rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={assignedIds.has(task.id)}
                onChange={() => toggleAssignment(task.id)}
                disabled={loading}
                className="rounded"
              />
              <span className="text-base">{task.icon ?? "📋"}</span>
              <div className="flex-1">
                <span className="text-sm font-medium">{task.title}</span>
                <span className="text-xs text-gray-400 ml-2">{task.cadence.toLowerCase()} · {task.points} pts</span>
              </div>
            </label>
          ))}
          {tasks.length === 0 && <p className="text-sm text-gray-500">No tasks defined yet.</p>}
        </div>
      </div>

      {child.ledgerEntries.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Recent points history</h2>
          <div className="bg-white border rounded-xl overflow-hidden">
            {child.ledgerEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
                <div>
                  <span className="text-sm font-medium">{ledgerTypeLabel[e.type]}</span>
                  {e.note && <span className="text-xs text-gray-500 ml-2">{e.note}</span>}
                </div>
                <span className={`text-sm font-semibold ${e.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {e.amount >= 0 ? "+" : ""}{e.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
