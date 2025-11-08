import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  CalendarClock,
  Flame,
  Sparkles,
  Trophy,
} from "lucide-react";
import ImageWithFallback from "@/app/_components/image-with-fallback";
import { prisma } from "@/app/lib/prisma";
import {
  CandidateEntry,
  CandidateVotePanel,
} from "./candidate-vote-panel";
import {
  fetchChainCandidates,
  fetchChainEvent,
  getVotePhase,
  type ChainCandidate,
  type ChainVotingEvent,
} from "@/lib/contracts/voting-system";

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

function mapEventStatus(
  event: EventWithRelations,
  chainEvent?: ChainVotingEvent | null
) {
  const now = new Date();
  const start = chainEvent
    ? new Date(chainEvent.startTime * 1000)
    : new Date(event.startTime);
  const commitEnd = chainEvent
    ? new Date(chainEvent.endTime * 1000)
    : new Date(event.endTime);
  const revealDeadline = chainEvent
    ? new Date(chainEvent.revealDeadline * 1000)
    : commitEnd;

  const phase = chainEvent ? getVotePhase(chainEvent) : null;

  let status: EventStatus = "live";
  if (phase === "NOT_STARTED") {
    status = "upcoming";
  } else if (phase === "ENDED") {
    status = "completed";
  } else if (event.isCompleted) {
    status = "completed";
  }

  let countdownLabel = "Ends in";
  let countdownTarget = commitEnd;

  if (status === "upcoming") {
    countdownLabel = "Starts in";
    countdownTarget = start;
  } else if (phase === "REVEAL_PHASE") {
    countdownLabel = "Reveal ends in";
    countdownTarget = revealDeadline;
  } else if (status === "completed") {
    countdownLabel = "Ended";
    countdownTarget = revealDeadline;
  }

  const countdownValue =
    status === "completed"
      ? formatUtcDate(countdownTarget)
      : formatDuration(countdownTarget, now);

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

  const chainEventId =
    event.chainEventId ?? (event.blockAddress ? event.id : null);
  let chainEvent: ChainVotingEvent | null = null;
  let chainCandidates: ChainCandidate[] = [];

  if (chainEventId) {
    [chainEvent, chainCandidates] = await Promise.all([
      fetchChainEvent(chainEventId),
      fetchChainCandidates(chainEventId),
    ]);
  }

  const { status, countdownLabel, countdownValue } = mapEventStatus(
    event,
    chainEvent
  );
  const statusStyle = statusStyles[status];
  const StatusIcon = statusStyle.icon;

  const fallbackVotes = event.votes.reduce<Record<number, number>>(
    (acc, vote) => {
      acc[vote.candidateId] = (acc[vote.candidateId] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const onChainVotes = new Map(
    (chainCandidates ?? []).map((candidate) => [
      candidate.id,
      Number(candidate.voteCount),
    ])
  );

  const candidates: CandidateEntry[] = event.candidates.map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    avatar: candidate.avatar,
    votes: onChainVotes.get(candidate.id) ?? fallbackVotes[candidate.id] ?? 0,
  }));

  const totalVotes = chainEvent?.totalVotes
    ? Number(chainEvent.totalVotes)
    : Math.max(event.totalVotes, event.votes.length);

  const now = new Date();
  const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
  const eventEnd = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
  const fallbackCommitPhase =
    event.isActive &&
    now >= eventStart &&
    now <= eventEnd;

  const isVotingOpen = chainEvent
    ? chainEvent.isActive && getVotePhase(chainEvent) === "COMMIT_PHASE"
    : fallbackCommitPhase;
  // Format dates for display
  const formattedStart = formatUtcDate(
    chainEvent ? new Date(chainEvent.startTime * 1000) : new Date(event.startTime)
  );
  const formattedEnd = formatUtcDate(
    chainEvent ? new Date(chainEvent.endTime * 1000) : new Date(event.endTime)
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-black via-emerald-950 to-black pt-24">
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
          {/* <div className="ml-auto">
            <ActiveWalletBadge />
          </div> */}
        </div>

        {/* <div className="mb-10 flex flex-wrap items-center gap-4">
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
        </div> */}

        <section className="rounded-[36px] border border-white/10 bg-linear-to-br from-white/5 via-transparent to-white/5 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-3xl">
            <div className="">
              <div className="space-y-6">
                <div className="relative min-h-[320px] w-full overflow-hidden rounded-[32px] border border-white/10 bg-black/50 shadow-[0_25px_80px_rgba(0,0,0,0.5)]">
                  <ImageWithFallback
                    src={event.imgUrl}
                    alt={event.name}
                    className="h-full w-full object-cover"
                  fallback={
                    <div className="flex min-h-[320px] w-full flex-col items-center justify-center gap-3 rounded-[32px] bg-linear-to-br from-emerald-500/5 via-transparent to-cyan-500/10 px-6 text-center text-white/70">
                      <Sparkles className="h-10 w-10 text-emerald-300" />
                      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/60">
                        No cover uploaded
                      </p>
                    </div>
                  }
                />
                <div className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/70">
                  #{event.blockAddress?.slice(0, 6) ?? "on-chain"}
                </div>
              </div>
              {/* Event info section - simplified and clean */}
              <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-6">
                {/* Status badge and winner */}
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider ${statusStyle.pillClass}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusStyle.label}
                  </div>
                  {event.winner && status === "completed" && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
                      <Trophy className="h-3.5 w-3.5" />
                      {event.winner}
                    </div>
                  )}
                </div>

                {/* Event title and description */}
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold text-white md:text-4xl">
                    {event.name}
                  </h1>
                  <p className="text-sm text-white/60">
                    {event.description ?? "No description provided."}
                  </p>
                </div>

                {/* Key metrics grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs text-white/50">Total Votes</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {totalVotes.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs text-white/50">Candidates</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {(
                        chainEvent?.candidateIds?.length ??
                        Math.max(event.candidatesCount, candidates.length)
                      ).toString()}
                    </p>
                  </div>
                </div>

                {/* Timing info */}
                <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Start</span>
                    <span className="font-mono text-white/80">{formattedStart}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">End</span>
                    <span className="font-mono text-white/80">{formattedEnd}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm">
                    <span className="text-white/50">{countdownLabel}</span>
                    <span className={`font-semibold ${statusStyle.accent}`}>
                      {countdownLabel === "Ended" ? "Event Closed" : countdownValue}
                    </span>
                  </div>
                </div>

                {/* Blockchain reference */}
                {event.blockAddress && (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs text-white/50">Blockchain Address</p>
                    <p className="mt-1 font-mono text-sm text-white/80">
                      {event.blockAddress.slice(0, 10)}...{event.blockAddress.slice(-6)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10">
          <CandidateVotePanel
            eventId={eventId}
            chainEventId={chainEventId ?? undefined}
            eventTitle={event.name}
            initialTotalVotes={totalVotes}
            initialCandidates={candidates}
            isVotingOpen={isVotingOpen}
            chainEvent={chainEvent}
          />
        </div>
      </main>
    </div>
  );
}
