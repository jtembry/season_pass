import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  householdName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

// One-shot setup: create the first household + parent account.
// Disabled once any user exists.
export async function POST(req: NextRequest) {
  const existingUser = await prisma.user.findFirst();
  if (existingUser)
    return Response.json({ error: "Setup already complete" }, { status: 409 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  const { householdName, email, password } = body.data;
  const passwordHash = await bcrypt.hash(password, 12);

  const household = await prisma.household.create({ data: { name: householdName } });
  const user = await prisma.user.create({
    data: { householdId: household.id, email, passwordHash },
  });

  return Response.json({ householdId: household.id, userId: user.id }, { status: 201 });
}
