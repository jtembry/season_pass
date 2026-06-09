import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ChildrenPage() {
  const session = await auth();
  const children = await prisma.childProfile.findMany({
    where: { householdId: session!.user.householdId },
    orderBy: { displayName: "asc" },
    include: { _count: { select: { assignments: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Children</h1>
        <Link href="/children/new" className="bg-blue-600 text-white text-sm rounded-lg px-4 py-2 hover:bg-blue-700">
          Add child
        </Link>
      </div>

      {children.length === 0 ? (
        <p className="text-gray-500 text-sm">No children yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/children/${child.id}`}
              className="bg-white border rounded-xl p-5 hover:shadow-md transition flex items-center gap-4"
            >
              <span className="text-3xl">{child.avatar ?? "🧒"}</span>
              <div>
                <p className="font-semibold">{child.displayName}</p>
                <p className="text-xs text-gray-500">{child._count.assignments} task{child._count.assignments !== 1 ? "s" : ""} assigned</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
