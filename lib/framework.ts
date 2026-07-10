// ---------------------------------------------------------------------------
// Business Execution Framework v1.0
// The intellectual core of DueToday. Seven jobs every business must do,
// each measured on five dimensions. Every question diagnoses a process,
// never an opinion. Every answer maps to a specific finding and action.
// ---------------------------------------------------------------------------

export type JobKey =
  | "acquire"
  | "convert"
  | "deliver"
  | "collect"
  | "control"
  | "improve"
  | "lead";

export type DimensionKey =
  | "process"
  | "documented"
  | "accountable"
  | "measured"
  | "reviewed";

export const DIMENSIONS: { key: DimensionKey; label: string }[] = [
  { key: "process", label: "Defined process" },
  { key: "documented", label: "Written down" },
  { key: "accountable", label: "Owned by someone" },
  { key: "measured", label: "Measured" },
  { key: "reviewed", label: "Reviewed" },
];

export interface AnswerOption {
  score: 0 | 25 | 50 | 75 | 100;
  text: string;
}

export interface Question {
  job: JobKey;
  dimension: DimensionKey;
  text: string;
  options: AnswerOption[]; // ordered worst → best
}

export interface Job {
  key: JobKey;
  verb: string; // one-word framework name
  label: string; // owner-language name
  question: string; // the owner-language question this job answers
  cashWeight: number; // how directly this job moves cash
  module: "leads" | "collect" | "docs" | "core";
}

export const JOBS: Job[] = [
  {
    key: "acquire",
    verb: "Acquire",
    label: "Getting customers",
    question: "Do new enquiries get captured and answered fast?",
    cashWeight: 1.2,
    module: "leads",
  },
  {
    key: "convert",
    verb: "Convert",
    label: "Winning work",
    question: "Do quotes get followed until they are won or closed?",
    cashWeight: 1.4,
    module: "collect",
  },
  {
    key: "deliver",
    verb: "Deliver",
    label: "Delivering work",
    question: "Does accepted work move to done without stalling?",
    cashWeight: 1.0,
    module: "core",
  },
  {
    key: "collect",
    verb: "Collect",
    label: "Getting paid",
    question: "Do invoices go out on time and get chased until paid?",
    cashWeight: 1.5,
    module: "collect",
  },
  {
    key: "control",
    verb: "Control",
    label: "Staying organised",
    question: "Do supplier invoices, approvals and admin have a home?",
    cashWeight: 1.1,
    module: "docs",
  },
  {
    key: "improve",
    verb: "Improve",
    label: "Improving",
    question: "Do repeated problems turn into permanent fixes?",
    cashWeight: 0.8,
    module: "core",
  },
  {
    key: "lead",
    verb: "Lead",
    label: "Knowing what needs attention",
    question: "Does the day start with one clear list of what matters?",
    cashWeight: 1.0,
    module: "core",
  },
];

const ladder = (
  job: JobKey,
  dimension: DimensionKey,
  text: string,
  o0: string,
  o25: string,
  o50: string,
  o75: string,
  o100: string
): Question => ({
  job,
  dimension,
  text,
  options: [
    { score: 0, text: o0 },
    { score: 25, text: o25 },
    { score: 50, text: o50 },
    { score: 75, text: o75 },
    { score: 100, text: o100 },
  ],
});

export const QUESTIONS: Question[] = [
  // ------------------------------------------------------------- ACQUIRE
  ladder(
    "acquire",
    "process",
    "A new enquiry arrives — a call, a WhatsApp, an email, a walk-in. What happens to it?",
    "It stays wherever it landed: someone's phone, an inbox, a memory.",
    "We usually write it down somewhere, but not in one place.",
    "Most leads end up on one list, but not all of them.",
    "Every lead goes onto one list, though not always immediately.",
    "Every lead is captured in one place the moment it arrives."
  ),
  ladder(
    "acquire",
    "documented",
    "If a new person had to handle enquiries tomorrow, what would you hand them?",
    "Nothing — they'd shadow someone and figure it out.",
    "A quick verbal briefing.",
    "Some notes exist, but they're out of date.",
    "A written process that covers most situations.",
    "A short written process anyone can follow on day one."
  ),
  ladder(
    "acquire",
    "accountable",
    "Who is responsible for replying to new leads?",
    "Nobody specific — whoever sees it first.",
    "It defaults to the owner, along with everything else.",
    "One person, informally.",
    "One named person, with a backup when they're out.",
    "A named owner with a response-time target they're held to."
  ),
  ladder(
    "acquire",
    "measured",
    "Yesterday, how many new enquiries waited more than two hours for a reply?",
    "No idea — we have no way to see that.",
    "We could work it out, but nobody does.",
    "We check occasionally, when it feels slow.",
    "We look at response times most weeks.",
    "We know the answer same-day, every day."
  ),
  ladder(
    "acquire",
    "reviewed",
    "How often do you look at where leads come from and why you lose them?",
    "Never — lost leads just disappear.",
    "Only when a big one gets away.",
    "A few times a year.",
    "Most months.",
    "Every week, and it changes what we do."
  ),

  // ------------------------------------------------------------- CONVERT
  ladder(
    "convert",
    "process",
    "A quote hasn't been accepted after seven days. What happens?",
    "Nothing, unless the customer comes back to us.",
    "We follow up if someone happens to remember.",
    "We follow up when the pile gets big enough to worry us.",
    "We follow up most quotes within a set number of days.",
    "Every open quote is followed on a set schedule until it's won or closed."
  ),
  ladder(
    "convert",
    "documented",
    "Is there a written way quotes are prepared, sent and followed up?",
    "No — everyone quotes their own way.",
    "There's a template for the document, nothing for the follow-up.",
    "Partly written, but people work around it.",
    "Written and mostly followed.",
    "Written, followed, and updated when we learn something."
  ),
  ladder(
    "convert",
    "accountable",
    "After a quote leaves the business, who owns it until it's won or lost?",
    "Nobody — it's the customer's move.",
    "The owner, in theory, along with everything else.",
    "Whoever sent it, informally.",
    "A named person for most quotes.",
    "Every quote has a named owner and a next follow-up date."
  ),
  ladder(
    "convert",
    "measured",
    "Right now: how many open quotes do you have, and how old is the oldest?",
    "I couldn't tell you either number.",
    "I could find out, but it would take digging.",
    "I know roughly how many, not how old.",
    "I know both, give or take.",
    "I can see both numbers in under a minute."
  ),
  ladder(
    "convert",
    "reviewed",
    "How many quotes expired last month without anyone chasing them?",
    "No idea — expired quotes vanish silently.",
    "Probably some; we've never counted.",
    "We notice the big ones.",
    "We review expired quotes most months.",
    "Zero expire unchased — every one gets a decision."
  ),

  // ------------------------------------------------------------- DELIVER
  ladder(
    "deliver",
    "process",
    "Work is accepted. How does it move from 'won' to 'done'?",
    "Each job unfolds its own way — there's no set path.",
    "There's a rough routine in people's heads.",
    "A set path exists for some kinds of work.",
    "Most work follows defined steps.",
    "Every job follows defined steps from start to handover."
  ),
  ladder(
    "deliver",
    "documented",
    "Are the steps for delivering your work written anywhere?",
    "No — it lives in people's heads.",
    "Bits and pieces, scattered around.",
    "The critical steps are written.",
    "Most of it is written and findable.",
    "Written, current, and used to train people."
  ),
  ladder(
    "deliver",
    "accountable",
    "For each active job right now, is there one named person responsible?",
    "No — jobs belong to everyone and no one.",
    "The owner carries all of them.",
    "The big jobs have owners; the rest float.",
    "Almost every job has a named owner.",
    "Every job has one name on it, visible to the team."
  ),
  ladder(
    "deliver",
    "measured",
    "Do you know, today, which jobs are running late?",
    "Only when a customer phones to complain.",
    "I'd have to ask around to find out.",
    "I know about the ones I'm personally close to.",
    "I can see most of it with a bit of effort.",
    "I can see every late job at a glance."
  ),
  ladder(
    "deliver",
    "reviewed",
    "When a job finishes, does anyone look at how it went?",
    "Never — we're straight onto the next one.",
    "Only when something went badly wrong.",
    "Occasionally, informally.",
    "For most significant jobs.",
    "Routinely — and the lessons change how we work."
  ),

  // ------------------------------------------------------------- COLLECT
  ladder(
    "collect",
    "process",
    "Work is finished. When does the invoice go out?",
    "When someone gets around to it — sometimes weeks later.",
    "Usually within a week or two.",
    "Within a few days, most of the time.",
    "Within a day or two, almost always.",
    "The same day, every time."
  ),
  ladder(
    "collect",
    "documented",
    "Is there a written sequence for chasing an unpaid invoice — what happens at 1 day, 7 days, 14 days overdue?",
    "No — chasing is improvised each time.",
    "There's an unwritten habit some people follow.",
    "A sequence exists on paper but isn't followed.",
    "A written sequence, followed most of the time.",
    "A written sequence, followed every time, without exception."
  ),
  ladder(
    "collect",
    "accountable",
    "Who chases overdue invoices?",
    "Nobody — until cash gets tight, then it's a panic.",
    "The owner, when there's time.",
    "One person, when they remember.",
    "One named person, most weeks.",
    "A named person who chases every overdue invoice daily."
  ),
  ladder(
    "collect",
    "measured",
    "Right now: do you know exactly who owes you money, how much, and how overdue?",
    "No — I'd be guessing.",
    "I know the big ones.",
    "I could pull it together in an hour.",
    "I can see it with a little effort.",
    "I can see the full picture in under a minute."
  ),
  ladder(
    "collect",
    "reviewed",
    "A customer promises to pay on Friday. Friday passes with no payment. What happens?",
    "Usually nothing — promises aren't tracked.",
    "We follow up if someone remembers the promise.",
    "We catch it the next time we review debtors.",
    "Most promises get checked within a few days.",
    "Every promise is logged with a date and checked the day it falls due."
  ),

  // ------------------------------------------------------------- CONTROL
  ladder(
    "control",
    "process",
    "Where do supplier invoices and admin tasks live?",
    "Everywhere — email, WhatsApp, paper piles, memory.",
    "Mostly in one inbox, unsorted.",
    "In one place for suppliers, scattered for admin.",
    "One place for nearly everything.",
    "One place for everything, checked daily."
  ),
  ladder(
    "control",
    "documented",
    "Is there a written rule for how a supplier invoice gets approved and paid?",
    "No — it depends who's asked on the day.",
    "There's a habit, not a rule.",
    "A rule exists but gets bypassed.",
    "A written rule, mostly followed.",
    "A written rule every invoice follows, no exceptions."
  ),
  ladder(
    "control",
    "accountable",
    "Who checks what admin is due — returns, renewals, compliance, subscriptions?",
    "Nobody, until a deadline is missed.",
    "The owner, whenever it surfaces.",
    "One person, informally.",
    "A named person with a monthly routine.",
    "A named person working from a dated list, weekly."
  ),
  ladder(
    "control",
    "measured",
    "Do you know what admin and supplier payments are due this week?",
    "No — things surprise us.",
    "Some of it; the rest surfaces late.",
    "Most of it, from memory.",
    "Nearly all of it, from a list.",
    "All of it, from one list with dates."
  ),
  ladder(
    "control",
    "reviewed",
    "Recurring commitments — rent, subscriptions, contracts, renewals. When were they last reviewed?",
    "Never, as far as I know.",
    "Years ago.",
    "Sometime in the last year.",
    "In the last quarter.",
    "They're reviewed on a schedule, and we cancel what we don't need."
  ),

  // ------------------------------------------------------------- IMPROVE
  ladder(
    "improve",
    "process",
    "The same problem happens twice. What turns it into a permanent fix?",
    "Nothing — we firefight it each time.",
    "Someone might mention it; usually it repeats.",
    "Big problems get fixed; small ones repeat.",
    "Most repeated problems get a fix eventually.",
    "There's a route: problem noticed → cause found → process changed."
  ),
  ladder(
    "improve",
    "documented",
    "When you fix how something is done, does the fix get written into how you work?",
    "No — fixes live in the fixer's head.",
    "Rarely.",
    "Sometimes, for the big ones.",
    "Usually.",
    "Always — the written process is updated the same week."
  ),
  ladder(
    "improve",
    "accountable",
    "Is anyone responsible for making the business run better, not just keeping it running?",
    "No — everyone is flat out on today.",
    "The owner, in stolen moments.",
    "It's part of someone's job on paper.",
    "Someone owns it and acts on it monthly.",
    "Someone owns it with dedicated time every week."
  ),
  ladder(
    "improve",
    "measured",
    "Do you track any number week-on-week — response time, quote age, days overdue, jobs late?",
    "No numbers are tracked.",
    "We look at the bank balance.",
    "One or two numbers, occasionally.",
    "A few numbers, most weeks.",
    "A small set of numbers, every week, trend visible."
  ),
  ladder(
    "improve",
    "reviewed",
    "Is there regular time set aside to look at how the business ran — not the work itself, the running of it?",
    "Never — there's no time.",
    "Once or twice a year, in a crisis.",
    "Quarterly, roughly.",
    "Monthly.",
    "Weekly, short and consistent."
  ),

  // ------------------------------------------------------------- LEAD
  ladder(
    "lead",
    "process",
    "It's 07:00. How do you know what needs attention today?",
    "It's all in my head, and some of it isn't.",
    "Scattered lists, an inbox, and WhatsApp.",
    "One list exists, but it isn't maintained daily.",
    "A daily list, but money items — quotes, invoices, leads — slip past it.",
    "One list every morning covering leads, quotes, invoices and admin."
  ),
  ladder(
    "lead",
    "documented",
    "Can your team see today's priorities written down somewhere shared?",
    "No — priorities travel by word of mouth.",
    "Sometimes, in a group chat.",
    "Written, but only the owner sees them.",
    "Written and shared most days.",
    "Written, shared, and visible to everyone every morning."
  ),
  ladder(
    "lead",
    "accountable",
    "Are today's actions assigned to named people with dates?",
    "No — things get done by whoever grabs them.",
    "Verbally assigned; nothing sticks.",
    "Assigned, but without dates.",
    "Assigned with dates, mostly.",
    "Every action has one name and one date."
  ),
  ladder(
    "lead",
    "measured",
    "At the end of the day, do you know what got done and what slipped?",
    "No — days just end.",
    "I have a feeling, not a picture.",
    "I know the big items.",
    "I can see most of it.",
    "I can see exactly what closed and what carried over."
  ),
  ladder(
    "lead",
    "reviewed",
    "Once a week, does anyone ask: what's stuck, and why?",
    "Never.",
    "Only when something blows up.",
    "Sometimes, informally.",
    "Most weeks.",
    "Every week, same time, and stuck items get unstuck."
  ),
];

export const INDUSTRIES = [
  { key: "trades", label: "Trades & construction" },
  { key: "services", label: "Professional services & consulting" },
  { key: "hospitality", label: "Hospitality & food" },
  { key: "retail", label: "Retail & e-commerce" },
  { key: "property", label: "Property & rentals" },
  { key: "healthcare", label: "Healthcare & imaging" },
  { key: "agriculture", label: "Agriculture" },
  { key: "other", label: "Something else" },
] as const;

export const TEAM_SIZES = [
  { key: "solo", label: "Just me" },
  { key: "2-5", label: "2–5 people" },
  { key: "6-20", label: "6–20 people" },
  { key: "21+", label: "More than 20" },
] as const;

export type IndustryKey = (typeof INDUSTRIES)[number]["key"];
export type TeamSizeKey = (typeof TEAM_SIZES)[number]["key"];

export function questionsForJob(job: JobKey): Question[] {
  return QUESTIONS.filter((q) => q.job === job);
}

export function jobByKey(key: JobKey): Job {
  const job = JOBS.find((j) => j.key === key);
  if (!job) throw new Error(`Unknown job: ${key}`);
  return job;
}
