"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const callbackUrl = String(formData.get("callbackUrl") || "/");

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email atau kata sandi salah." };
    }
    // NextAuth throws a special redirect error on success; rethrow so Next.js can handle it.
    throw err;
  }
}
