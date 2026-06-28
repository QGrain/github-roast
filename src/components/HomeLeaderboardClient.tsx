"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  LeaderboardClient,
  type LeaderboardClientEntry,
  type LeaderboardLabels,
  type LeaderboardView,
} from "./LeaderboardClient";

function TabDivider() {
  return <span className="h-10 w-1 shrink-0 rotate-12 rounded-full bg-[rgb(255,105,0)] sm:h-12" />;
}

export interface HomeLeaderboardLabels {
  heading: string;
  openBoard: string;
  trendView: string;
  scoreView: string;
  heatView: string;
}

export function HomeLeaderboardClient({
  heatEntries,
  labels,
  leaderboardLabels,
  pageSize,
  scoreEntries,
  trendingEntries,
}: {
  heatEntries: LeaderboardClientEntry[];
  labels: HomeLeaderboardLabels;
  leaderboardLabels: LeaderboardLabels;
  pageSize: number;
  scoreEntries: LeaderboardClientEntry[];
  trendingEntries: LeaderboardClientEntry[];
}) {
  const [view, setView] = useState<LeaderboardView>("trending");
  const fullBoardHref =
    view === "score"
      ? "/leaderboard?view=score"
      : view === "heat"
        ? "/leaderboard?view=heat"
        : "/leaderboard";

  return (
    <section className="mt-16 w-full max-w-2xl">
      <div className="mb-4 flex flex-col items-start gap-3">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black leading-tight text-zinc-100">
            {labels.heading}
          </h2>
          <Link
            href={fullBoardHref}
            className="shrink-0 self-end text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline sm:self-auto"
          >
            {labels.openBoard}
          </Link>
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6">
          <button
            type="button"
            onClick={() => setView("trending")}
            className={`shrink-0 text-xl font-black leading-tight ${
              view === "trending" ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-200"
            }`}
            aria-pressed={view === "trending"}
          >
            {labels.trendView}
          </button>
          <TabDivider />
          <button
            type="button"
            onClick={() => setView("score")}
            className={`shrink-0 text-lg font-black leading-tight sm:text-xl ${
              view === "score" ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-200"
            }`}
            aria-pressed={view === "score"}
          >
            {labels.scoreView}
          </button>
          <TabDivider />
          <button
            type="button"
            onClick={() => setView("heat")}
            className={`shrink-0 text-lg font-black leading-tight sm:text-xl ${
              view === "heat" ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-200"
            }`}
            aria-pressed={view === "heat"}
          >
            {labels.heatView}
          </button>
        </div>
      </div>
      <LeaderboardClient
        key={view}
        initialView={view}
        labels={leaderboardLabels}
        pageSize={pageSize}
        trendingEntries={trendingEntries}
        scoreEntries={scoreEntries}
        heatEntries={heatEntries}
      />
    </section>
  );
}
