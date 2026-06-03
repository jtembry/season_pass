import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  thresholdPoints: z.number().int().min(1).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const reward = await prisma.reward.findUnique({ where: { id } });
  if (!reward || reward.householdId !== session.user.householdId)
    return Response.json({ error: "Not found" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  const updated = await prisma.reward.update({ where: { id }, data: body.data });
  return Response.json(updated);
}
