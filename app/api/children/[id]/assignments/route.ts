import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({ taskDefinitionId: z.string() });

async function getChild(id: string, householdId: string) {
  return prisma.childProfile.findUnique({ where: { id, householdId } });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "PARENT") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const child = await getChild(id, session.user.householdId);
  if (!child) return Response.json({ error: "Not found" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  const assignment = await prisma.taskAssignment.upsert({
    where: { taskDefinitionId_childProfileId: { taskDefinitionId: body.data.taskDefinitionId, childProfileId: id } },
    create: { taskDefinitionId: body.data.taskDefinitionId, childProfileId: id },
    update: {},
  });
  return Response.json(assignment, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "PARENT") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const child = await getChild(id, session.user.householdId);
  if (!child) return Response.json({ error: "Not found" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  await prisma.taskAssignment.deleteMany({
    where: { taskDefinitionId: body.data.taskDefinitionId, childProfileId: id },
  });
  return new Response(null, { status: 204 });
}
