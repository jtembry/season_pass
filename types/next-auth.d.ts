import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string;
      role: string; // "PARENT" | "CHILD"
      householdId: string;
      householdName: string;
      childProfileId?: string; // set when role === "CHILD"
    };
  }
}
