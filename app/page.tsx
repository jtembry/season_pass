import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "CHILD" && session.user.childProfileId) {
    redirect(`/kid/${session.user.childProfileId}`);
  }
  redirect("/dashboard");
}
