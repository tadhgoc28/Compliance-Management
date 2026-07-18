import { NextResponse, type NextRequest } from "next/server";
import { searchAll } from "@/lib/data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  if (query.trim().length < 2) {
    return NextResponse.json({ hits: [] });
  }

  try {
    const hits = await searchAll(query);
    return NextResponse.json({ hits });
  } catch (error) {
    console.error("search failed", error);
    return NextResponse.json({ hits: [], error: "Search failed" }, { status: 500 });
  }
}
