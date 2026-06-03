"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-gray-500 hover:text-gray-900 text-sm"
    >
      Sign out
    </button>
  );
}
