import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  childProfileId: z.string(),
  amount: z.number().int(),
  note: z.string().min(1).max(200),
});

// Manual point adjustment — PARENT only
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "PARENT") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  const { childProfileId, amount, note } = body.data;

  const child = await prisma.childProfile.findUnique({ where: { id: childProfileId } });
  if (!child || child.householdId !== session.user.householdId)
    return Response.json({ error: "Not found" }, { status: 404 });

  const entry = await prisma.pointsLedgerEntry.create({
    data: {
      householdId: session.user.householdId,
      childProfileId,
      type: "ADJUSTMENT",
      amount,
      note,
    },
  });
  return Response.json(entry, { status: 201 });
}
