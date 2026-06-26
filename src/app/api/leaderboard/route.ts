import { NextResponse } from "next/server";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/db";
import { getCachedLeaderboard, setCachedLeaderboard } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 100;

export async function GET() {
  const cached = await getCachedLeaderboard();
  if (cached) {
    return NextResponse.json({ entries: cached, cached: true });
  }

  const entries: LeaderboardEntry[] = await getLeaderboard(LIMIT);
  await setCachedLeaderboard(entries);
  return NextResponse.json({ entries, cached: false });
}
