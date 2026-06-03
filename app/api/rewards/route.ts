import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).max(200),
  thresholdPoints: z.number().int().min(1),
  window: z.enum(["WEEKLY", "CUMULATIVE"]).default("WEEKLY"),
  mode: z.enum(["THRESHOLD", "REDEEMABLE"]).default("THRESHOLD"),
});

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const rewards = await prisma.reward.findMany({
    where: { householdId: session.user.householdId },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(rewards);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  const reward = await prisma.reward.create({
    data: { householdId: session.user.householdId, ...body.data },
  });
  return Response.json(reward, { status: 201 });
}
