import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Resolve tenant context from the request host.
// - <slug>.desapresisi.id / <slug>.desapresisi.local  -> tenant (dashboard)
// - desapresisi.id / desapresisi.local                 -> main domain (landing)
// - localhost / *.vercel.app / IP                      -> normal single-domain app
function tenantContext(hostname: string): { isMain: boolean; slug: string | null } {
  const bases = ["desapresisi.id", "desapresisi.local"];
  for (const base of bases) {
    if (hostname === base || hostname === `www.${base}`) return { isMain: true, slug: null };
    if (hostname.endsWith(`.${base}`)) return { isMain: false, slug: hostname.slice(0, -(base.length + 1)) };
  }
  return { isMain: false, slug: null };
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const hostname = (req.headers.get("host") || "").split(":")[0];
  const { isMain, slug } = tenantContext(hostname);

  // Public landing page on the main marketing domain.
  if (isMain) {
    if (pathname === "/landing") return NextResponse.next();
    if (pathname === "/") return NextResponse.rewrite(new URL("/landing", req.url));
  }
  if (pathname === "/landing") return NextResponse.next();

  const isLoggedIn = !!req.auth;

  if (pathname.startsWith("/login")) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const res = NextResponse.next();
  if (slug) res.headers.set("x-desa-slug", slug);
  return res;
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
