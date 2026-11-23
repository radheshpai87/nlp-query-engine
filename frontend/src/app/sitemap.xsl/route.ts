import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "sitemap.xsl");
  try {
    const xslContent = fs.readFileSync(filePath, "utf-8");
    return new NextResponse(xslContent, {
      status: 200,
      headers: {
        "Content-Type": "text/xsl; charset=utf-8",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
