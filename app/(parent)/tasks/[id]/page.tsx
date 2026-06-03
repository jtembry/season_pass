import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TaskForm } from "@/components/TaskForm";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const task = await prisma.taskDefinition.findUnique({
    where: { id, householdId: session!.user.householdId },
  });
  if (!task) notFound();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Edit task</h1>
      <TaskForm task={task} action={`/api/tasks/${id}`} method="PUT" />
    </div>
  );
}
