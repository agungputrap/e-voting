"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { formatEther } from "ethers";

import { useToast } from "@/components/ui/use-toast";
import { useWallet } from "@/app/lib/wallet-provider";
import {
  type ChainVotingEvent,
  type VotePhase,
  commitVoteOnChain,
  fetchChainCandidates,
  fetchChainEvent,
  fetchCommitState,
  fetchVoteCost,
  generateSecret,
  getVotePhase,
  revealVoteOnChain,
} from "@/lib/contracts/voting-system";
import { getVotingTokenBalance } from "@/lib/contracts/voting-token";
import { hasBadgeForEvent } from "@/lib/contracts/voter-badge";

export type CandidateEntry = {
  id: number;
  name: string;
  avatar: string | null;
  votes: number;
};

type CandidateVotePanelProps = {
  eventId: number;
  chainEventId?: number;
  eventTitle: string;
  initialTotalVotes: number;
  initialCandidates: CandidateEntry[];
  isVotingOpen: boolean;
  chainEvent: ChainVotingEvent | null;
};

const SECRET_STORAGE_PREFIX = "vote_secret_";

function getSecretStorageKey(eventId: number) {
  return `${SECRET_STORAGE_PREFIX}${eventId}`;
}

const phaseMeta: Record<
  VotePhase,
  { label: string; helper: string; badgeClass: string }
> = {
  NOT_STARTED: {
    label: "Not Started",
    helper: "Voting Event not started",
    badgeClass: "bg-blue-500/10 text-blue-200 border border-blue-500/40",
  },
  COMMIT_PHASE: {
    label: "Voting Phase",
    helper: "Vote for your favorite candidate",
    badgeClass: "bg-emerald-500/10 text-emerald-200 border border-emerald-500/40",
  },
  REVEAL_PHASE: {
    label: "Reveal Phase",
    helper: "Reveal your vote",
    badgeClass: "bg-amber-500/10 text-amber-200 border border-amber-500/40",
  },
  ENDED: {
    label: "Ended",
    helper: "Voting Event ended",
    badgeClass: "bg-slate-600/30 text-slate-200 border border-white/10",
  },
};

export function CandidateVotePanel({
  eventId,
  chainEventId,
  eventTitle,
  initialTotalVotes,
  initialCandidates,
  isVotingOpen,
  chainEvent,
}: CandidateVotePanelProps) {
  const { toast } = useToast();
  const router = useRouter();
  const {
    account,
    walletAddress,
    isAuthenticated,
    login,
    authToken,
  } = useWallet();

  const [candidates, setCandidates] = useState(initialCandidates);
  const [totalVotes, setTotalVotes] = useState(initialTotalVotes);
  const [pendingCandidate, setPendingCandidate] = useState<number | null>(null);
  const [phase, setPhase] = useState<VotePhase>(
    chainEvent ? getVotePhase(chainEvent) : "COMMIT_PHASE"
  );
  const [voteCost, setVoteCost] = useState<bigint | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [hasCommitted, setHasCommitted] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [badgeEarned, setBadgeEarned] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onChainEventId = chainEventId ?? eventId;
  const secretStorageKey = getSecretStorageKey(onChainEventId);

  // Update local state when server props change
  // This happens after router.refresh() fetches new data
  useEffect(() => {
    setCandidates(initialCandidates);
  }, [initialCandidates]);

  useEffect(() => {
    setTotalVotes(initialTotalVotes);
  }, [initialTotalVotes]);

  // Manual refresh function to fetch latest blockchain data
  const refreshVoteCounts = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    
    try {
      // Fetch latest data from blockchain
      const [freshChainEvent, freshChainCandidates] = await Promise.all([
        chainEvent ? fetchChainEvent(onChainEventId).catch(() => null) : Promise.resolve(null),
        chainEvent ? fetchChainCandidates(onChainEventId).catch(() => []) : Promise.resolve([]),
      ]);

      console.log("Refreshed blockchain data:", {
        totalVotes: freshChainEvent?.totalVotes,
        candidates: freshChainCandidates,
      });

      // Update vote counts from blockchain
      if (freshChainCandidates && freshChainCandidates.length > 0) {
        setCandidates((prevCandidates) => 
          prevCandidates.map((candidate) => {
            const chainCandidate = freshChainCandidates.find(
              (cc) => cc.id === candidate.id
            );
            return {
              ...candidate,
              votes: chainCandidate ? Number(chainCandidate.voteCount) : candidate.votes,
            };
          })
        );
      }

      // Update total votes from blockchain
      if (freshChainEvent?.totalVotes !== undefined) {
        setTotalVotes(Number(freshChainEvent.totalVotes));
      }
    } catch (error) {
      console.error("Failed to refresh vote counts:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!chainEvent) return;
    setPhase(getVotePhase(chainEvent));
    const interval = setInterval(() => {
      setPhase(getVotePhase(chainEvent));
    }, 15000);
    return () => clearInterval(interval);
  }, [chainEvent]);

  useEffect(() => {
    let mounted = true;
    fetchVoteCost()
      .then((cost) => {
        if (mounted) {
          setVoteCost(cost);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch vote cost", error);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedSecret = localStorage.getItem(secretStorageKey);
    if (storedSecret) {
      setSecretInput(storedSecret);
    }
  }, [secretStorageKey]);

  useEffect(() => {
    if (!walletAddress) {
      setTokenBalance(null);
      setHasCommitted(false);
      setHasRevealed(false);
      setBadgeEarned(false);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const [balance, commitState, badge] = await Promise.all([
          getVotingTokenBalance(walletAddress),
          fetchCommitState(walletAddress, onChainEventId),
          hasBadgeForEvent(walletAddress, onChainEventId),
        ]);

        if (!isMounted) return;
        setTokenBalance(balance);
        setHasCommitted(commitState.hasCommitted);
        setHasRevealed(commitState.hasRevealed);
        setBadgeEarned(badge);
      } catch (error) {
        console.error("Failed to hydrate wallet state", error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [walletAddress, onChainEventId, refreshKey]);

  const orderedCandidates = useMemo(
    () => [...candidates].sort((a, b) => b.votes - a.votes),
    [candidates]
  );

  const formattedVoteCost = voteCost ? `${formatEther(voteCost)} VOTE` : "1 VOTE";
  const formattedBalance = tokenBalance
    ? `${formatEther(tokenBalance)} VOTE`
    : "0 VOTE";

  const canCommit =
    phase === "COMMIT_PHASE" &&
    (chainEvent ? chainEvent.isActive : isVotingOpen);
  const canReveal =
    phase === "REVEAL_PHASE" && hasCommitted && !hasRevealed && Boolean(chainEvent);

  const actionLabel = (() => {
    if (chainEvent && !chainEvent.isActive && phase === "COMMIT_PHASE") {
      return "Locked";
    }
    if (phase === "COMMIT_PHASE") {
      return hasCommitted ? "Voted" : "Vote";
    }
    if (phase === "REVEAL_PHASE") {
      if (!hasCommitted) return "Need Vote";
      if (hasRevealed) return "Revealed";
      return "Reveal Vote";
    }
    return "Closed";
  })();

  const ensureWalletReady = async () => {
    if (!account || !walletAddress) {
      toast({
        title: "Connect wallet",
        description: "Please connect your wallet before interacting on-chain.",
        variant: "destructive",
      });
      if (!isAuthenticated) {
        await login().catch(() => undefined);
      }
      throw new Error("Wallet not connected");
    }
  };

  const persistSecret = (secret: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(secretStorageKey, secret);
    setSecretInput(secret);
  };

  const clearSecret = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(secretStorageKey);
    setSecretInput("");
  };

  const handleCommit = async (candidateId: number) => {
    if (!canCommit) {
      toast({
        title: "Commit phase locked",
        description: "You can only commit during the commit phase while the event is active.",
        variant: "destructive",
      });
      return;
    }

    try {
      await ensureWalletReady();
      if (!account) return;

      setPendingCandidate(candidateId);

      const secret = generateSecret();
      const { txHash } = await commitVoteOnChain({
        account,
        eventId: onChainEventId,
        candidateId,
        secret,
      });

      // Save vote to database after successful blockchain commit
      try {
        const response = await fetch('/api/votes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
          body: JSON.stringify({
            eventId: eventId,
            candidateId: candidateId,
            blockAddress: txHash || `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log('Vote committed and saved to database successfully:', data.data);
        } else {
          console.error('Failed to save vote to database:', data.error);
        }
      } catch (dbError) {
        console.error('Database save error after commit:', dbError);
        // Don't throw error here to avoid breaking the flow - blockchain commit is already done
      }

      persistSecret(secret);
      setHasCommitted(true);
      setRefreshKey((key) => key + 1);

      toast({
        title: "Vote committed",
        description:
          `${eventTitle}: secret stored locally. Keep it safe to reveal your vote later.` +
          (txHash ? ` Tx: ${txHash.slice(0, 10)}…` : ""),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to commit vote";
      toast({
        title: "Commit failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPendingCandidate(null);
    }
  };

  const handleReveal = async (candidateId: number) => {
    if (!canReveal) {
      toast({
        title: "Reveal unavailable",
        description: hasCommitted
          ? "Reveal phase is not active right now."
          : "You need to commit before you can reveal.",
        variant: "destructive",
      });
      return;
    }

    if (!secretInput) {
      toast({
        title: "Secret required",
        description:
          "Provide the secret used during commit or restore it from your backup.",
        variant: "destructive",
      });
      return;
    }

    try {
      await ensureWalletReady();
      if (!account) return;

      setPendingCandidate(candidateId);

      const { txHash } = await revealVoteOnChain({
        account,
        eventId: onChainEventId,
        candidateId,
        secret: secretInput,
      });

      clearSecret();
      setHasRevealed(true);
      setRefreshKey((key) => key + 1);

      // Optimistically update UI immediately for better user experience
      setCandidates((prev) =>
        prev.map((candidate) =>
          candidate.id === candidateId
            ? { ...candidate, votes: candidate.votes + 1 }
            : candidate
        )
      );
      setTotalVotes((prev) => prev + 1);

      toast({
        title: "Vote revealed",
        description:
          `${eventTitle}: ` +
          (txHash ? `tx ${txHash.slice(0, 10)}… confirmed. ` : "") +
          "Thanks for finalizing your vote!",
      });

      // Refresh vote counts immediately since transaction is already confirmed
      // The revealVoteOnChain function waits for blockchain confirmation
      setTimeout(() => {
        refreshVoteCounts();
        router.refresh();
      }, 500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reveal vote";
      toast({
        title: "Reveal failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPendingCandidate(null);
    }
  };

  const copySecret = async () => {
    if (!secretInput || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(secretInput);
    toast({
      title: "Secret copied",
      description: "Store it securely. You'll need it to reveal your vote.",
    });
  };

  const downloadSecret = () => {
    if (!secretInput || typeof window === "undefined") return;
    const blob = new Blob(
      [`Event ${onChainEventId} vote secret: ${secretInput}`],
      {
        type: "text/plain",
      }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vote-secret-event-${onChainEventId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-[32px] border border-white/10 bg-linear-to-br from-black/60 via-emerald-950/40 to-black/70 p-6 shadow-[0_35px_120px_rgba(0,0,0,0.45)] backdrop-blur-3xl">
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
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-1 text-sm font-medium ${phaseMeta[phase].badgeClass}`}
          >
            {phase === "COMMIT_PHASE" ? (
              <Unlock className="h-4 w-4" />
            ) : phase === "REVEAL_PHASE" ? (
              <KeyRound className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {phaseMeta[phase].label}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1 text-sm text-emerald-100">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
            </span>
            Live counter · {totalVotes.toLocaleString()} votes
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/80 md:grid-cols-3">
        <div>
          <p className="font-semibold text-white/40">
            Token balance
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {formattedBalance}
          </p>
        </div>
        <div>
          <p className="font-semibold text-white/40">
            Cost per vote
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {formattedVoteCost}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BadgeCheck className={`h-5 w-5 ${badgeEarned ? "text-emerald-300" : "text-white/30"}`} />
          <div>
            <p className="font-semibold text-white/40">
              Badge status
            </p>
            <p className="text-lg font-semibold text-white">
              {badgeEarned ? "Awarded" : "Pending"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-white/40">
              Secret manager
            </p>
            <p className="text-sm text-white/70">
              {phaseMeta[phase].helper}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copySecret}
              disabled={!secretInput}
              className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-emerald-400/50 disabled:opacity-40"
            >
              Copy secret
            </button>
            <button
              type="button"
              onClick={downloadSecret}
              disabled={!secretInput}
              className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-emerald-400/50 disabled:opacity-40"
            >
              Download
            </button>
            {secretInput && (
              <button
                type="button"
                onClick={clearSecret}
                className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-red-400/60"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm font-mono text-white/80">
          <KeyRound className="h-4 w-4 text-emerald-300" />
          {secretInput ? secretInput : "Secret will appear here after you commit."}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {orderedCandidates.map((candidate, index) => {
          const voteShare =
            totalVotes === 0
              ? 0
              : Math.round((candidate.votes / totalVotes) * 1000) / 10;
          const placement = index + 1;
          const isPending = pendingCandidate === candidate.id;
          const buttonDisabled =
            (phase === "COMMIT_PHASE" && (hasCommitted)) ||
            (phase === "REVEAL_PHASE" && (!canReveal || hasRevealed)) ||
            phase === "NOT_STARTED" ||
            phase === "ENDED";

          const actionHandler =
            phase === "REVEAL_PHASE" ? handleReveal : handleCommit;

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
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-emerald-500/20 to-cyan-500/10 text-xl font-semibold text-white/70">
                      {candidate.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-white/50">
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
                  disabled={buttonDisabled || isPending}
                  onClick={() => actionHandler(candidate.id)}
                  className="relative inline-flex min-w-[130px] cursor-pointer items-center justify-center overflow-hidden rounded-full border border-emerald-500/40 bg-linear-to-r from-emerald-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-[0_15px_40px_rgba(16,185,129,0.45)] transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    actionLabel
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
