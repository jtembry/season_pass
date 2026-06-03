import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).max(100),
  icon: z.string().optional(),
  category: z.enum(["GET_READY","BREAKFAST","LUNCH","DINNER","BEDTIME","STUDY","WEEKLY","DAILY_ANYTIME","BONUS"]),
  cadence: z.enum(["DAILY","WEEKLY","ONE_TIME"]),
  points: z.number().int().min(1).max(1000),
  dueBy: z.string().optional(),
  requiresPhoto: z.boolean().default(false),
  isBonus: z.boolean().default(false),
  active: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const tasks = await prisma.taskDefinition.findMany({
    where: { householdId: session.user.householdId },
    orderBy: { title: "asc" },
  });
  return Response.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  const task = await prisma.taskDefinition.create({
    data: { householdId: session.user.householdId, ...body.data },
  });
  return Response.json(task, { status: 201 });
}
