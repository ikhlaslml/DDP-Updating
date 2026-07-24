"use client";

import { createContext, useContext } from "react";

export type AuthInfo = { role: string; desaNama: string; email: string };

const AuthInfoContext = createContext<AuthInfo>({ role: "operator", desaNama: "Desa", email: "" });

export function AuthInfoProvider({ value, children }: { value: AuthInfo; children: React.ReactNode }) {
  return <AuthInfoContext.Provider value={value}>{children}</AuthInfoContext.Provider>;
}

export function useAuthInfo() {
  return useContext(AuthInfoContext);
}

// operator can edit; pemerintah_desa is read-only.
export function useCanWrite() {
  return useContext(AuthInfoContext).role === "operator";
}
