// import { NextRequest, NextResponse } from "next/server";
// import crypto from "crypto";
// import { ALLOWED_ORIGINS, isValidReferer } from "@/lib/allowed-referers";

// const SECRET = process.env.API_SECRET!;

// function validateFrontendToken(f_token: string, id: string, ts: number) {
//   const expected = crypto
//     .createHash("sha256")
//     .update(`${id}:${ts}`)
//     .digest("hex");
//   return expected === f_token && Date.now() - ts < 5000;
// }

// function generateBackendToken(f_token: string, id: string) {
//   const ts = Date.now();
//   const token = crypto
//     .createHmac("sha256", SECRET)
//     .update(`${id}:${f_token}:${ts}`)
//     .digest("hex");
//   return { token, ts };
// }
// const blockedIPs = ["45.86.86.43"];

// export async function POST(req: NextRequest) {
//   const { idd, f_token, ts } = await req.json();
//   const forwardedFor = req.headers.get("x-forwarded-for");
//   const ip = forwardedFor?.split(",")[0] || "Unknown";
//   const connectingIp = req.headers.get("cf-connecting-ip");
//   const ua = req.headers.get("user-agent") || "unknown";
//   const origin = req.headers.get("origin") || "";
//   const referer = req.headers.get("referer") || "";

//   console.log("TOKEN HIT", { connectingIp, ip, ua, origin });
//   if (!ALLOWED_ORIGINS.includes(origin)) {
//     return NextResponse.json(
//       { success: false, error: "Internal Server Error" },
//       { status: 500 },
//     );
//   }

//   if (!isValidReferer(referer)) {
//     return NextResponse.json(
//       { success: false, error: "Forbidden" },
//       { status: 403 },
//     );
//   }

//   if (blockedIPs.includes(ip)) {
//     console.log("Blocked IP tried to access:", ip, ua);
//     return new Response(null, { status: 403 });
//   }

//   if (!validateFrontendToken(f_token, idd, ts)) {
//     return NextResponse.json(
//       { error: "Blocked IP tried to access:" },
//       { status: 422 },
//     );
//   }

//   const b_token = generateBackendToken(f_token, idd);
//   return NextResponse.json(b_token);
// }
// // Bind HMAC token to IP — so even a stolen token is useless
// app/api/token/route.ts

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ALLOWED_ORIGINS, isValidReferer } from "@/lib/allowed-referers";

const SECRET = process.env.API_SECRET!;

function validateFrontendToken(f_token: string, id: string, ts: number) {
  const expected = crypto
    .createHash("sha256")
    .update(`${id}:${ts}`)
    .digest("hex");
  return expected === f_token && Date.now() - ts < 5000;
}

function generateBackendToken(f_token: string, id: string) {
  const ts = Date.now();
  const token = crypto
    .createHmac("sha256", SECRET)
    .update(`${id}:${f_token}:${ts}`)
    .digest("hex");
  return { token, ts };
}

function withCors(response: NextResponse, origin: string): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

const blockedIPs = ["45.86.86.43"];

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") || "";

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(req: NextRequest) {
  const { idd, f_token, ts } = await req.json();
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0] || "Unknown";
  const connectingIp = req.headers.get("cf-connecting-ip");
  const ua = req.headers.get("user-agent") || "unknown";
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";

  console.log("TOKEN HIT", { connectingIp, ip, ua, origin });

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return withCors(
      NextResponse.json(
        { success: false, error: "Internal Server Error" },
        { status: 500 },
      ),
      origin,
    );
  }

  if (!isValidReferer(referer)) {
    return withCors(
      NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      ),
      origin,
    );
  }

  if (blockedIPs.includes(ip)) {
    console.log("Blocked IP tried to access:", ip, ua);
    return new Response(null, { status: 403 });
  }

  if (!validateFrontendToken(f_token, idd, ts)) {
    return withCors(
      NextResponse.json(
        { error: "Blocked IP tried to access:" },
        { status: 422 },
      ),
      origin,
    );
  }

  const b_token = generateBackendToken(f_token, idd);
  return withCors(NextResponse.json(b_token), origin);
}
