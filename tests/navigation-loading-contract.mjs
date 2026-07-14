import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/app/loading.tsx", "utf8");

assert(!source.includes("animate-pulse"), "App navigation loading state must not pulse or flicker");
assert(source.includes("bg-ledger"), "App navigation loading state should retain a visible progress signal");
assert(source.includes("aria-busy=\"true\""), "App navigation loading state must remain accessible");

console.log("Navigation loading stability contract passed");
