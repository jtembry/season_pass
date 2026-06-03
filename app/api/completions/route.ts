import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import { enqueueVerification } from "@/lib/verification";

const schema = z.object({
  taskDefinitionId: z.string(),
  childProfileId: z.string(),
  periodKey: z.string(),
  photoUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.flatten() }, { status: 400 });

  const { taskDefinitionId, childProfileId, periodKey, photoUrl } = body.data;

  const task = await prisma.taskDefinition.findUnique({ where: { id: taskDefinitionId } });
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  const child = await prisma.childProfile.findUnique({ where: { id: childProfileId } });
  if (!child || child.householdId !== task.householdId)
    return Response.json({ error: "Child not found" }, { status: 404 });

  // Upsert: allow resubmission after rejection
  const completion = await prisma.completion.upsert({
    where: { taskDefinitionId_childProfileId_periodKey: { taskDefinitionId, childProfileId, periodKey } },
    create: {
      householdId: task.householdId,
      taskDefinitionId,
      childProfileId,
      periodKey,
      photoUrl,
      status: "PENDING_REVIEW",
    },
    update: {
      photoUrl,
      status: "PENDING_REVIEW",
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedById: null,
      reviewNote: null,
    },
  });

  // Fire-and-forget vision verification if photo present
  if (photoUrl && task.requiresPhoto) {
    enqueueVerification(completion.id, task.title, photoUrl).catch(console.error);
  }

  return Response.json(completion, { status: 201 });
}
