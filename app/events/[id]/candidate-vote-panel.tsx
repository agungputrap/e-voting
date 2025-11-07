"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWallet } from "@/app/lib/wallet-provider";

export type CandidateEntry = {
  id: number;
  name: string;
  avatar: string | null;
  votes: number;
};

type CandidateVotePanelProps = {
  eventId: number;
  eventTitle: string;
  initialTotalVotes: number;
  initialCandidates: CandidateEntry[];
  isVotingOpen: boolean;
};

export function CandidateVotePanel({
  eventId,
  eventTitle,
  initialTotalVotes,
  initialCandidates,
  isVotingOpen,
}: CandidateVotePanelProps) {
  const { toast } = useToast();
  const { authToken, isAuthenticated } = useWallet();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [totalVotes, setTotalVotes] = useState(initialTotalVotes);
  const [pendingCandidate, setPendingCandidate] = useState<number | null>(null);

  const orderedCandidates = useMemo(
    () => [...candidates].sort((a, b) => b.votes - a.votes),
    [candidates]
  );

  const handleVote = async (candidateId: number) => {
    if (!isVotingOpen) {
      toast({
        title: "Voting closed",
        description: "This event is not accepting new votes right now.",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated || !authToken) {
      toast({
        title: "Connect wallet",
        description: "Link your wallet from the top bar to submit a vote.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPendingCandidate(candidateId);
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          eventId,
          candidateId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit vote");
      }

      const targetCandidate = candidates.find(
        (entry) => entry.id === candidateId
      );

      setCandidates((prev) =>
        prev.map((candidate) =>
          candidate.id === candidateId
            ? { ...candidate, votes: candidate.votes + 1 }
            : candidate
        )
      );
      setTotalVotes((prev) => prev + 1);

      toast({
        title: "Vote submitted",
        description: `Recorded for ${
          targetCandidate?.name ?? "candidate"
        } on ${eventTitle}.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit vote";
      toast({
        title: "Unable to vote",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPendingCandidate(null);
    }
  };

  return (
    <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-black/60 via-emerald-950/40 to-black/70 p-6 shadow-[0_35px_120px_rgba(0,0,0,0.45)] backdrop-blur-3xl">
      <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Candidates
          </p>
          <h2 className="text-2xl font-semibold text-white md:text-3xl">
            Cast Your Vote
          </h2>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1 text-sm text-emerald-100">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
            </span>
            Live counter · {totalVotes.toLocaleString()} votes
          </div>
          {!isVotingOpen && (
            <div className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
              Voting Locked
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {orderedCandidates.map((candidate, index) => {
          const voteShare =
            totalVotes === 0
              ? 0
              : Math.round((candidate.votes / totalVotes) * 1000) / 10;
          const placement = index + 1;

          return (
            <div
              key={candidate.id}
              className="group relative flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] transition hover:border-emerald-300/40"
            >
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-black/50">
                  {candidate.avatar ? (
                    <Image
                      src={candidate.avatar}
                      alt={candidate.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 text-xl font-semibold text-white/70">
                      {candidate.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    #{placement.toString().padStart(2, "0")}
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {candidate.name}
                  </p>
                  <p className="text-xs text-white/60">
                    {voteShare}% of total votes
                  </p>
                </div>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-1 text-sm text-white/80">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  {candidate.votes.toLocaleString()} votes
                </div>
                <button
                  type="button"
                  disabled={pendingCandidate === candidate.id || !isVotingOpen}
                  onClick={() => handleVote(candidate.id)}
                  className="relative inline-flex min-w-[110px] items-center justify-center overflow-hidden rounded-full border border-emerald-500/40 bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_15px_40px_rgba(16,185,129,0.45)] transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingCandidate === candidate.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Vote"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
