import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const completion = await prisma.completion.findUnique({ where: { id } });
  if (!completion || completion.householdId !== session.user.householdId)
    return Response.json({ error: "Not found" }, { status: 404 });
  if (completion.status !== "PENDING_REVIEW")
    return Response.json({ error: "Not pending review" }, { status: 409 });

  const { reviewNote } = await req.json().catch(() => ({}));

  const updated = await prisma.completion.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
    },
  });
  return Response.json(updated);
}
