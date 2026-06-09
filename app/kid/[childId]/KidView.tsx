"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import type { ChildProfile, TaskAssignment, TaskDefinition, Completion, Reward, RewardGrant } from "@/app/generated/prisma/client";

type Assignment = TaskAssignment & { task: TaskDefinition };
type Grant = RewardGrant & { reward: Reward };

type Props = {
  child: ChildProfile;
  assignments: Assignment[];
  completions: Completion[];
  weeklyPoints: number;
  rewards: Reward[];
  leaderboard: { id: string; displayName: string; avatar: string | null; points: number }[];
  recentGrants: Grant[];
  today: string;
  thisWeek: string;
};

export function KidView({ child, assignments, completions, weeklyPoints, rewards, leaderboard, recentGrants, today, thisWeek }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [photoFor, setPhotoFor] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const completedMap = new Map(completions.map((c) => [
    `${c.taskDefinitionId}::${c.periodKey}`,
    c,
  ]));

  function periodKey(task: TaskDefinition): string {
    return task.cadence === "WEEKLY" ? thisWeek : today;
  }

  function getCompletion(task: TaskDefinition): Completion | undefined {
    return completedMap.get(`${task.id}::${periodKey(task)}`);
  }

  async function markDone(task: TaskDefinition, photoFile?: File) {
    setLoading(task.id);
    let photoUrl: string | undefined;

    if (photoFile) {
      const fd = new FormData();
      fd.append("file", photoFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        photoUrl = url;
      }
    }

    await fetch("/api/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskDefinitionId: task.id,
        childProfileId: child.id,
        periodKey: periodKey(task),
        photoUrl,
      }),
    });
    setLoading(null);
    setPhotoFor(null);
    router.refresh();
  }

  function handleTaskClick(task: TaskDefinition) {
    const completion = getCompletion(task);
    if (completion) return;
    if (task.requiresPhoto) {
      setPhotoFor(task.id);
      fileRef.current?.click();
    } else {
      markDone(task);
    }
  }

  const dailyTasks = assignments.filter((a) => a.task.cadence === "DAILY" || a.task.cadence === "ONE_TIME");
  const weeklyTasks = assignments.filter((a) => a.task.cadence === "WEEKLY");
  const reward = rewards[0];
  const pct = reward ? Math.min(100, Math.round((weeklyPoints / reward.thresholdPoints) * 100)) : null;

  const statusBadge = (task: TaskDefinition) => {
    const c = getCompletion(task);
    if (!c) return null;
    const styles: Record<string, string> = {
      PENDING_REVIEW: "text-amber-600 bg-amber-50",
      APPROVED: "text-green-700 bg-green-50",
      REJECTED: "text-red-600 bg-red-50",
    };
    const labels: Record<string, string> = {
      PENDING_REVIEW: "Waiting",
      APPROVED: "✓ Done",
      REJECTED: "Try again",
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[c.status]}`}>
        {labels[c.status]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && photoFor) {
            const task = assignments.find((a) => a.taskDefinitionId === photoFor)?.task;
            if (task) markDone(task, file);
          }
          e.target.value = "";
        }}
      />

      <div className="max-w-sm mx-auto px-4 py-6 space-y-5">
        <div className="flex justify-end">
          <SignOutButton />
        </div>
        <div className="text-center">
          <div className="text-5xl mb-1">{child.avatar ?? "🧒"}</div>
          <h1 className="text-xl font-bold">{child.displayName}</h1>
          <p className="text-sm text-gray-500">{weeklyPoints} pts this week</p>
        </div>

        {reward && pct !== null && (
          <div className="bg-white rounded-xl border p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">{reward.title}</span>
              <span className="text-gray-500">{weeklyPoints}/{reward.thresholdPoints}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            {pct >= 100 && (
              <p className="text-center text-green-700 font-semibold text-sm mt-2">🎉 You earned it!</p>
            )}
          </div>
        )}

        {recentGrants.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-lg">🏆</p>
            <p className="font-semibold text-yellow-800">You unlocked: {recentGrants[0].reward.title}!</p>
          </div>
        )}

        <TaskSection
          title="Today's tasks"
          tasks={dailyTasks}
          onTap={handleTaskClick}
          loading={loading}
          statusBadge={statusBadge}
          getCompletion={getCompletion}
        />

        {weeklyTasks.length > 0 && (
          <TaskSection
            title="This week"
            tasks={weeklyTasks}
            onTap={handleTaskClick}
            loading={loading}
            statusBadge={statusBadge}
            getCompletion={getCompletion}
          />
        )}

        {leaderboard.length > 1 && (
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b">
              <h2 className="font-semibold text-sm">Leaderboard</h2>
            </div>
            {leaderboard.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${s.id === child.id ? "bg-blue-50" : ""}`}
              >
                <span className="text-sm text-gray-400 w-4">{i + 1}</span>
                <span>{s.avatar ?? "🧒"}</span>
                <span className="flex-1 text-sm">{s.displayName}</span>
                <span className="font-semibold text-sm">{s.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskSection({
  title,
  tasks,
  onTap,
  loading,
  statusBadge,
  getCompletion,
}: {
  title: string;
  tasks: Assignment[];
  onTap: (task: TaskDefinition) => void;
  loading: string | null;
  statusBadge: (task: TaskDefinition) => React.ReactNode;
  getCompletion: (task: TaskDefinition) => Completion | undefined;
}) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <h2 className="font-semibold text-sm text-gray-500 mb-2">{title}</h2>
      <div className="space-y-2">
        {tasks.map(({ task }) => {
          const completion = getCompletion(task);
          const done = completion?.status === "APPROVED";
          return (
            <button
              key={task.id}
              onClick={() => onTap(task)}
              disabled={!!completion || loading === task.id}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition
                ${done ? "bg-green-50 border-green-200 opacity-70" : "bg-white hover:shadow-sm"}
                ${completion?.status === "PENDING_REVIEW" ? "bg-amber-50 border-amber-200" : ""}
                ${loading === task.id ? "opacity-50" : ""}
              `}
            >
              <span className="text-2xl">{task.icon ?? "📋"}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-gray-400">+{task.points} pts{task.requiresPhoto ? " · 📷" : ""}</p>
              </div>
              {loading === task.id ? (
                <span className="text-xs text-gray-400">…</span>
              ) : (
                statusBadge(task)
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
