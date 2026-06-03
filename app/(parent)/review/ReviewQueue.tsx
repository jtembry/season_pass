"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Completion, TaskDefinition, ChildProfile, VerificationCheck } from "@/app/generated/prisma/client";
import Image from "next/image";

type CompletionWithRelations = Completion & {
  task: TaskDefinition;
  child: ChildProfile;
  verifications: VerificationCheck[];
};

const VERDICT_STYLE: Record<string, string> = {
  LOOKS_DONE: "bg-green-50 text-green-700 border-green-200",
  NOT_DONE: "bg-red-50 text-red-700 border-red-200",
  UNSURE: "bg-amber-50 text-amber-700 border-amber-200",
};

export function ReviewQueue({ completions }: { completions: CompletionWithRelations[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function action(id: string, type: "approve" | "reject") {
    setLoading((l) => ({ ...l, [id]: true }));
    await fetch(`/api/completions/${id}/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNote: notes[id] }),
    });
    setLoading((l) => ({ ...l, [id]: false }));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {completions.map((c) => {
        const verdict = c.verifications[0];
        return (
          <div key={c.id} className="bg-white border rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{c.task.icon ?? "📋"}</span>
                  <span className="font-semibold">{c.task.title}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {c.child.displayName} · {c.task.points} pts · {new Date(c.submittedAt).toLocaleDateString()}
                </p>
              </div>
              {verdict && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded border ${VERDICT_STYLE[verdict.verdict] ?? ""}`}>
                  Agent: {verdict.verdict.replace("_", " ")} ({Math.round(verdict.confidence * 100)}%)
                </span>
              )}
            </div>

            {verdict && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 italic">
                &ldquo;{verdict.reasoning}&rdquo;
              </p>
            )}

            {c.photoUrl && (
              <div className="relative w-full max-w-xs h-40 rounded-lg overflow-hidden border">
                <Image src={c.photoUrl} alt="Completion photo" fill className="object-cover" />
              </div>
            )}

            <div>
              <input
                value={notes[c.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                placeholder="Note (optional)"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => action(c.id, "approve")}
                disabled={loading[c.id]}
                className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => action(c.id, "reject")}
                disabled={loading[c.id]}
                className="flex-1 bg-red-50 text-red-700 border border-red-200 rounded-lg py-2 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
              >
                ✗ Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
