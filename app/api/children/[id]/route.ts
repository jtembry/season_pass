import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "PARENT") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const child = await prisma.childProfile.findUnique({ where: { id } });
  if (!child || child.householdId !== session.user.householdId)
    return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.childProfile.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
