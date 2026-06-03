import { TaskForm } from "@/components/TaskForm";

export default function NewTaskPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Add task</h1>
      <TaskForm action="/api/tasks" method="POST" />
    </div>
  );
}
