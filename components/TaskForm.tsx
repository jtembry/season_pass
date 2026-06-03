"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TaskDefinition } from "@/app/generated/prisma/client";

const CATEGORIES = [
  "GET_READY","BREAKFAST","LUNCH","DINNER","BEDTIME","STUDY","WEEKLY","DAILY_ANYTIME","BONUS",
];
const CADENCES = ["DAILY","WEEKLY","ONE_TIME"];
const ICONS = ["📋","🛏️","🍽️","🚿","🦷","📚","🧹","🐾","🗑️","🧺","🐱","🌟","⭐","💪","🏃"];

type Props = {
  task?: TaskDefinition;
  action: string;
  method?: "POST" | "PUT";
};

export function TaskForm({ task, action, method = "POST" }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(task?.title ?? "");
  const [icon, setIcon] = useState(task?.icon ?? "📋");
  const [category, setCategory] = useState<string>(task?.category ?? "DAILY_ANYTIME");
  const [cadence, setCadence] = useState<string>(task?.cadence ?? "DAILY");
  const [points, setPoints] = useState(String(task?.points ?? 10));
  const [dueBy, setDueBy] = useState(task?.dueBy ?? "");
  const [requiresPhoto, setRequiresPhoto] = useState(task?.requiresPhoto ?? false);
  const [isBonus, setIsBonus] = useState(task?.isBonus ?? false);
  const [active, setActive] = useState(task?.active ?? true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(action, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, icon, category, cadence, points: Number(points), dueBy: dueBy || undefined, requiresPhoto, isBonus, active }),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error ?? "Failed."); return; }
    router.push("/tasks");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-5 max-w-md">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Icon</label>
        <div className="flex flex-wrap gap-1">
          {ICONS.map((i) => (
            <button key={i} type="button" onClick={() => setIcon(i)}
              className={`text-xl rounded p-1 border-2 ${icon === i ? "border-blue-500 bg-blue-50" : "border-transparent"}`}>
              {i}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cadence</label>
          <select value={cadence} onChange={(e) => setCadence(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {CADENCES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Points</label>
          <input type="number" min={1} value={points} onChange={(e) => setPoints(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Due by (optional)</label>
          <input type="time" value={dueBy} onChange={(e) => setDueBy(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="space-y-2">
        {[
          [requiresPhoto, setRequiresPhoto, "Requires photo"],
          [isBonus, setIsBonus, "Bonus task"],
          [active, setActive, "Active"],
        ].map(([val, set, label]) => (
          <label key={label as string} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={val as boolean} onChange={(e) => (set as (v: boolean) => void)(e.target.checked)} className="rounded" />
            {label as string}
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => router.back()} className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
