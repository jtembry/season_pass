import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecrypt } from "jose";
import { hkdf } from "@panva/hkdf";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/setup", "/_next", "/favicon.ico", "/uploads"];

// Salt = cookie name, per @auth/core/jwt.js getDerivedEncryptionKey
const COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

async function getKey(salt: string): Promise<Uint8Array> {
  return hkdf(
    "sha256",
    process.env.AUTH_SECRET ?? "",
    salt,
    `Auth.js Generated Encryption Key (${salt})`,
    64 // A256CBC-HS512 requires 64 bytes
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  for (const cookieName of COOKIE_NAMES) {
    const token = req.cookies.get(cookieName)?.value;
    if (!token) continue;
    try {
      const key = await getKey(cookieName);
      await jwtDecrypt(token, key, {
        clockTolerance: 15,
        keyManagementAlgorithms: ["dir"],
        contentEncryptionAlgorithms: ["A256CBC-HS512", "A256GCM"],
      });
      return NextResponse.next();
    } catch {
      // try next cookie name
    }
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
