import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  const token = process.env.SCRAPEDO_TOKEN;
  const encodedUrl = encodeURIComponent(targetUrl!);
  const res = await fetch(
    `https://api.scrape.do/?token=${token}&url=${encodedUrl}&render=true`,
  );
  const text = await res.text();
  return new NextResponse(text, { status: 200 });
}
