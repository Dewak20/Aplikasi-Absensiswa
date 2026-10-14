import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { pin } = await request.json() as { pin?: string };
  const validPin = process.env.ADMIN_PIN || "123456";
  if (pin !== validPin) return NextResponse.json({ error: "PIN admin salah." }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 12,
  });
  return response;
}
