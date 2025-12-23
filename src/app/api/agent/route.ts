import { NextRequest } from "next/server";

type AnalyzeRequest = {
  mode: "analyze";
  content: string;
  threadHistory?: string;
  persona?: string;
};

type ComposeRequest = {
  mode: "compose";
  audience: string;
  objective: string;
  tone: Tone;
  keyPoints: string[];
  callToAction?: string;
  signature?: string;
};

type Tone = "professional" | "friendly" | "concise" | "assertive" | "warm";

type AnalyzePayload = {
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

type ComposePayload = {
  subject: string;
  preview: string;
  body: string;
  cadenceTip: string;
};

const POSITIVE_WORDS = [
  "thank",
  "appreciate",
  "great",
  "glad",
  "pleased",
  "happy",
  "excited",
];

const NEGATIVE_WORDS = [
  "concern",
  "issue",
  "problem",
  "delayed",
  "delay",
  "blocked",
  "urgent",
  "frustrated",
  "disappointed",
];

const URGENCY_WORDS = ["urgent", "asap", "immediately", "priority", "important"];

const FOLLOW_UP_TEMPLATES: Record<
  Tone,
  { subject: string; opening: string; closing: string }
> = {
  professional: {
    subject: "Quick follow-up on your message",
    opening: "Thank you for reaching out. I wanted to follow up on your note.",
    closing:
      "Let me know if you need anything else in the meantime and I'll happily assist.",
  },
  friendly: {
    subject: "Thanks for the update!",
    opening: "Thanks a bunch for the message. I wanted to keep the momentum going.",
    closing: "Looking forward to hearing back when you have a moment.",
  },
  concise: {
    subject: "Following up",
    opening: "Appreciate the note. Here's what we'll do next:",
    closing: "Ping me if priorities change.",
  },
  assertive: {
    subject: "Action needed",
    opening:
      "Thanks for the details. To keep us on schedule we need to tackle the following:",
    closing:
      "Please confirm the action items so we can close the loop without delay.",
  },
  warm: {
    subject: "Appreciate the note",
    opening:
      "Thank you so much for your thoughtful message. Here's how I'll move things forward:",
    closing:
      "Let me know how it all lands—always glad to support where I can.",
  },
};

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as AnalyzeRequest | ComposeRequest;

  if (payload.mode === "analyze") {
    const content = payload.content?.trim();
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Email content is required." }),
        { status: 400 },
      );
    }

    const analysis = analyzeEmail(content, payload.threadHistory, payload.persona);
    return new Response(JSON.stringify(analysis), { status: 200 });
  }

  if (payload.mode === "compose") {
    const result = composeEmail({
      audience: payload.audience.trim(),
      objective: payload.objective.trim(),
      tone: payload.tone,
      keyPoints: payload.keyPoints,
      callToAction: payload.callToAction?.trim(),
      signature: payload.signature?.trim(),
    });
    return new Response(JSON.stringify(result), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "Unsupported mode." }), {
    status: 400,
  });
}

function analyzeEmail(
  content: string,
  threadHistory?: string,
  persona?: string,
): AnalyzePayload {
  const sentiment = detectSentiment(content);
  const priority = determinePriority(content);
  const tasks = extractTasks(content);
  const subjectSuggestion = buildSubject(tasks, priority, sentiment);
  const summary = summarize(content, threadHistory);
  const tags = buildTags({ priority, sentiment, tasks });
  const followUpRecommendation = buildFollowUpRecommendation({
    priority,
    tasks,
    content,
  });

  const tone: Tone = priority === "high" ? "assertive" : "professional";
  const recommendedReply = generateReply({
    tone,
    tasks,
    summary,
    persona,
  });

  return {
    summary,
    sentiment,
    priority,
    subjectSuggestion,
    tags,
    tasks,
    followUpRecommendation,
    recommendedReply,
  };
}

function composeEmail({
  audience,
  objective,
  tone,
  keyPoints,
  callToAction,
  signature,
}: Omit<ComposeRequest, "mode">): ComposePayload {
  const cleanPoints = keyPoints
    .map((point) => point.trim())
    .filter(Boolean)
    .map((point) => (point.startsWith("-") ? point.slice(1).trim() : point));

  const toneTemplate = FOLLOW_UP_TEMPLATES[tone];
  const subject = craftSubjectFromObjective(objective, toneTemplate.subject);
  const opening = craftOpening(toneTemplate.opening, audience, tone);
  const bodyPoints =
    cleanPoints.length > 0
      ? cleanPoints.map((point) => `• ${capitalize(point)}`).join("\n")
      : "• Key details are included in the attachments.";
  const callout = callToAction
    ? `\n\nNext up: ${capitalize(callToAction)}.`
    : "";
  const closing = toneTemplate.closing;
  const signoff =
    signature ??
    (tone === "friendly" || tone === "warm" ? "All the best,\nYour Email Agent" : "Best regards,\nYour Email Agent");

  const body = `${opening}

${objective ? `Objective: ${capitalize(objective)}\n\n` : ""}${bodyPoints}${callout}

${closing}

${signoff}`;

  const preview = buildPreview(body);
  const cadenceTip = buildCadenceTip({ tone, cleanPoints });

  return {
    subject,
    preview,
    body,
    cadenceTip,
  };
}

function detectSentiment(content: string): "positive" | "neutral" | "negative" {
  const normalized = content.toLowerCase();
  const positiveHits = POSITIVE_WORDS.filter((word) =>
    normalized.includes(word),
  ).length;
  const negativeHits = NEGATIVE_WORDS.filter((word) =>
    normalized.includes(word),
  ).length;

  if (positiveHits === negativeHits) {
    return "neutral";
  }

  return positiveHits > negativeHits ? "positive" : "negative";
}

function determinePriority(content: string): "low" | "medium" | "high" {
  const normalized = content.toLowerCase();

  if (URGENCY_WORDS.some((word) => normalized.includes(word))) {
    return "high";
  }

  if (/\b\d{1,2}\/\d{1,2}\b/.test(normalized)) {
    return "medium";
  }

  if (/\b(next week|soon|follow up)\b/.test(normalized)) {
    return "medium";
  }

  return "low";
}

function extractTasks(content: string): AnalyzePayload["tasks"] {
  const lines = content.split(/\r?\n/);
  const taskLines = lines.filter(
    (line) =>
      /^(\*|-|\d+\.)/.test(line.trim()) ||
      /(please|can you|could you|action)/i.test(line),
  );

  return taskLines
    .map((line) => {
      const description = line.replace(/^(\*|-|\d+\.)\s*/, "").trim();
      const dueMatch =
        description.match(
          /\bby\s+((?:next\s+week|tomorrow|today|\d{1,2}\/\d{1,2}|\w+\s+\d{1,2}))/i,
        ) ?? line.match(/\b(?:due|deadline)\s+(\w+\s+\d{1,2})/i);
      const ownerMatch = description.match(/\bfor\s+([A-Z][a-z]+)/);

      return {
        description: capitalize(description),
        due: dueMatch?.[1] ? titleCase(dueMatch[1]) : undefined,
        owner: ownerMatch?.[1],
      };
    })
    .filter((task) => Boolean(task.description));
}

function buildSubject(
  tasks: AnalyzePayload["tasks"],
  priority: AnalyzePayload["priority"],
  sentiment: AnalyzePayload["sentiment"],
): string {
  const leadTask = tasks[0]?.description ?? "";
  const tag =
    priority === "high"
      ? "Urgent"
      : sentiment === "positive"
      ? "Update"
      : "Follow-up";

  if (leadTask) {
    return `[${tag}] ${leadTask}`;
  }

  switch (priority) {
    case "high":
      return "[Urgent] Action required on latest request";
    case "medium":
      return "Next steps for your email";
    default:
      return "Thanks for the update — here's the plan";
  }
}

function summarize(content: string, threadHistory?: string): string {
  const sentences = content
    .replace(/\n+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .filter(Boolean);
  const summary = sentences.slice(0, 3).join(" ");
  const historyNote = threadHistory
    ? ` Thread context considered (${threadHistory.split(/\s+/).length} words).`
    : "";
  return summary || "No summary available." + historyNote;
}

function buildTags({
  priority,
  sentiment,
  tasks,
}: {
  priority: AnalyzePayload["priority"];
  sentiment: AnalyzePayload["sentiment"];
  tasks: AnalyzePayload["tasks"];
}): string[] {
  const tags = new Set<string>();
  tags.add(priority === "high" ? "Hot" : priority === "medium" ? "Follow-up" : "Backlog");
  tags.add(sentiment === "positive" ? "Relationship" : sentiment === "negative" ? "Risk" : "Neutral");

  if (tasks.length > 0) {
    tags.add("Action items");
  }

  if (tasks.some((task) => task.owner)) {
    tags.add("Delegation");
  }

  return Array.from(tags);
}

function buildFollowUpRecommendation({
  priority,
  tasks,
  content,
}: {
  priority: AnalyzePayload["priority"];
  tasks: AnalyzePayload["tasks"];
  content: string;
}): string {
  const waitingForResponse = /\b(wait|await|response|hear back)\b/i.test(content);
  const hasTasks = tasks.length > 0;

  if (priority === "high") {
    return "Follow up within 4 business hours and confirm ownership of each task.";
  }

  if (waitingForResponse) {
    return "Schedule a reminder in 2 days to check for updates.";
  }

  if (hasTasks) {
    return "Log tasks in your system and share a progress update within 24 hours.";
  }

  return "Archive for now, revisit over the weekend for any broader updates.";
}

function generateReply({
  tone,
  tasks,
  summary,
  persona,
}: {
  tone: Tone;
  tasks: AnalyzePayload["tasks"];
  summary: string;
  persona?: string;
}): AnalyzePayload["recommendedReply"] {
  const template = FOLLOW_UP_TEMPLATES[tone];
  const intro = persona
    ? `${template.opening.replace(
        /^(Thank you|Thanks)/,
        (match) =>
          match === "Thanks"
            ? `Hi ${persona}, thanks`
            : `Hi ${persona}, thank you`,
      )}`
    : template.opening;
  const bulletSection =
    tasks.length > 0
      ? `\n\nHere's what I'm tracking:\n${tasks
          .map((task) => {
            const due = task.due ? ` (due ${task.due})` : "";
            const owner = task.owner ? ` — owner: ${task.owner}` : "";
            return `• ${task.description}${due}${owner}`;
          })
          .join("\n")}`
      : "";

  const body = `${intro}

${summary}${bulletSection}

${template.closing}

Best,
Your Email Agent`;

  return {
    subject: template.subject,
    body,
  };
}

function craftSubjectFromObjective(objective: string, fallback: string): string {
  if (!objective) {
    return fallback;
  }

  const normalized = objective.toLowerCase();
  if (normalized.includes("update")) {
    return "Quick project update";
  }
  if (normalized.includes("intro")) {
    return "Introduction and next steps";
  }
  if (normalized.includes("meeting")) {
    return "Proposed agenda for our meeting";
  }
  if (normalized.includes("feedback")) {
    return "Feedback and proposed improvements";
  }
  return capitalize(objective);
}

function craftOpening(
  templateOpening: string,
  audience: string,
  tone: Tone,
): string {
  const recipient = audience.trim();
  if (!recipient) {
    return templateOpening;
  }

  const greeting =
    tone === "friendly" || tone === "warm" ? "Hi" : "Hello";
  const softenedOpening = templateOpening.replace(/^Thank you/, "thank you").replace(/^Thanks/, "thanks");
  return `${greeting} ${recipient}, ${softenedOpening}`;
}

function buildPreview(body: string): string {
  const condensed = body.replace(/\s+/g, " ").trim();
  return condensed.slice(0, 140) + (condensed.length > 140 ? "..." : "");
}

function buildCadenceTip({
  tone,
  cleanPoints,
}: {
  tone: Tone;
  cleanPoints: string[];
}): string {
  const base =
    tone === "assertive"
      ? "Set a reminder to nudge the recipient within 1 business day."
      : tone === "concise"
      ? "Share a short recap if you do not hear back within 2 days."
      : "Send a friendly check-in if there's no response within 3 days.";

  if (cleanPoints.length > 2) {
    return `${base} Consider bolding the key decisions to make scanning easier.`;
  }

  return base;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => capitalize(part))
    .join(" ");
}
