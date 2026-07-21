"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
    >
      Logout
    </button>
  );
}
