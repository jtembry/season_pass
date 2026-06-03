"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Reward, RewardGrant, ChildProfile } from "@/app/generated/prisma/client";

type RewardWithGrants = Reward & { grants: (RewardGrant & { child: ChildProfile })[] };

export function RewardsManager({ rewards }: { rewards: RewardWithGrants[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [thresholdPoints, setThresholdPoints] = useState("280");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createReward(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, thresholdPoints: Number(thresholdPoints) }),
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
          <label className="block text-sm font-medium mb-1">Weekly threshold (points)</label>
          <input
            type="number"
            min={1}
            value={thresholdPoints}
            onChange={(e) => setThresholdPoints(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
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
        <div key={r.id} className={`bg-white border rounded-xl p-5 space-y-3 ${!r.active ? "opacity-60" : ""}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-gray-500">{r.thresholdPoints} pts / {r.window.toLowerCase()}</p>
            </div>
            <button
              onClick={() => toggleActive(r.id, !r.active)}
              className={`text-xs px-3 py-1 rounded-full border ${r.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}
            >
              {r.active ? "Active" : "Inactive"}
            </button>
          </div>
          {r.grants.length > 0 && (
            <div className="text-sm text-gray-600">
              <p className="font-medium text-xs text-gray-400 uppercase tracking-wide mb-1">Grants</p>
              {r.grants.map((g) => (
                <div key={g.id} className="flex justify-between">
                  <span>{g.child.displayName}</span>
                  <span className="text-gray-400">{new Date(g.grantedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
