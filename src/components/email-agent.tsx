/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useMemo, useState } from "react";

type AnalysisResponse = {
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  priority: "low" | "medium" | "high";
  tags: string[];
  subjectSuggestion: string;
  tasks: {
    description: string;
    due?: string;
    owner?: string;
  }[];
  followUpRecommendation: string;
  recommendedReply: {
    subject: string;
    body: string;
  };
};

type ComposeResponse = {
  subject: string;
  preview: string;
  body: string;
  cadenceTip: string;
};

type Tone = "professional" | "friendly" | "concise" | "assertive" | "warm";

const toneOptions: { label: string; value: Tone; caption: string }[] = [
  { label: "Professional", value: "professional", caption: "Balanced, polite, structured" },
  { label: "Friendly", value: "friendly", caption: "Warm, personable, relationship-first" },
  { label: "Concise", value: "concise", caption: "Quick bullet summary, direct asks" },
  { label: "Assertive", value: "assertive", caption: "Clear deadlines, crisp accountability" },
  { label: "Warm", value: "warm", caption: "Empathetic, supportive, high-touch" },
];

const personaPresets = [
  "Alex (Customer Success)",
  "Jordan (Engineering Lead)",
  "Taylor (Executive Stakeholder)",
  "Morgan (Prospect)",
];

const demoEmail = `Hey team,

Thanks for the sprint updates. We're close, but there are a few items we need to close before launch:

- Update onboarding docs so customers understand the new analytics beta (please finish by Thursday).
- Coordinate with Jordan for the release checklist.
- Could you also confirm with finance that the promo codes will stack by 5/12?

This is pretty urgent because the announcement is queued up for Friday morning. Let me know once we're squared away.

Really appreciate the hard work here.

Best,
Alex`;

const demoHistory = `Thread summary:
- Kickoff call scheduled for May 15
- Jordan owns release communication
- Finance expects new promo codes by May 12`;

export function EmailAgent() {
  const [incomingEmail, setIncomingEmail] = useState("");
  const [threadHistory, setThreadHistory] = useState("");
  const [persona, setPersona] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [audience, setAudience] = useState("Alex");
  const [objective, setObjective] = useState("Share next steps after receiving an update");
  const [tone, setTone] = useState<Tone>("professional");
  const [keyPoints, setKeyPoints] = useState(
    ["Confirm ownership of onboarding docs", "Align on release checklist", "Verify promo codes with finance"].join("\n"),
  );
  const [callToAction, setCallToAction] = useState("Confirm timelines by Thursday EOD");
  const [signature, setSignature] = useState("Jordan\nEngineering Lead");
  const [composeResult, setComposeResult] = useState<ComposeResponse | null>(null);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const hasAnalysis = Boolean(analysis);
  const hasComposeResult = Boolean(composeResult);

  const handleAnalyze = useCallback(async () => {
    if (!incomingEmail.trim()) {
      setAnalysisError("Drop in the email you want the agent to triage first.");
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "analyze",
          content: incomingEmail,
          threadHistory,
          persona,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to analyze this email.");
      }

      const payload = (await response.json()) as AnalysisResponse;
      setAnalysis(payload);
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Something went wrong. Try again.",
      );
    } finally {
      setAnalyzing(false);
    }
  }, [incomingEmail, threadHistory, persona]);

  const handleCompose = useCallback(async () => {
    setComposeError(null);
    setComposeResult(null);
    if (!objective.trim()) {
      setComposeError("Give the agent a clear objective to aim for.");
      return;
    }

    setComposing(true);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "compose",
          audience,
          objective,
          tone,
          keyPoints: keyPoints.split(/\r?\n/),
          callToAction,
          signature,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to generate the draft.");
      }

      const payload = (await response.json()) as ComposeResponse;
      setComposeResult(payload);
    } catch (error) {
      setComposeError(
        error instanceof Error ? error.message : "Something went wrong. Try again.",
      );
    } finally {
      setComposing(false);
    }
  }, [audience, objective, tone, keyPoints, callToAction, signature]);

  const resetDemo = useCallback(() => {
    setIncomingEmail(demoEmail);
    setThreadHistory(demoHistory);
    setPersona("Alex");
    setAnalysis(null);
    setAnalysisError(null);
  }, []);

  const sentimentBadge = useMemo(() => {
    if (!analysis) return null;
    const mapping = {
      positive: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      neutral: "bg-slate-100 text-slate-700 border border-slate-200",
      negative: "bg-rose-100 text-rose-700 border border-rose-200",
    };
    const label = {
      positive: "Positive",
      neutral: "Neutral",
      negative: "Needs Care",
    }[analysis.sentiment];
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${mapping[analysis.sentiment]}`}>
        {label}
      </span>
    );
  }, [analysis]);

  return (
    <div className="space-y-10">
      <HeroSection onLoadDemo={resetDemo} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
        <section className="rounded-3xl border border-zinc-100 bg-white/80 p-6 shadow-sm shadow-zinc-100 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Triage incoming email</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Drop in the raw thread. The agent will summarize, extract tasks, and draft your reply.
              </p>
            </div>
            <button
              type="button"
              onClick={resetDemo}
              className="text-xs font-medium text-blue-600 hover:text-blue-500"
            >
              Load demo
            </button>
          </div>
          <div className="mt-6 space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Incoming email
            </label>
            <textarea
              value={incomingEmail}
              onChange={(event) => setIncomingEmail(event.target.value)}
              placeholder="Paste the message you need help with..."
              className="h-56 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Thread context (optional)
                </label>
                <textarea
                  value={threadHistory}
                  onChange={(event) => setThreadHistory(event.target.value)}
                  placeholder="Key notes from earlier in the thread…"
                  className="h-28 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Who sent it? (optional)
                </label>
                <input
                  value={persona}
                  onChange={(event) => setPersona(event.target.value)}
                  list="persona-presets"
                  placeholder="e.g. Alex from Sales"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <datalist id="persona-presets">
                  {personaPresets.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
            </div>
            {analysisError && (
              <p className="text-sm font-medium text-rose-600">{analysisError}</p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                Seconds to insights. The agent never sends anything without your approval.
              </p>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {analyzing ? (
                  <>
                    <Spinner />
                    Analyzing
                  </>
                ) : (
                  "Analyze email"
                )}
              </button>
            </div>
          </div>
        </section>
        <section className="rounded-3xl border border-blue-50 bg-gradient-to-br from-white via-white to-blue-50 p-6 shadow-sm shadow-blue-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Agent insights</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Synthesized summary, action items, and a ready-to-send reply draft.
              </p>
            </div>
            {sentimentBadge}
          </div>
          {hasAnalysis ? (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-zinc-500">Summary</h3>
                <p className="mt-2 rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-800 shadow-inner">
                  {analysis?.summary}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PriorityChip priority={analysis!.priority} />
                {analysis?.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-500">Recommended subject</h3>
                <CopyableCard value={analysis?.subjectSuggestion ?? ""} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-500">Action items</h3>
                <div className="mt-2 space-y-2">
                  {analysis?.tasks.length ? (
                    analysis?.tasks.map((task, index) => (
                      <div
                        key={`${task.description}-${index}`}
                        className="rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm"
                      >
                        <div className="font-medium text-zinc-900">{task.description}</div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {task.owner ? `Owner: ${task.owner}` : "Owner: You"}
                          {task.due ? ` • Due ${task.due}` : ""}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm text-zinc-500 shadow-inner">
                      No explicit tasks detected. Archive or send a short acknowledgement.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-500">Follow-up plan</h3>
                <p className="mt-2 rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-800 shadow-inner">
                  {analysis?.followUpRecommendation}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-500">Reply draft</h3>
                  <CopyButton text={analysis?.recommendedReply.body ?? ""} />
                </div>
                <div className="mt-2 space-y-2 rounded-2xl border border-zinc-100 bg-white p-4 text-sm text-zinc-800 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Subject
                  </div>
                  <div className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    {analysis?.recommendedReply.subject}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Body
                  </div>
                  <pre className="whitespace-pre-wrap rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    {analysis?.recommendedReply.body}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>

      <section id="compose" className="rounded-3xl border border-zinc-100 bg-white/80 p-6 shadow-sm shadow-zinc-100 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Compose an outbound email</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Feed the agent your intent and key talking points. It crafts a polished draft instantly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {toneOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTone(option.value)}
                className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
                  tone === option.value
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-zinc-200 text-zinc-500 hover:border-blue-200 hover:text-blue-500"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Recipient or audience">
              <input
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="Taylor (VP of Product)"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </Field>
            <Field label="Objective">
              <input
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                placeholder="Share launch plan, Align on next steps..."
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </Field>
            <Field label="Key talking points">
              <textarea
                value={keyPoints}
                onChange={(event) => setKeyPoints(event.target.value)}
                className="h-40 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Call to action">
                <input
                  value={callToAction}
                  onChange={(event) => setCallToAction(event.target.value)}
                  placeholder="Confirm timeline by Thursday"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Signature">
                <textarea
                  value={signature}
                  onChange={(event) => setSignature(event.target.value)}
                  className="h-24 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
            </div>
            {composeError && (
              <p className="text-sm font-medium text-rose-600">{composeError}</p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                Pro tip: Add bullets for faster, more accurate drafts.
              </p>
              <button
                type="button"
                onClick={handleCompose}
                disabled={composing}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500"
              >
                {composing ? (
                  <>
                    <Spinner light />
                    Draft email
                  </>
                ) : (
                  "Draft email"
                )}
              </button>
            </div>
          </div>
          <div className="rounded-3xl border border-zinc-100 bg-zinc-50 p-6 shadow-inner">
            {hasComposeResult ? (
              <div className="space-y-4 text-sm text-zinc-800">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Subject
                  </div>
                  <CopyableCard value={composeResult?.subject ?? ""} />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Preview
                  </div>
                  <p className="mt-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm">
                    {composeResult?.preview}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Full draft
                    </div>
                    <CopyButton text={composeResult?.body ?? ""} />
                  </div>
                  <pre className="mt-2 h-[340px] whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-700 shadow-sm">
                    {composeResult?.body}
                  </pre>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
                  {composeResult?.cadenceTip}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-zinc-500">
                <img
                  src="https://illustrations.popsy.co/gray/email-sending.svg"
                  alt="Email illustration"
                  className="mb-4 h-32 w-auto opacity-80"
                />
                Feed the agent your intent and it will craft the first draft in seconds.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroSection({ onLoadDemo }: { onLoadDemo: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-10 shadow-sm shadow-blue-100">
      <div className="absolute -left-24 -top-20 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="relative flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
            Reclaim your inbox
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Email agent that triages, drafts, and keeps you on top of every thread.
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
            Paste any message and the agent summarizes the intent, extracts action items, and drafts a tailored reply.
            Plan proactive outbound emails by handing it your objectives and talking points.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onLoadDemo}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
            >
              Try it with sample data
            </button>
            <a
              href="#compose"
              className="rounded-full border border-blue-200 px-5 py-2 text-sm font-semibold text-blue-600 transition hover:border-blue-400"
            >
              Build outbound sequences
            </a>
          </div>
        </div>
        <div className="relative hidden h-full w-full max-w-sm rounded-3xl border border-blue-100 bg-white/80 p-6 shadow-lg shadow-blue-100 md:block">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Live status
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <StatusRow label="Summarizing thread" status="Done" tone="positive" />
            <StatusRow label="Extracting tasks" status="In progress" tone="neutral" />
            <StatusRow label="Drafting reply" status="Queued" tone="neutral" />
            <StatusRow label="Scheduling reminder" status="Optional" tone="info" />
          </div>
          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
            Every draft remains in your control. Hit send only when you&apos;re ready.
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusRow({
  label,
  status,
  tone,
}: {
  label: string;
  status: string;
  tone: "positive" | "neutral" | "info";
}) {
  const badge =
    tone === "positive"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "info"
      ? "bg-blue-100 text-blue-700"
      : "bg-slate-100 text-slate-600";
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-sm">
      <span className="text-zinc-700">{label}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>{status}</span>
    </div>
  );
}

function Spinner({ light }: { light?: boolean }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${light ? "text-white" : "text-blue-600"}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className={`${light ? "opacity-30" : "opacity-25"}`}
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className={light ? "opacity-90" : "opacity-75"}
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function PriorityChip({ priority }: { priority: AnalysisResponse["priority"] }) {
  const mapping = {
    high: "border-rose-200 bg-rose-100 text-rose-700",
    medium: "border-amber-200 bg-amber-100 text-amber-700",
    low: "border-emerald-200 bg-emerald-100 text-emerald-700",
  };
  const label = {
    high: "High urgency",
    medium: "Medium priority",
    low: "Low priority",
  }[priority];
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${mapping[priority]}`}>
      {label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Copy failed", error);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs font-semibold text-blue-600 transition hover:text-blue-500"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CopyableCard({ value }: { value: string }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm">
      <span className="truncate pr-4">{value || "—"}</span>
      <CopyButton text={value} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center text-sm text-zinc-500">
      <img
        src="https://illustrations.popsy.co/gray/inbox-zero.svg"
        alt="Inbox illustration"
        className="mb-4 h-36 w-auto opacity-80"
      />
      Analysis will appear here. Paste an email to let the agent take over the busy work.
    </div>
  );
}
