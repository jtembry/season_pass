import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  displayName: z.string().min(1).max(50),
  avatar: z.string().optional(),
  pin: z.string().length(4).regex(/^\d{4}$/).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const children = await prisma.childProfile.findMany({
    where: { householdId: session.user.householdId },
    orderBy: { displayName: "asc" },
  });
  return Response.json(children);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  const { displayName, avatar, pin } = body.data;
  const pinHash = pin ? await bcrypt.hash(pin, 10) : undefined;

  const child = await prisma.childProfile.create({
    data: { householdId: session.user.householdId, displayName, avatar, pinHash },
  });
  return Response.json(child, { status: 201 });
}
