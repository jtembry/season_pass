"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={async () => {
        // Clear the session without letting NextAuth compute the redirect
        // server-side (behind a reverse proxy / tunnel it can resolve to the
        // wrong host). Navigate client-side with a relative path so we stay on
        // whatever origin the user is currently on.
        await signOut({ redirect: false });
        window.location.href = "/login";
      }}
      className="text-gray-500 hover:text-gray-900 text-sm"
    >
      Sign out
    </button>
  );
}
