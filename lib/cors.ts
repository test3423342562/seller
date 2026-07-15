import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_ORIGINS } from "@/lib/allowed-referers";

export function createCors(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";

  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    ALLOWED_ORIGINS.some((o) => referer.startsWith(o));

  const cors = (res: NextResponse) => {
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS.find((o) => referer.startsWith(o)) || "";
    res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return res;
  };

  return { origin, cors, isAllowed };
}

export function handleOptions(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS.find((o) => referer.startsWith(o)) || "";

  if (!allowedOrigin) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
