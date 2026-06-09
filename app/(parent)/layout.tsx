import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  // Kids never see parent pages; send them to their own kid mode.
  if (session.user.role !== "PARENT") {
    redirect(session.user.childProfileId ? `/kid/${session.user.childProfileId}` : "/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-lg text-blue-600">
            Chore Quest
          </Link>
          <nav className="hidden sm:flex gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/review" className="text-gray-600 hover:text-gray-900">Review Queue</Link>
            <Link href="/children" className="text-gray-600 hover:text-gray-900">Children</Link>
            <Link href="/tasks" className="text-gray-600 hover:text-gray-900">Tasks</Link>
            <Link href="/leaderboard" className="text-gray-600 hover:text-gray-900">Leaderboard</Link>
            <Link href="/rewards" className="text-gray-600 hover:text-gray-900">Rewards</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500 hidden sm:block">{session.user.householdName}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 px-4 sm:px-6 py-6 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
