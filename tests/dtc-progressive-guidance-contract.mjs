import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync("app/app/layout.tsx", "utf8");
const routeGuidance = readFileSync("components/DtcProgressiveGuidance.tsx", "utf8");
const hint = readFileSync("components/ProgressiveHint.tsx", "utf8");

assert.match(layout, /business\.platform_key === "duetoday"/);
assert.match(layout, /<DtcProgressiveGuidance businessId=\{business\.id\}/);
assert.doesNotMatch(routeGuidance, /service|departments|portal|operator|ops/);
assert.match(routeGuidance, /"\/app\/leads"/);
assert.match(routeGuidance, /"\/app\/quotes"/);
assert.match(routeGuidance, /"\/app\/invoices"/);
assert.match(routeGuidance, /"\/app\/report"/);
assert.match(hint, /window\.localStorage/);
assert.match(hint, /Don&apos;t show again/);
assert.doesNotMatch(hint, /animate-pulse|fixed inset-0|dialog/);

console.log("DTC progressive guidance contract passed");
