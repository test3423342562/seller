import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { createCors, handleOptions } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(req: NextRequest) {
  const { cors, isAllowed } = createCors(req);

  if (!isAllowed) {
    return cors(
      NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      ),
    );
  }

  try {
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");

    const title = req.nextUrl.searchParams.get("title");
    const date = req.nextUrl.searchParams.get("date");

    const ts = Number(req.nextUrl.searchParams.get("gago"));
    const token = req.nextUrl.searchParams.get("putangnamo");
    const f_token = req.nextUrl.searchParams.get("f_token");

    if (!tmdbId || !mediaType || !title || !date || !ts || !token || !f_token) {
      return cors(
        NextResponse.json(
          { success: false, error: "need token" },
          { status: 404 },
        ),
      );
    }

    if (Date.now() - ts > 8000) {
      return cors(
        NextResponse.json(
          { success: false, error: "Invalid token" },
          { status: 403 },
        ),
      );
    }

    if (!validateBackendToken(tmdbId, f_token, ts, token)) {
      return cors(
        NextResponse.json(
          { success: false, error: "Invalid token" },
          { status: 403 },
        ),
      );
    }

    const referer = req.headers.get("referer") || "";

    if (!isValidReferer(referer)) {
      return cors(
        NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        ),
      );
    }

    const params = new URLSearchParams({
      tmdbId,
      mediaType,
      title,
      date,
      ...(season && { season }),
      ...(episode && { episode }),
    });

    const res = await fetch(
      `https://school-project-production-9d70.up.railway.app/subtitle?${params.toString()}`,
      {
        method: "GET",
      },
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      return cors(
        NextResponse.json(
          {
            success: false,
            error: data.error || "extraction failed",
          },
          {
            status: data.status || res.status || 500,
          },
        ),
      );
    }

    return cors(NextResponse.json(data));
  } catch {
    return cors(
      NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      ),
    );
  }
}
