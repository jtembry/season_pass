import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  displayName: z.string().min(1).max(50),
  avatar: z.string().optional(),
  pin: z.string().length(4).regex(/^\d{4}$/).optional(),
  username: z.string().min(2).max(30).regex(/^[a-z0-9_]+$/, "lowercase letters, numbers, underscore").optional(),
  password: z.string().min(4).max(100).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "PARENT") return Response.json({ error: "Forbidden" }, { status: 403 });
  const children = await prisma.childProfile.findMany({
    where: { householdId: session.user.householdId },
    orderBy: { displayName: "asc" },
  });
  return Response.json(children);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "PARENT") return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = schema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  const { displayName, avatar, pin, username, password } = body.data;

  // A username requires a password and vice versa — a kid login needs both.
  if ((username && !password) || (password && !username))
    return Response.json({ error: "A kid login needs both a username and a password." }, { status: 400 });

  const pinHash = pin ? await bcrypt.hash(pin, 10) : undefined;
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;

  try {
    const child = await prisma.childProfile.create({
      data: { householdId: session.user.householdId, displayName, avatar, pinHash, username, passwordHash },
    });
    return Response.json(child, { status: 201 });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002")
      return Response.json({ error: "That username is already taken." }, { status: 409 });
    throw e;
  }
}
