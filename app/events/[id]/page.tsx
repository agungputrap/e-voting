import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  CalendarClock,
  CalendarRange,
  Clock3,
  Dot,
  Flame,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import ImageWithFallback from "@/app/_components/image-with-fallback";
import { prisma } from "@/app/lib/prisma";
import {
  CandidateEntry,
  CandidateVotePanel,
} from "./candidate-vote-panel";
import { ActiveWalletBadge } from "./active-wallet-badge";

type PageParams = {
  params: Promise<{ id: string }>;
};

type EventStatus = "live" | "upcoming" | "completed";

const statusStyles: Record<
  EventStatus,
  {
    label: string;
    accent: string;
    badgeClass: string;
    pillClass: string;
    icon: typeof Flame;
  }
> = {
  live: {
    label: "Live Now",
    accent: "text-emerald-300",
    badgeClass:
      "from-emerald-500/20 via-emerald-400/15 to-cyan-500/15 border-emerald-400/40 text-emerald-100",
    pillClass: "bg-emerald-500/20 text-emerald-100",
    icon: Flame,
  },
  upcoming: {
    label: "Upcoming",
    accent: "text-cyan-200",
    badgeClass:
      "from-cyan-500/15 via-sky-500/15 to-emerald-500/10 border-cyan-400/30 text-cyan-100",
    pillClass: "bg-cyan-500/20 text-cyan-100",
    icon: CalendarClock,
  },
  completed: {
    label: "Completed",
    accent: "text-amber-200",
    badgeClass:
      "from-amber-500/15 via-emerald-500/15 to-slate-700/20 border-amber-400/30 text-amber-100",
    pillClass: "bg-amber-500/20 text-amber-100",
    icon: Trophy,
  },
};

function formatDuration(target: Date, from: Date): string {
  const diffMs = target.getTime() - from.getTime();
  if (diffMs <= 0) return "0m";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes && parts.length < 2) parts.push(`${minutes}m`);
  return parts.join(" ");
}

function formatUtcDate(date: Date) {
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

async function getEvent(id: number) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      candidates: true,
      votes: true,
    },
  });
}

type EventWithRelations = NonNullable<Awaited<ReturnType<typeof getEvent>>>;

function mapEventStatus(event: EventWithRelations) {
  const now = new Date();
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  let status: EventStatus = "live";
  if (end <= now || event.isCompleted) {
    status = "completed";
  } else if (start > now) {
    status = "upcoming";
  }

  const countdownLabel =
    status === "live"
      ? "Ends in"
      : status === "upcoming"
      ? "Starts in"
      : "Ended";
  const countdownValue =
    status === "completed"
      ? formatUtcDate(end)
      : formatDuration(status === "live" ? end : start, now);

  return {
    status,
    countdownLabel,
    countdownValue,
  };
}

export async function generateMetadata(
  props: PageParams
): Promise<Metadata> {
  const { id } = await props.params;
  const eventId = Number(id);
  if (Number.isNaN(eventId)) {
    return {
      title: "Event not found | Votie.io",
    };
  }
  const event = await getEvent(eventId);
  if (!event) {
    return {
      title: "Event not found | Votie.io",
    };
  }
  return {
    title: `${event.name} | Votie.io`,
    description: event.description ?? "On-chain voting event",
  };
}

export default async function EventDetailPage(props: PageParams) {
  const { id } = await props.params;
  const eventId = Number(id);
  if (!Number.isFinite(eventId)) {
    notFound();
  }

  const event = await getEvent(eventId);
  if (!event) {
    notFound();
  }

  const { status, countdownLabel, countdownValue } = mapEventStatus(event);
  const statusStyle = statusStyles[status];
  const StatusIcon = statusStyle.icon;
  const totalVotes = Math.max(event.totalVotes, event.votes.length);
  const candidateVotes = event.votes.reduce<Record<number, number>>(
    (acc, vote) => {
      acc[vote.candidateId] = (acc[vote.candidateId] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const candidates: CandidateEntry[] = event.candidates.map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    avatar: candidate.avatar,
    votes: candidateVotes[candidate.id] ?? 0,
  }));
  const isVotingOpen = status === "live" && event.isActive;
  const formattedStart = formatUtcDate(new Date(event.startTime));
  const formattedEnd = formatUtcDate(new Date(event.endTime));
  const overviewCards = [
    {
      id: "countdown",
      label: countdownLabel,
      value: countdownValue,
      helper: status === "completed" ? "Event closed" : "Live countdown",
      accentClass: statusStyle.accent,
      icon: <StatusIcon className="h-5 w-5 text-emerald-200" />,
    },
    {
      id: "candidates",
      label: "Candidates",
      value: Math.max(event.candidatesCount, candidates.length).toString(),
      helper: "Registered contenders",
      icon: <Users className="h-5 w-5 text-emerald-200" />,
    },
    {
      id: "start",
      label: "Starts at",
      value: formattedStart,
      helper: "UTC",
      icon: <CalendarRange className="h-5 w-5 text-emerald-200" />,
    },
    {
      id: "end",
      label: "Ends at",
      value: formattedEnd,
      helper: "UTC",
      icon: <Clock3 className="h-5 w-5 text-emerald-200" />,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-emerald-950 to-black pt-24">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-10 left-10 h-72 w-72 animate-pulse-slow rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-72 w-72 animate-pulse-slow rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-[520px] w-[520px] -translate-x-1/2 animate-pulse-slow rounded-full bg-emerald-500/10 blur-3xl" />
      </div>
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-emerald-300/40 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
            Back to events
          </Link>
          <div className="ml-auto">
            <ActiveWalletBadge />
          </div>
        </div>

        <div className="mb-10 flex flex-wrap items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white/80">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            Votie.io
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/40 px-6 py-4 text-center text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <p className="text-xs uppercase tracking-[0.45em] text-white/50">
              Total Vote
            </p>
            <p className="text-4xl font-bold text-white">
              {totalVotes.toLocaleString()}
            </p>
            <p className="text-xs text-white/60">On-chain verified</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[36px] border border-white/10 bg-gradient-to-br from-white/5 via-transparent to-white/5 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-3xl">
            <div className="space-y-6">
              <div className="relative min-h-[280px] w-full overflow-hidden rounded-[32px] border border-white/10 bg-black/50 shadow-[0_25px_80px_rgba(0,0,0,0.5)]">
                <ImageWithFallback
                  src={event.imgUrl}
                  alt={event.name}
                  className="h-full w-full object-cover"
                  fallback={
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/60">
                      <Sparkles className="h-10 w-10 text-emerald-200" />
                      No cover uploaded
                    </div>
                  }
                />
                <div className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/70">
                  #{event.blockAddress?.slice(0, 6) ?? "on-chain"}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/40 p-6 text-white/80 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border bg-gradient-to-r px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] ${statusStyle.badgeClass}`}
                  >
                    <StatusIcon className="h-4 w-4" />
                    {statusStyle.label}
                  </div>
                  {event.winner && status === "completed" && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-500/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-100">
                      <Trophy className="h-4 w-4" />
                      Winner · {event.winner}
                    </div>
                  )}
                </div>
                <div className="mt-5 space-y-2">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                    Event
                  </p>
                  <h1 className="text-3xl font-semibold text-white md:text-4xl">
                    {event.name}
                  </h1>
                  <p className="text-sm text-white/65">
                    {event.description ?? "No description provided."}
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {overviewCards.map((card) => (
                    <div
                      key={card.id}
                      className="rounded-2xl border border-white/10 bg-black/50 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                    >
                      <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">
                        {card.label}
                      </p>
                      <div className="mt-2 flex items-baseline gap-2 text-white">
                        {card.icon ? (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                            {card.icon}
                          </span>
                        ) : null}
                        <span
                          className={`text-2xl font-semibold ${card.accentClass ?? "text-white"}`}
                        >
                          {card.value}
                        </span>
                      </div>
                      {card.helper ? (
                        <p className="mt-1 text-xs text-white/55">{card.helper}</p>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[11px] uppercase tracking-[0.3em] text-white/70">
                  <Dot className="h-6 w-6 text-emerald-400" />
                  End at {formattedEnd} UTC
                </div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-4 rounded-[32px] border border-white/10 bg-black/30 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">
              Snapshot
            </p>
            <h3 className="text-2xl font-semibold text-white">
              {event.name}
            </h3>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white/80">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                Status
              </p>
              <div
                className={`mt-2 inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-semibold uppercase tracking-[0.2em] ${statusStyle.pillClass}`}
              >
                <StatusIcon className="h-4 w-4" />
                {statusStyle.label}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white/80">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                Countdown
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {countdownLabel === "Ended"
                  ? "Event Closed"
                  : countdownValue}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white/80">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                Total Votes
              </p>
              <p className="mt-2 text-4xl font-bold text-white">
                {totalVotes.toLocaleString()}
              </p>
              <p className="text-xs text-white/60">Updated live</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white/80">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                Blockchain Reference
              </p>
              <p className="mt-2 font-mono text-sm text-white">
                {event.blockAddress
                  ? `${event.blockAddress.slice(
                      0,
                      10
                    )}...${event.blockAddress.slice(-6)}`
                  : "Pending"}
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-10">
          <CandidateVotePanel
            eventId={eventId}
            eventTitle={event.name}
            initialTotalVotes={totalVotes}
            initialCandidates={candidates}
            isVotingOpen={isVotingOpen}
          />
        </div>
      </main>
    </div>
  );
}
