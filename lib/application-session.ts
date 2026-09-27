import { NextRequest, NextResponse } from "next/server";

const cookieName = "nt_application";
const encoder = new TextEncoder();

async function signature(id: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`next-application:${id}`)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function applicationId(request: NextRequest, secret: string | undefined) {
  if (!secret) return null;
  const value = request.cookies.get(cookieName)?.value || "";
  const match = /^(\d{1,15})\.([a-zA-Z0-9_-]+)$/.exec(value);
  if (!match || !Number.isSafeInteger(Number(match[1]))) return null;
  const expected = await signature(match[1], secret);
  if (match[2].length !== expected.length) return null;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= match[2].charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0 ? Number(match[1]) : null;
}

export async function setApplicationCookie(response: NextResponse, id: number, secret: string) {
  response.cookies.set(cookieName, `${id}.${await signature(String(id), secret)}`, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365,
  });
}
