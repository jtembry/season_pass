"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AVATARS = ["🧒", "👦", "👧", "🧑", "🐱", "🐶", "🦁", "🐼", "🦊", "🐸"];

export default function NewChildPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("🧒");
  const [pin, setPin] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        avatar,
        pin: pin || undefined,
        username: username || undefined,
        password: password || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed to create child.");
      return;
    }
    router.push("/children");
    router.refresh();
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-6">Add child</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            placeholder="e.g. Alex"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Avatar</label>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                className={`text-2xl rounded-lg p-1.5 border-2 ${avatar === a ? "border-blue-500 bg-blue-50" : "border-transparent"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Kid-mode PIN (optional)</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="4-digit PIN"
            maxLength={4}
            pattern="[0-9]{4}"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="border-t pt-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">Kid login (optional)</p>
          <p className="text-xs text-gray-500 -mt-3">
            Give this child a username and password so they can sign in to their own kid mode.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="e.g. alex"
              pattern="[a-z0-9_]{2,30}"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="at least 4 characters"
              minLength={4}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
