// ---------------------------------------------------------------------------
// Scoring & diagnosis engine.
// Answers → job scores → momentum → findings → priorities → recommendations
// → the first Today list. Deterministic. No invented money figures:
// impact is stated as evidence-backed risk, never a fabricated rand value.
// ---------------------------------------------------------------------------

import {
  DIMENSIONS,
  DimensionKey,
  IndustryKey,
  JOBS,
  JobKey,
  QUESTIONS,
  jobByKey,
} from "./framework";

export type Momentum = "moving" | "slowing" | "stuck";

export type Answers = Record<string, number>; // `${job}.${dimension}` -> 0|25|50|75|100

export interface JobScore {
  job: JobKey;
  score: number; // 0–100
  momentum: Momentum;
  dimensions: Record<DimensionKey, number>;
}

export interface Finding {
  job: JobKey;
  dimension: DimensionKey;
  text: string;
}

export interface Bottleneck {
  job: JobKey;
  score: number;
  momentum: Momentum;
  impactRank: number; // 1 = fix first
  summary: string;
  findings: Finding[];
  firstActions: string[];
}

export interface Recommendation {
  job: JobKey;
  capability: string; // the capability to build, product-agnostic
  routes: { label: string; detail: string }[];
}

export interface ScoredAssessment {
  overall: number;
  jobs: JobScore[];
  bottlenecks: Bottleneck[]; // ordered, fix-first at index 0
  recommendations: Recommendation[];
  starterActions: StarterAction[];
  headline: string;
}

export interface StarterAction {
  key: string;
  title: string;
  detail: string;
}

export function answerKey(job: JobKey, dimension: DimensionKey): string {
  return `${job}.${dimension}`;
}

export function validateAnswers(answers: unknown): answers is Answers {
  if (typeof answers !== "object" || answers === null) return false;
  const a = answers as Record<string, unknown>;
  for (const q of QUESTIONS) {
    const v = a[answerKey(q.job, q.dimension)];
    if (typeof v !== "number" || ![0, 25, 50, 75, 100].includes(v)) {
      return false;
    }
  }
  return true;
}

export function momentumOf(score: number): Momentum {
  if (score >= 70) return "moving";
  if (score >= 40) return "slowing";
  return "stuck";
}

export const MOMENTUM_LABEL: Record<Momentum, string> = {
  moving: "Moving",
  slowing: "Slowing",
  stuck: "Stuck",
};

// --------------------------------------------------------------- findings

const FINDINGS: Record<JobKey, Record<DimensionKey, string>> = {
  acquire: {
    process:
      "New enquiries have no single landing place, so some are lost before anyone sees them.",
    documented:
      "Handling enquiries depends on who's available, not on a written process — it breaks when people are away.",
    accountable:
      "No one owns lead response, so replies happen late or not at all.",
    measured:
      "You can't see how long leads wait for a reply, so slow response is invisible until the lead is gone.",
    reviewed:
      "Lost leads disappear without a trace, so the same losses repeat.",
  },
  convert: {
    process:
      "Quotes are sent and then wait on the customer — there is no follow-up rhythm, so winnable work expires quietly.",
    documented:
      "Follow-up depends on memory, not a written sequence, so it happens inconsistently.",
    accountable:
      "Once a quote leaves the business, nobody owns it — quotes age without a next step.",
    measured:
      "You can't see how many quotes are open or how old they are, so the backlog is invisible.",
    reviewed:
      "Expired quotes are never counted, so you don't know how much winnable work is being lost.",
  },
  deliver: {
    deliver_dummy: "",
    process:
      "Jobs follow no set path from won to done, so progress depends on individuals and stalls when they're stretched.",
    documented:
      "Delivery knowledge lives in people's heads — it walks out the door with them.",
    accountable:
      "Active jobs have no single named owner, so late work belongs to no one.",
    measured:
      "You find out a job is late when the customer does — there's no earlier signal.",
    reviewed:
      "Finished jobs aren't reviewed, so delivery problems repeat at full cost.",
  } as unknown as Record<DimensionKey, string>,
  collect: {
    process:
      "Invoicing lags the work, which delays every payment that follows it.",
    documented:
      "There is no fixed chase sequence for overdue invoices, so chasing is improvised and easy to skip.",
    accountable:
      "Nobody owns collections day to day — overdue invoices are chased only when cash gets tight.",
    measured:
      "You can't see who owes what, right now — overdue money is invisible until it hurts.",
    reviewed:
      "Payment promises aren't logged or checked, so a broken promise costs nothing and repeats.",
  },
  control: {
    process:
      "Supplier invoices and admin live in many places, so items get lost between them.",
    documented:
      "Approvals have no written rule, so they stall on whoever happens to be asked.",
    accountable:
      "No one checks what admin is due, so deadlines surprise you.",
    measured:
      "This week's due payments and admin aren't visible in one place.",
    reviewed:
      "Recurring commitments are never reviewed, so you keep paying for things you no longer need.",
  },
  improve: {
    process:
      "Repeated problems get firefought, not fixed — the same fire costs you every time it returns.",
    documented:
      "Fixes never make it into the written way of working, so they fade.",
    accountable:
      "Nobody owns improvement, so urgent always beats important.",
    measured:
      "No number is tracked week-on-week, so you can't tell whether the business is getting better or worse.",
    reviewed:
      "There's no regular time to look at how the business ran, so problems surface only as crises.",
  },
  lead: {
    process:
      "The day starts without one list — priorities live in the owner's head and the inbox.",
    documented:
      "The team can't see today's priorities, so they work on what's loudest, not what matters.",
    accountable:
      "Actions carry no name and no date, so they drift.",
    reviewed:
      "Nothing asks 'what's stuck, and why?' each week — so stuck stays stuck.",
    measured:
      "Days end without knowing what closed and what slipped, so slippage compounds silently.",
  },
};

const SUMMARIES: Record<JobKey, string> = {
  acquire:
    "Enquiries are arriving, but the path from enquiry to reply is unreliable — leads leak before you ever quote them.",
  convert:
    "Work is being quoted, but quotes are not being carried to a decision — winnable revenue is expiring in silence.",
  deliver:
    "Winning work isn't the problem — keeping it moving predictably to done is where momentum breaks.",
  collect:
    "The work gets done, but the money doesn't follow it reliably — invoicing and chasing are leaking cash you've already earned.",
  control:
    "Supplier invoices, approvals and admin have no reliable home, so obligations stall and surprise you.",
  improve:
    "The business runs on firefighting — nothing converts today's problems into tomorrow's fixes.",
  lead:
    "There is no single morning picture of what needs attention, so the day is run by noise instead of priorities.",
};

const FIRST_ACTIONS: Record<JobKey, StarterAction[]> = {
  acquire: [
    {
      key: "seed:acquire:capture",
      title: "Capture every open enquiry in one place",
      detail:
        "Go through your phone, inbox and WhatsApp. Add every enquiry from the last 14 days as a lead — even the ones you think are dead.",
    },
    {
      key: "seed:acquire:reply",
      title: "Reply to every lead that never got an answer",
      detail:
        "A late reply beats no reply. Work the new list top to bottom today.",
    },
  ],
  convert: [
    {
      key: "seed:convert:list",
      title: "List every quote older than 7 days",
      detail:
        "Add each open quote so it appears here with its age. Anything unanswered for a week is at risk.",
    },
    {
      key: "seed:convert:call",
      title: "Call the three oldest open quotes",
      detail:
        "Not email — call. Ask for a decision. Won, lost or a date: any answer beats silence.",
    },
  ],
  deliver: [
    {
      key: "seed:deliver:late",
      title: "Write down every job that is running late",
      detail:
        "One list, one owner per job, one next step each. Late work you can see is late work you can move.",
    },
  ],
  collect: [
    {
      key: "seed:collect:overdue",
      title: "List every overdue invoice",
      detail:
        "Add each unpaid invoice with its due date. They'll be chased from here daily until they're paid.",
    },
    {
      key: "seed:collect:chase",
      title: "Chase the three largest overdue invoices today",
      detail:
        "Phone first, then confirm in writing. Log any promise to pay with a date — it will resurface here the day it falls due.",
    },
  ],
  control: [
    {
      key: "seed:control:suppliers",
      title: "Gather every unapproved supplier invoice into one place",
      detail:
        "Add each one here. From now on, approval is a daily action, not a pile.",
    },
  ],
  improve: [
    {
      key: "seed:improve:number",
      title: "Pick one number to watch weekly",
      detail:
        "Days-to-payment, quote age, or lead response time. Write down today's value — that's your baseline.",
    },
  ],
  lead: [
    {
      key: "seed:lead:morning",
      title: "Start tomorrow from this list",
      detail:
        "Open DueToday before your inbox. Finish the list. Go home.",
    },
  ],
};

const CAPABILITIES: Record<JobKey, string> = {
  acquire: "Reliable lead capture and same-day response",
  convert: "A quote follow-up rhythm that runs until every quote is decided",
  deliver: "Visible job ownership and an early signal for late work",
  collect: "Same-day invoicing and a daily collections routine",
  control: "One home for supplier invoices, approvals and dated admin",
  improve: "A weekly number and a route from repeated problem to fix",
  lead: "One owner-level action list, every morning",
};

const MODULE_NAMES: Record<string, string> = {
  leads: "DueToday Leads",
  collect: "DueToday Collect",
  docs: "DueToday Docs",
  core: "DueToday Core",
};

// ------------------------------------------------------------------ score

export function scoreAssessment(
  answers: Answers,
  industry: IndustryKey
): ScoredAssessment {
  const jobs: JobScore[] = JOBS.map((job) => {
    const dims = {} as Record<DimensionKey, number>;
    let sum = 0;
    for (const d of DIMENSIONS) {
      const v = answers[answerKey(job.key, d.key)] ?? 0;
      dims[d.key] = v;
      sum += v;
    }
    const score = Math.round(sum / DIMENSIONS.length);
    return { job: job.key, score, momentum: momentumOf(score), dimensions: dims };
  });

  const weightTotal = JOBS.reduce((s, j) => s + j.cashWeight, 0);
  const overall = Math.round(
    jobs.reduce((s, js) => s + js.score * jobByKey(js.job).cashWeight, 0) /
      weightTotal
  );

  // Priority: how far below healthy, weighted by cash impact.
  const ranked = [...jobs]
    .map((js) => ({
      js,
      pain: (100 - js.score) * jobByKey(js.job).cashWeight,
    }))
    .sort((a, b) => b.pain - a.pain);

  const bottlenecks: Bottleneck[] = ranked
    .filter(({ js }) => js.score < 70)
    .map(({ js }, i) => {
      const findings: Finding[] = DIMENSIONS.filter(
        (d) => js.dimensions[d.key] < 50
      ).map((d) => ({
        job: js.job,
        dimension: d.key,
        text: FINDINGS[js.job][d.key],
      }));
      return {
        job: js.job,
        score: js.score,
        momentum: js.momentum,
        impactRank: i + 1,
        summary: SUMMARIES[js.job],
        findings,
        firstActions: FIRST_ACTIONS[js.job].map((a) => a.title),
      };
    });

  const recommendations: Recommendation[] = bottlenecks
    .slice(0, 4)
    .map((b) => {
      const job = jobByKey(b.job);
      const routes: Recommendation["routes"] = [
        {
          label: "Fix it manually",
          detail: manualRoute(b.job),
        },
        {
          label: `Run it in ${MODULE_NAMES[job.module]}`,
          detail: moduleRoute(b.job),
        },
      ];
      const specialist = specialistRoute(b.job, industry);
      if (specialist) routes.push(specialist);
      return { job: b.job, capability: CAPABILITIES[b.job], routes };
    });

  // Starter actions: seeds from the top three bottlenecks + the lead habit.
  const seen = new Set<string>();
  const starterActions: StarterAction[] = [];
  for (const b of bottlenecks.slice(0, 3)) {
    for (const a of FIRST_ACTIONS[b.job]) {
      if (!seen.has(a.key)) {
        seen.add(a.key);
        starterActions.push(a);
      }
    }
  }
  for (const a of FIRST_ACTIONS.lead) {
    if (!seen.has(a.key)) starterActions.push(a);
  }

  const stuck = jobs.filter((j) => j.momentum === "stuck").length;
  const slowing = jobs.filter((j) => j.momentum === "slowing").length;
  const headline =
    stuck > 0
      ? `Work is stopping in ${stuck} of your seven execution jobs${
          slowing ? ` and slowing in ${slowing} more` : ""
        }. The findings below show exactly where — and what to do about it today.`
      : slowing > 0
        ? `Nothing is fully stuck, but momentum is slowing in ${slowing} of your seven execution jobs. Small, daily follow-up will recover it.`
        : `Your execution is strong across all seven jobs. The system below keeps it that way — one list, every morning.`;

  return { overall, jobs, bottlenecks, recommendations, starterActions, headline };
}

function manualRoute(job: JobKey): string {
  switch (job) {
    case "acquire":
      return "One shared lead list. Every enquiry lands on it the moment it arrives, and someone named replies the same day.";
    case "convert":
      return "A standing rule: every open quote is followed up every 3 days — phone, then written — until it's won or closed.";
    case "deliver":
      return "One board of active jobs, one name per job, and a five-minute morning check for anything running late.";
    case "collect":
      return "Invoice the day work finishes. Chase at 1, 7 and 14 days overdue. Log every promise to pay with a date.";
    case "control":
      return "One tray — physical or digital — for supplier invoices and admin. Cleared daily by a named person.";
    case "improve":
      return "One number on the wall, updated weekly. When the same problem happens twice, the process changes.";
    case "lead":
      return "Write tomorrow's list before you leave today. Six items or fewer. Money items first.";
  }
}

function moduleRoute(job: JobKey): string {
  switch (job) {
    case "acquire":
      return "Every lead captured with a timestamp; unanswered leads surface on your Today list until someone replies.";
    case "convert":
      return "Every open quote gets an automatic follow-up action on schedule until it's won, lost or expired — nothing ages silently.";
    case "deliver":
      return "Active work is visible with owners and dates, and late items surface each morning.";
    case "collect":
      return "Overdue invoices surface daily with escalating chase actions, and payment promises resurface the day they fall due.";
    case "control":
      return "Supplier invoices queue for approval and dated admin surfaces on the right day — nothing lives in a pile.";
    case "improve":
      return "Your weekly numbers come from real activity — response times, quote age, days overdue — not memory.";
    case "lead":
      return "One list every morning: leads to answer, quotes to chase, invoices to collect, admin to clear. Finish the list. Go home.";
  }
}

function specialistRoute(
  job: JobKey,
  industry: IndustryKey
): { label: string; detail: string } | null {
  if (industry === "property" && (job === "deliver" || job === "control")) {
    return {
      label: "Specialist: RentEase",
      detail:
        "Purpose-built for property operations — rent collection, lease renewals and maintenance follow-up on one daily rhythm.",
    };
  }
  if (industry === "healthcare" && job === "deliver") {
    return {
      label: "Specialist: RadFlow",
      detail:
        "Purpose-built for clinical workflow — report approvals, study reviews and billing follow-up without the bottlenecks.",
    };
  }
  if ((industry === "trades" || industry === "services") && job === "convert") {
    return {
      label: "Specialist: SoloBid",
      detail:
        "Purpose-built for quoting — produce, send and follow every quote to a decision.",
    };
  }
  return null;
}
