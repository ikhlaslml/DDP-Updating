"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-[#7A1F2E] focus:outline-none focus:ring-2 focus:ring-[#7A1F2E]/25"
          placeholder="nama@desa.id"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="password">
          Kata sandi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-[#7A1F2E] focus:outline-none focus:ring-2 focus:ring-[#7A1F2E]/25"
          placeholder="Masukkan kata sandi"
        />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-[48px] w-full rounded-lg bg-[#7A1F2E] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#651825] focus:outline-none focus:ring-2 focus:ring-[#7A1F2E]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Memproses..." : "Masuk"}
      </button>
    </form>
  );
}
