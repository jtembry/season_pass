"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Reward, RewardGrant, ChildProfile } from "@/app/generated/prisma/client";

type RewardWithGrants = Reward & { grants: (RewardGrant & { child: ChildProfile })[] };
type Window = "WEEKLY" | "CUMULATIVE";

const WINDOW_LABEL: Record<Window, string> = {
  CUMULATIVE: "total",
  WEEKLY: "per week",
};

export function RewardsManager({ rewards }: { rewards: RewardWithGrants[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [thresholdPoints, setThresholdPoints] = useState("280");
  const [window, setWindow] = useState<Window>("CUMULATIVE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createReward(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, thresholdPoints: Number(thresholdPoints), window }),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error ?? "Failed."); return; }
    setTitle("");
    router.refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/rewards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-lg">
      <form onSubmit={createReward} className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold">Add reward</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Holiday World ticket"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Points needed</label>
          <input
            type="number"
            min={1}
            value={thresholdPoints}
            onChange={(e) => setThresholdPoints(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Counts</label>
          <select
            value={window}
            onChange={(e) => setWindow(e.target.value as Window)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="CUMULATIVE">Total points (all-time)</option>
            <option value="WEEKLY">Points this week</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Add reward"}
        </button>
      </form>

      {rewards.map((r) => (
        <RewardCard key={r.id} reward={r} onToggle={toggleActive} onSaved={() => router.refresh()} />
      ))}
    </div>
  );
}

function RewardCard({
  reward,
  onToggle,
  onSaved,
}: {
  reward: RewardWithGrants;
  onToggle: (id: string, active: boolean) => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(reward.title);
  const [thresholdPoints, setThresholdPoints] = useState(String(reward.thresholdPoints));
  const [window, setWindow] = useState<Window>(reward.window as Window);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/rewards/${reward.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, thresholdPoints: Number(thresholdPoints), window }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error ?? "Failed."); return; }
    setEditing(false);
    onSaved();
  }

  return (
    <div className={`bg-white border rounded-xl p-5 space-y-3 ${!reward.active ? "opacity-60" : ""}`}>
      {editing ? (
        <form onSubmit={save} className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Points needed</label>
            <input
              type="number"
              min={1}
              value={thresholdPoints}
              onChange={(e) => setThresholdPoints(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Counts</label>
            <select
              value={window}
              onChange={(e) => setWindow(e.target.value as Window)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="CUMULATIVE">Total points (all-time)</option>
              <option value="WEEKLY">Points this week</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{reward.title}</p>
              <p className="text-sm text-gray-500">{reward.thresholdPoints} pts {WINDOW_LABEL[reward.window as Window]}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(true)}
                className="text-xs px-3 py-1 rounded-full border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              >
                Edit
              </button>
              <button
                onClick={() => onToggle(reward.id, !reward.active)}
                className={`text-xs px-3 py-1 rounded-full border ${reward.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}
              >
                {reward.active ? "Active" : "Inactive"}
              </button>
            </div>
          </div>
          {reward.grants.length > 0 && (
            <div className="text-sm text-gray-600">
              <p className="font-medium text-xs text-gray-400 uppercase tracking-wide mb-1">Grants</p>
              {reward.grants.map((g) => (
                <div key={g.id} className="flex justify-between">
                  <span>{g.child.displayName}</span>
                  <span className="text-gray-400">{new Date(g.grantedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
