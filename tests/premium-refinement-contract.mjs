import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pipeline = await readFile("app/app/pipeline/page.tsx", "utf8");
const leads = await readFile("app/app/leads/page.tsx", "utf8");
const layout = await readFile("app/app/layout.tsx", "utf8");
const standard = await readFile("docs/PREMIUM_REFINEMENT_STANDARD.md", "utf8");

assert.match(pipeline, /if \(leadsResult\.error\)/, "Pipeline must fail explicitly when leads cannot load");
assert.match(pipeline, /if \(quotesResult\.error\)/, "Pipeline must fail explicitly when quotes cannot load");
assert.match(pipeline, /if \(invoicesResult\.error\)/, "Pipeline must fail explicitly when invoices cannot load");
assert.match(pipeline, /Open Today/, "Pipeline must lead users back to the action queue");
assert.match(leads, /waiting for a first response/, "Lead page must explain the active commitment");
assert.match(leads, /Save outcome/, "Lead status changes must use outcome language");
assert.match(layout, /business\.platform_key === "duetoday"/, "DTC-only additions must retain the platform boundary");
assert.match(standard, /No refinement may alter TAD SaaS, Managed, Hybrid/, "The standard must preserve all TAD operating modes");

console.log("Premium refinement contract passed");
