import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).max(100).optional(),
  icon: z.string().optional(),
  category: z.enum(["GET_READY","BREAKFAST","LUNCH","DINNER","BEDTIME","STUDY","WEEKLY","DAILY_ANYTIME","BONUS"]).optional(),
  cadence: z.enum(["DAILY","WEEKLY","ONE_TIME"]).optional(),
  points: z.number().int().min(1).max(1000).optional(),
  dueBy: z.string().nullable().optional(),
  requiresPhoto: z.boolean().optional(),
  isBonus: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const task = await prisma.taskDefinition.findUnique({ where: { id } });
  if (!task || task.householdId !== session.user.householdId)
    return Response.json({ error: "Not found" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  const updated = await prisma.taskDefinition.update({ where: { id }, data: body.data });
  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const task = await prisma.taskDefinition.findUnique({ where: { id } });
  if (!task || task.householdId !== session.user.householdId)
    return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.taskDefinition.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
