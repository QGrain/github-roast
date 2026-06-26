import { NextRequest, NextResponse } from "next/server";
import { getPercentile, recordScore } from "@/lib/db";
import { AccountNotFoundError, GitHubRateLimitError, collect } from "@/lib/github";
import { beatPercent } from "@/lib/percentile";
import { checkRateLimit, coalesceScan, getCachedScan } from "@/lib/redis";
import { score } from "@/lib/score";
import { verifyTurnstile } from "@/lib/turnstile";
import type { ScanResult } from "@/lib/types";

/** Compute the "you beat X%" payload for a result. Best-effort: null on any issue. */
async function percentileFor(result: ScanResult): Promise<{ beat: number | null; total: number } | null> {
  const counts = await getPercentile(result.scoring.final_score);
  if (!counts) return null;
  return { beat: beatPercent(counts.below, counts.total), total: counts.total };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

/** Extract a bare handle from a username or profile URL. */
function normalizeUsername(input: string): string | null {
  let s = input.trim();
  const m = s.match(/github\.com\/([^/?#]+)/i);
  if (m) s = m[1];
  s = s.replace(/^@/, "");
  return USERNAME_RE.test(s) ? s : null;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "0.0.0.0";
}

export async function POST(req: NextRequest) {
  let body: { username?: string; turnstileToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const username = normalizeUsername(body.username ?? "");
  if (!username) {
    return NextResponse.json({ error: "invalid_username" }, { status: 400 });
  }

  const ip = clientIp(req);

  const human = await verifyTurnstile(body.turnstileToken ?? null, ip);
  if (!human) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });
  }

  // Cache hit short-circuits both GitHub and (later) the LLM. The row already
  // exists from the first cold scan, so just refresh the (time-varying) percentile.
  const cached = await getCachedScan(username);
  if (cached) {
    const percentile = await percentileFor(cached);
    return NextResponse.json({ ...cached, cached: true, percentile });
  }

  const { success } = await checkRateLimit(ip);
  if (!success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const result = await coalesceScan(username, async (): Promise<ScanResult> => {
      const { metrics, top_repos, recent_prs } = await collect(username);
      const scoring = score(metrics);
      return { metrics, top_repos, recent_prs, scoring };
    });

    // Persist for the leaderboard, then compute the fresh percentile (both
    // best-effort — a DB outage must never break the scan itself).
    await recordScore({
      username: result.metrics.username,
      display_name: result.metrics.name,
      avatar_url: result.metrics.avatar_url,
      profile_url: result.metrics.profile_url,
      final_score: result.scoring.final_score,
      tier: result.scoring.tier,
      scanned_at: Date.now(),
    });
    const percentile = await percentileFor(result);

    return NextResponse.json({ ...result, cached: false, percentile });
  } catch (e) {
    if (e instanceof AccountNotFoundError) {
      return NextResponse.json({ error: "account_not_found" }, { status: 404 });
    }
    if (e instanceof GitHubRateLimitError) {
      return NextResponse.json({ error: "github_rate_limited" }, { status: 503 });
    }
    console.error("scan failed:", e);
    return NextResponse.json({ error: "scan_failed" }, { status: 500 });
  }
}
