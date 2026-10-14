import crypto from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "hadirin_admin";

function secret() {
  return process.env.AUTH_SECRET || "ganti-rahasia-ini-sebelum-live";
}

export function adminToken() {
  return crypto.createHmac("sha256", secret()).update("hadirin-admin").digest("hex");
}

export function isAdmin(request: NextRequest) {
  const value = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const expected = adminToken();
  return value.length === expected.length && crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
