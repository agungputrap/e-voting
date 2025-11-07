import ImageWithFallback from "@/app/_components/image-with-fallback";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  ChevronRight,
  ChevronsUp,
  ChevronUp,
  CircleDollarSign,
  CircleUserRound,
  Clock3,
  ClockAlert,
  Flame,
  Sparkles,
  TimerIcon,
  Trophy,
  Users,
  Wifi,
} from "lucide-react";

import { prisma } from "@/app/lib/prisma";

type EventStatus = "live" | "upcoming" | "completed";

async function getEvents() {
  return prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      candidates: true,
      votes: true,
    },
  });
}

type EventWithRelations = Awaited<ReturnType<typeof getEvents>>[number];

type EventCardData = {
  id: number;
  title: string;
  description: string;
  status: EventStatus;
  countdownLabel: string;
  countdownValue: string;
  totalVotes: number;
  candidatesCount: number;
  imageUrl: string | null;
  winner: string | null;
  isOwner: boolean;
};

function formatDuration(target: Date, from: Date): string {
  const diffMs = target.getTime() - from.getTime();
  if (diffMs <= 0) {
    return "0m";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes && parts.length < 2) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(" ") : "0m";
}

function formatCompletedDate(date: Date, now: Date) {
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (totalHours < 24) {
    const hours = Math.max(1, totalHours);
    return `${hours}h ago`;
  }
  const days = Math.floor(totalHours / 24);
  return `${days}d ago`;
}

function isLikelyImageUrl(value: string) {
  return /^(https?:\/\/|data:|\/)/i.test(value);
}

function mapEventToCard(event: EventWithRelations, now: Date): EventCardData {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  const hasStarted = startTime <= now;
  const hasEnded = endTime <= now;

  let status: EventStatus;
  if (hasEnded || event.isCompleted) {
    status = "completed";
  } else if (!hasStarted) {
    status = "upcoming";
  } else {
    status = "live";
  }

  let countdownLabel = "Completed";
  let countdownValue = formatCompletedDate(endTime, now);
  if (status === "live") {
    countdownLabel = "Ends in";
    countdownValue = formatDuration(endTime, now);
  } else if (status === "upcoming") {
    countdownLabel = "Starts in";
    countdownValue = formatDuration(startTime, now);
  }

  const rawImage = event.imgUrl?.trim() ?? "";
  const imageUrl = rawImage && isLikelyImageUrl(rawImage) ? rawImage : null;

  return {
    id: event.id,
    title: event.name,
    description: event.description ?? "No description provided.",
    status,
    countdownLabel,
    countdownValue,
    totalVotes: Math.max(event.totalVotes, event.votes.length),
    candidatesCount: Math.max(event.candidatesCount, event.candidates.length),
    imageUrl,
    winner: event.winner,
    isOwner: event.isOwner,
  };
}

const statusStyles: Record<
  EventStatus,
  {
    label: string;
    badgeClass: string;
    panelGlow: string;
    backgroundGradient: string;
    buttonClass: string;
    icon: LucideIcon;
    fillColor?: string;
  }
> = {
  live: {
    label: "Live",
    badgeClass:
      "bg-red-500/20 !text-red-300 shadow-[0_10px_22px_rgba(253,224,71,0.3)]",
    panelGlow: "from-emerald-500/15 to-cyan-400/10",
    backgroundGradient: "from-emerald-500/25 via-emerald-400/10 to-cyan-500/10",
    buttonClass:
      "bg-gradient-to-r from-emerald-500/80 to-cyan-500/70 text-white hover:from-emerald-400/80 hover:to-cyan-400/70",
    icon: Flame,
    fillColor: "currentColor",
  },
  upcoming: {
    label: "Upcoming",
    badgeClass:
      "bg-blue-500/50 text-blue-100 shadow-[0_10px_22px_rgba(34,211,238,0.3)]",
    panelGlow: "from-cyan-500/15 to-emerald-400/10",
    backgroundGradient: "from-cyan-500/20 via-sky-500/10 to-emerald-500/10",
    buttonClass:
      "bg-gradient-to-r from-cyan-500/80 to-sky-500/70 text-white hover:from-cyan-400/80 hover:to-sky-400/70",
    icon: CalendarClock,
  },
  completed: {
    label: "Completed",
    badgeClass:
      "bg-amber-400/20 text-amber-100 shadow-[0_10px_22px_rgba(253,224,71,0.3)]",
    panelGlow: "from-amber-400/15 to-emerald-400/10",
    backgroundGradient: "from-amber-500/20 via-emerald-500/10 to-slate-700/20",
    buttonClass:
      "bg-gradient-to-r from-amber-400/80 to-emerald-500/70 text-white hover:from-amber-300/80 hover:to-emerald-400/70",
    icon: Trophy,
  },
};

function EventCard({ event }: { event: EventCardData }) {
  const status = statusStyles[event.status];
  const StatusIcon = status.icon;
  const statusBadgeAnimation =
    event.status === "live"
      ? "animate-pulse"
      : event.status === "upcoming"
      ? ""
      : "";
  const actionLabel =
    event.status === "completed"
      ? "View Results"
      : event.status === "upcoming"
      ? "See Candidates"
      : "Cast Vote";
  const showWinner = event.status === "completed" && event.winner;
  const metrics = [
    {
      key: "votes",
      label: "Votes",
      value: event.totalVotes.toLocaleString(),
      icon: ChevronsUp,
      glowClass: "text-cyan-100 drop-shadow-[0_0_14px_rgba(110,231,183,0.5)]",
      textColorClass: "text-cyan-100",
      bgColorClass: "bg-cyan-500/10",
    },
    {
      key: "cands",
      label: "Cands",
      value: event.candidatesCount,
      icon: Users,
      glowClass: "text-cyan-100 drop-shadow-[0_0_14px_rgba(165,243,252,0.45)]",
      textColorClass: "text-cyan-100",
      bgColorClass: "bg-cyan-500/10",
    },
    {
      key: "countdown",
      label: event.countdownLabel,
      value: event.countdownValue,
      icon: event.status === "live" ? ClockAlert : CalendarClock,
      glowClass:
        "text-rose-50 drop-shadow-[0_0_14px_rgba(110,231,183,0.4)] animate-pulse",
      textColorClass: "text-rose-50",
      bgColorClass:
        event.status === "live" ? "bg-rose-700/30" : "bg-rose-500/10",
    },
  ];

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br ${status.backgroundGradient} p-8 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-1.5 hover:border-white/25 hover:shadow-[0_36px_80px_rgba(15,118,110,0.32)]`}
    >
      <div
        className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${status.panelGlow} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
      ></div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.3),transparent_55%),radial-gradient(circle_at_bottom,rgba(15,118,110,0.3),transparent_65%)] opacity-60"></div>

      <div className="relative flex h-full flex-col gap-6">
        <div className="relative flex flex-col items-center gap-4 pt-4 text-center">
          <span
            className={`absolute -right-5 -top-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase shadow-[0_16px_40px_rgba(59,130,246,0.25)] transition-all duration-300 ${status.badgeClass} ${statusBadgeAnimation}`}
          >
            <StatusIcon
              className="h-4 w-4"
              fill={status.fillColor ? status.fillColor : "transparent"}
            />
            <span className="!font-bold">{status.label}</span>
          </span>
          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[28px] border border-white/25 bg-white/20 shadow-[0_20px_60px_rgba(15,118,110,0.35)] backdrop-blur-2xl transition-all duration-500 group-hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-white/10 opacity-80 mix-blend-screen"></div>
            <ImageWithFallback
              src={event.imageUrl}
              alt={`${event.title} visual`}
              className="relative h-full w-full object-cover"
              fallback={
                <Sparkles className="relative h-10 w-10 text-white drop-shadow-[0_0_18px_rgba(209,250,229,0.8)]" />
              }
            />
          </div>
          {event.isOwner && (
            <div className="flex items-center gap-2 rounded-full px-4 py-1 text-[10px] font-medium uppercase text-amber-50 shadow-[0_10px_30px_rgba(16,185,129,0.2)] backdrop-blur-xl">
              <CircleUserRound className="h-3.5 w-3.5" />
              <span className="">Your Event</span>
            </div>
          )}
          <h3 className="text-xl font-semibold text-white md:text-2xl min-h-[64px]">
            {event.title}
          </h3>
          {/* <p className="max-w-sm text-sm text-white/75">{event.description}</p> */}
        </div>

        <div className="h-px w-full bg-gradient-to-r from-white/35 via-white/10 to-transparent"></div>

        <div className="relative w-full overflow-hidden rounded-2xl">
          <div className="relative grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-y-0 sm:divide-x sm:divide-white/10">
            {metrics.map(
              ({
                key,
                label,
                value,
                icon: MetricIcon,
                glowClass,
                textColorClass,
                bgColorClass,
              }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 px-4 py-3 sm:flex-col sm:items-center sm:text-center"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-xl ${bgColorClass}`}
                  >
                    <MetricIcon className={`h-5 w-5 ${glowClass}`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    {/* <p className="text-[11px] uppercase tracking-[0.35em] text-white/70">
                    {label}
                  </p> */}
                    <p className={`text-sm font-semibold ${textColorClass}`}>
                      {key !== "countdown" ? (
                        value + " " + label
                      ) : (
                        <>
                          <span className="block text-[8px] font-medium uppercase text-white/80">
                            {label}
                          </span>{" "}
                          <span className="block text-sm font-semibold">
                            {value}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/12 px-4 py-3 shadow-[0_18px_55px_rgba(16,185,129,0.2)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase text-emerald-200 font-semibold animate-pulse">
            <CircleDollarSign className="h-4 w-4 text-emerald-200" />
            <span>claim your nft</span>
            {showWinner && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-[10px] font-semibold tracking-[0.3em] text-white">
                <Trophy className="h-3.5 w-3.5 text-amber-200 drop-shadow-[0_0_10px_rgba(253,224,71,0.45)]" />
                Winner: {event.winner}
              </span>
            )}
          </div>
          <div className="ml-auto">
            <Link
              href={`/events/${event.id}`}
              className="inline-flex items-center gap-1 rounded-full px-5 py-2 text-[11px] font-semibold uppercase transition-all duration-300 bg-gradient-to-r from-black/50 to-emerald-950 text-white hover:bg-gradient-to-r hover:from-black/80 hover:to-emerald-900/80 cursor-pointer group"
            >
              {actionLabel}
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const now = new Date();
  const events = await getEvents();
  const cards = events
    .map((event) => mapEventToCard(event, now))
    .sort((a, b) => {
      const rank: Record<EventStatus, number> = {
        live: 0,
        upcoming: 1,
        completed: 2,
      };
      const rankDiff = rank[a.status] - rank[b.status];
      if (rankDiff !== 0) {
        return rankDiff;
      }
      return b.id - a.id;
    });

  const yourEvents = cards.filter((event) => event.isOwner);
  const discoverEvents = cards.filter((event) => !event.isOwner);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-emerald-950 to-black pt-20">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      ></div>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 h-96 w-96 animate-pulse-slow rounded-full bg-emerald-500/20 blur-3xl"></div>
        <div
          className="absolute bottom-20 right-10 h-96 w-96 animate-pulse-slow rounded-full bg-cyan-500/20 blur-3xl"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 animate-pulse-slow rounded-full bg-emerald-500/10 blur-3xl"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        <section className="py-16 text-center">
          <h1 className="animate-gradient bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-5xl font-bold text-transparent md:text-6xl">
            Absolute Transparency
          </h1>
          <p className="mt-2 text-2xl text-gray-300 md:text-3xl">
            Every Vote Verified On-Chain.
          </p>
          <div className="mb-8 mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-mono text-sm text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Connected to Lisk Sepolia Testnet
          </div>

          <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/create-event"
              className="group relative min-w-[220px] cursor-pointer overflow-hidden rounded-full border border-emerald-400/50 bg-gradient-to-r from-emerald-800/70 via-emerald-600/60 to-cyan-500/60 px-9 py-4 text-lg font-semibold text-white shadow-[0_25px_55px_rgba(6,24,16,0.55)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/70 hover:shadow-[0_35px_70px_rgba(6,24,16,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            >
              <span className="relative z-10">Create Voting</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
            </Link>
            <Link
              href="#your-events"
              className="group relative min-w-[220px] cursor-pointer overflow-hidden rounded-full border border-white/15 bg-white/5 px-9 py-4 text-lg font-semibold text-white/90 shadow-[0_20px_45px_rgba(2,6,4,0.55)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40"
            >
              <span className="relative z-10 text-white">My Vote</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
            </Link>
          </div>
        </section>

        <section id="your-events" className="mb-16 scroll-mt-24">
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-3xl font-bold text-white">Your Event</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {yourEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {yourEvents.length === 0 && (
            <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-[#0a1511]/70 p-12 text-center shadow-[18px_18px_44px_rgba(3,7,6,0.75),-18px_-18px_44px_rgba(18,45,34,0.2)]">
              <p className="mb-4 text-lg text-gray-400">
                You haven&apos;t created any events yet
              </p>
              <Link
                href="/create-event"
                className="inline-flex rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-[12px_12px_32px_rgba(0,0,0,0.35)] transition-all duration-300 hover:shadow-[16px_16px_40px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
              >
                Create Your First Event
              </Link>
            </div>
          )}
        </section>

        <section className="mb-16">
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-3xl font-bold text-white">Discover</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {discoverEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {discoverEvents.length === 0 && (
            <div className="mt-8 rounded-3xl border border-cyan-500/20 bg-[#0a1511]/70 p-12 text-center shadow-[18px_18px_44px_rgba(3,7,6,0.75),-18px_-18px_44px_rgba(18,45,34,0.2)]">
              <p className="text-lg text-gray-400">
                No public events available yet. Check back soon!
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
