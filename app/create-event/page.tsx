"use client";

import Image from "next/image";
import {
  ChevronDown,
  Loader2,
  Plus,
  Trash2,
  Upload,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useWallet } from "@/app/lib/wallet-provider";
import { createVotingEventOnChain } from "@/lib/contracts/voting-system";
import { useRouter } from "next/navigation";

type CandidateDraft = {
  id: string;
  name: string;
  avatar: string | null;
};

const defaultCandidates: CandidateDraft[] = [
  {
    id: "seed-candidate-1",
    name: "Candidate 1",
    avatar: "/logo.png",
  },
  {
    id: "seed-candidate-2",
    name: "Candidate 2",
    avatar: "/logo.png",
  },
];

type SelectOption = { label: string; value: string };

const dayOptions: SelectOption[] = Array.from({ length: 31 }, (_, index) => {
  const value = String(index + 1).padStart(2, "0");
  return { label: value, value };
});
const monthOptions: SelectOption[] = [
  { label: "Jan", value: "01" },
  { label: "Feb", value: "02" },
  { label: "Mar", value: "03" },
  { label: "Apr", value: "04" },
  { label: "May", value: "05" },
  { label: "Jun", value: "06" },
  { label: "Jul", value: "07" },
  { label: "Aug", value: "08" },
  { label: "Sep", value: "09" },
  { label: "Oct", value: "10" },
  { label: "Nov", value: "11" },
  { label: "Dec", value: "12" },
];
const yearOptions: SelectOption[] = Array.from({ length: 6 }, (_, index) => {
  const value = String(new Date().getFullYear() + index);
  return { label: value, value };
});

function FieldLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-emerald-200/80">
      <span>{title}</span>
      {hint ? <span className="text-white/40">{hint}</span> : null}
    </div>
  );
}

type DateSelectFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

function DateSelectField({
  label,
  placeholder,
  value,
  options,
  onChange,
}: DateSelectFieldProps) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-black/50 px-4 py-3 text-white/70">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">
        {label}
      </p>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="mt-1 h-auto w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-left text-lg font-semibold text-white/80 hover:border-emerald-300/50 focus:ring-emerald-400 cursor-pointer">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="border border-emerald-500/20 bg-zinc-900/95 text-white">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CandidateCard({
  candidate,
  onRemove,
}: {
  candidate: CandidateDraft;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-emerald-500/15 bg-linear-to-r from-white/10 to-transparent px-4 py-3 text-white/90">
      <div className="relative h-12 w-12 rounded-2xl border border-white/10 bg-black/40">
        {candidate.avatar ? (
          <Image
            src={candidate.avatar}
            alt={candidate.name}
            fill
            sizes="48px"
            className="rounded-2xl object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <p className="text-white/50 text-2xl font-medium">{candidate.name.charAt(0)}</p>
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white">{candidate.name}</p>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
        <UsersRound className="h-4 w-4 text-emerald-300" />
        0 votes
      </div>
      <button
        type="button"
        aria-label={`Remove ${candidate.name}`}
        onClick={() => onRemove(candidate.id)}
        className="ml-2 rounded-full border border-white/10 p-1 text-white/40 transition hover:border-red-500/50 hover:text-red-300 cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Unable to read file."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CreateVote() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventCover, setEventCover] = useState<string | null>(null);
  const [showStartSchedule, setShowStartSchedule] = useState(false);
  const [startDay, setStartDay] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endDay, setEndDay] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [endYear, setEndYear] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateAvatar, setCandidateAvatar] = useState<string | null>(null);
  const [candidates, setCandidates] =
    useState<CandidateDraft[]>(defaultCandidates);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "idle" | "success" | "error";
    copy: string | null;
  }>({
    type: "idle",
    copy: null,
  });
  const { toast } = useToast();
  
  // Use wallet context instead of localStorage
  const { authToken, isAuthenticated, account } = useWallet();

  const computedStartTime = useMemo(() => {
    if (!startDay || !startMonth || !startYear) return null;
    const day = Number(startDay);
    const month = Number(startMonth) - 1;
    const year = Number(startYear);
    const date = new Date(Date.UTC(year, month, day, 9, 0));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }, [startDay, startMonth, startYear]);

  const computedEndTime = useMemo(() => {
    if (!endDay || !endMonth || !endYear) return null;
    const day = Number(endDay);
    const month = Number(endMonth) - 1;
    const year = Number(endYear);
    const date = new Date(Date.UTC(year, month, day, 23, 59));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }, [endDay, endMonth, endYear]);

  const handleValidationError = (copy: string) => {
    setStatusMessage({ type: "error", copy });
    toast({
      variant: "destructive",
      title: "Action required",
      className: "text-red-100 bg-red-900/50 border-red-700/30",
      description: copy,
    });
  };

  const startPreview = computedStartTime
    ? new Date(computedStartTime).toUTCString()
    : "Goes live immediately after publish";
  const endPreview = computedEndTime
    ? new Date(computedEndTime).toUTCString()
    : "Pending selection";

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToDataUrl(file);
      setEventCover(base64);
    } catch (error) {
      console.error(error);
      setStatusMessage({
        type: "error",
        copy: "Unable to read cover image.",
      });
    }
  };

  const handleCandidateAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToDataUrl(file);
      setCandidateAvatar(base64);
    } catch (error) {
      console.error(error);
      setStatusMessage({
        type: "error",
        copy: "Unable to read candidate avatar.",
      });
    }
  };

  const toggleStartSchedule = () => {
    setShowStartSchedule((prev) => {
      const next = !prev;
      if (!next) {
        setStartDay("");
        setStartMonth("");
        setStartYear("");
      }
      return next;
    });
  };

  const handleAddCandidate = () => {
    if (!candidateName.trim()) {
      handleValidationError("Candidate name is required.");
      return;
    }

    const newCandidate: CandidateDraft = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      name: candidateName.trim(),
      avatar: candidateAvatar,
    };

    setCandidates((prev) => [...prev, newCandidate]);
    setCandidateName("");
    setCandidateAvatar(null);
    setStatusMessage({ type: "idle", copy: null });
  };

  const handleRemoveCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((candidate) => candidate.id !== id));
  };

  const router = useRouter();

  const publishVote = async () => {
    setStatusMessage({ type: "idle", copy: null });
    
    // Validate form fields
    if (!title.trim() || !description.trim()) {
      handleValidationError("Please provide both a title and description.");
      return;
    }
    if (!computedEndTime) {
      handleValidationError("Select a valid end date.");
      return;
    }

    // Check if user is authenticated with wallet
    if (!isAuthenticated || !authToken) {
      handleValidationError(
        "Please connect your wallet and authenticate to create an event."
      );
      return;
    }
    if (!account) {
      handleValidationError("Wallet connection missing. Please reconnect and try again.");
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const requestedStart = computedStartTime
      ? new Date(computedStartTime)
      : new Date();
    let startSeconds = Math.floor(requestedStart.getTime() / 1000);
    if (Number.isNaN(startSeconds)) {
      handleValidationError("Invalid start date selected.");
      return;
    }

    const MIN_LEAD_SECONDS = 10;
    if (startSeconds < nowSeconds + MIN_LEAD_SECONDS) {
      startSeconds = nowSeconds + MIN_LEAD_SECONDS;
    }

    const endDate = new Date(computedEndTime);
    const endSeconds = Math.floor(endDate.getTime() / 1000);
    if (Number.isNaN(endSeconds)) {
      handleValidationError("Invalid end date selected.");
      return;
    }

    if (endSeconds <= startSeconds) {
      handleValidationError("End time must be after the start time.");
      return;
    }

    const startTimeForSubmission = new Date(startSeconds * 1000).toISOString();
    const endTimeForSubmission = new Date(endSeconds * 1000).toISOString();

    setIsPublishing(true);
    try {
      toast({
        title: "Confirm transaction",
        description: "Approve the on-chain event creation in your wallet.",
      });

      setStatusMessage({
        type: "idle",
        copy: "Waiting for on-chain confirmation...",
      });

      const onChainResult = await createVotingEventOnChain({
        account,
        name: title.trim(),
        description: description.trim(),
        startTime: startSeconds,
        endTime: endSeconds,
      });

      toast({
        title: "Event registered on-chain",
        description: `Event ID #${onChainResult.eventId} • tx ${onChainResult.txHash.slice(0, 10)}…`,
      });

      router.push('/')

      // Create the event using the wallet auth token
      const eventResponse = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: title.trim(),
          description: description.trim(),
          startTime: startTimeForSubmission,
          endTime: endTimeForSubmission,
          chainEventId: onChainResult.eventId,
          blockAddress: onChainResult.txHash,
          imgUrl: eventCover,
        }),
      });

      const eventPayload = await eventResponse.json();
      if (!eventResponse.ok || !eventPayload?.success) {
        throw new Error(eventPayload?.error ?? "Failed to create event.");
      }

      const eventId: number | undefined = eventPayload?.data?.id;
      const candidateErrors: string[] = [];

      if (eventId) {
        for (const candidate of candidates) {
          if (!candidate.name.trim()) continue;
          // Send candidate with name and avatar to the API
          // Use the wallet auth token for authorization
          const candidateResponse = await fetch("/api/candidates", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              name: candidate.name,
              eventId,
              avatar: candidate.avatar || null,
            }),
          });
          if (!candidateResponse.ok) {
            const payload = await candidateResponse.json();
            candidateErrors.push(
              payload?.error ?? `Unable to add ${candidate.name}.`
            );
          }
        }
      }

      if (candidateErrors.length) {
        const errorCopy = `Event created but some candidates failed: ${candidateErrors.join(
          ", "
        )}`;
        handleValidationError(errorCopy);
      } else {
        setStatusMessage({
          type: "success",
          copy: "Event created on-chain and synced with the dashboard.",
        });
        setTitle("");
        setDescription("");
        setEventCover(null);
        setShowStartSchedule(false);
        setStartDay("");
        setStartMonth("");
        setStartYear("");
        setEndDay("");
        setEndMonth("");
        setEndYear("");
        setCandidateName("");
        setCandidateAvatar(null);
        setCandidates(defaultCandidates);
      }
    } catch (error) {
      console.error(error);
      handleValidationError(
        error instanceof Error ? error.message : "Unexpected error on publish."
      );
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-black via-emerald-950 to-black pt-24 pb-20">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-10 left-20 h-96 w-96 animate-pulse-slow rounded-full bg-emerald-500/20 blur-3xl"></div>
        <div
          className="absolute bottom-10 right-10 h-80 w-80 animate-pulse-slow rounded-full bg-cyan-500/20 blur-3xl"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 right-1/3 h-[500px] w-[500px] -translate-y-1/2 animate-pulse-slow rounded-full bg-emerald-500/10 blur-3xl"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-6">
        <header className="mt-6 text-center text-white">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-mono uppercase tracking-[0.3em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            On-chain Creation Flow
          </p>
          <h1 className="mt-5 bg-linear-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
            Create Vote
          </h1>
          <p className="mt-3 text-base text-white/70 sm:text-lg">
            Configure your event, upload brand assets, and enroll candidates
            before going live.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-emerald-500/20 bg-black/40 p-8 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-3xl">
            <div className="mb-8 space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <label
                  htmlFor="event-cover"
                  className="flex flex-1 cursor-pointer flex-col rounded-2xl border border-white/10 bg-white/5 p-4 text-center transition hover:border-emerald-400/50"
                >
                  <input
                    id="event-cover"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleCoverUpload}
                  />
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/30">
                    {eventCover ? (
                      <div className="relative h-16 w-16">
                        <Image
                          src={eventCover}
                          alt="Event cover"
                          fill
                          sizes="64px"
                          className="rounded-xl object-cover"
                        />
                      </div>
                    ) : (
                      <Upload className="h-7 w-7 text-white/70" />
                    )}
                  </div>
                  <p className="mt-3 font-semibold text-white">Upload Photo</p>
                  <span className="text-xs text-white/40">
                    1200 x 768 · PNG/JPG
                  </span>
                </label>

                <div className="flex flex-1 flex-col gap-4">
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <FieldLabel title="Vote Title" />
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. Votie Season Finals"
                      className="mt-1 w-full bg-transparent text-white placeholder:text-white/40 focus:outline-none"
                    />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <FieldLabel title="Description" />
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Explain the scope, eligibility, and rewards..."
                      className="mt-2 w-full resize-none bg-transparent text-white placeholder:text-white/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <button
                type="button"
                onClick={toggleStartSchedule}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white transition hover:border-emerald-400/60 hover:bg-white/10 cursor-pointer"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">
                    Start Date (optional)
                  </p>
                  <p className="text-sm text-white/70">{startPreview}</p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-white/60 transition-transform ${
                    showStartSchedule ? "rotate-180 text-emerald-300" : ""
                  }`}
                />
              </button>

              {showStartSchedule && (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <DateSelectField
                      label="Day"
                      placeholder="DD"
                      value={startDay}
                      options={dayOptions}
                      onChange={setStartDay}
                    />
                    <DateSelectField
                      label="Month"
                      placeholder="MM"
                      value={startMonth}
                      options={monthOptions}
                      onChange={setStartMonth}
                    />
                    <DateSelectField
                      label="Year"
                      placeholder="YY"
                      value={startYear}
                      options={yearOptions}
                      onChange={setStartYear}
                    />
                  </div>
                  <p className="mt-3 text-xs text-white/40">
                    Start time stored in UTC · {startPreview}
                  </p>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-linear-to-br from-white/5 via-transparent to-white/0 p-6">
              <FieldLabel title="End Vote" hint="UTC" />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <DateSelectField
                  label="Day"
                  placeholder="DD"
                  value={endDay}
                  options={dayOptions}
                  onChange={setEndDay}
                />
                <DateSelectField
                  label="Month"
                  placeholder="MM"
                  value={endMonth}
                  options={monthOptions}
                  onChange={setEndMonth}
                />
                <DateSelectField
                  label="Year"
                  placeholder="YY"
                  value={endYear}
                  options={yearOptions}
                  onChange={setEndYear}
                />
              </div>
              <p className="mt-3 text-xs text-white/40">
                Deadline stored in UTC · {endPreview}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-[#07120f]/80 p-8 shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-3xl">
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-emerald-200/80">
                  Candidate Desk
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-white">
                  Curate Participants
                </h2>
                <p className="text-sm text-white/60">
                  Upload avatars, assign names, and optionally add on-chain
                  metadata.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 py-4 text-white/70 transition hover:border-emerald-400/60 hover:text-white">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={handleCandidateAvatar}
                    />
                    <Upload className="h-5 w-5" />
                    Avatar
                  </label>
                  <div className="sm:col-span-2">
                    <FieldLabel title="Candidate Name" />
                    <div className="mt-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                      <input
                        value={candidateName}
                        onChange={(event) =>
                          setCandidateName(event.target.value)
                        }
                        placeholder="e.g. Luminous Five"
                        className="w-full bg-transparent text-white placeholder:text-white/50 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddCandidate}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-3 font-semibold text-white transition hover:border-emerald-400/60 hover:bg-emerald-500/10 cursor-pointer"
                >
                  <Plus className="h-5 w-5" />
                  Add Candidate
                </button>
              </div>

              <div className="space-y-3">
                {candidates.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-emerald-500/30 bg-black/30 px-4 py-6 text-center text-sm text-white/50">
                    No candidates yet. Add your first contender.
                  </p>
                ) : (
                  candidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      onRemove={handleRemoveCandidate}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

<div className="flex justify-end w-full">
        <button
          type="button"
          onClick={publishVote}
          disabled={isPublishing}
          className="mx-auto w-max rounded-full border border-emerald-500/40 bg-linear-to-r from-cyan-900/50 to-emerald-800/80 px-24 py-5 text-center text-lg font-semibold text-white shadow-[0_25px_55px_rgba(6,24,16,0.55)] transition hover:shadow-[0_35px_70px_rgba(6,24,16,0.65)] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
        >
          {isPublishing ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
            </span>
          ) : (
            "Publish Vote"
          )}
        </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
          <div className="inline-flex items-center gap-2">
            <WandSparkles className="h-4 w-4 text-emerald-300" />
            {statusMessage.copy
              ? statusMessage.copy
              : "Draft saved locally. Wallet signatures required to finalize."}
          </div>
          <p>Need help? Ping the Votie DAO support desk.</p>
        </div>
      </main>
    </div>
  );
}
