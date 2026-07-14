import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const baseURL = process.env.PERF_BASE_URL || "http://127.0.0.1:3000";
const url = process.env.API_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Local Supabase URL, anon key and service-role key are required");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const password = "Performance-Only-2026!";
const stamp = Date.now();
const emails = {
  due: `perf-due-${stamp}@example.test`,
  tad: `perf-tad-${stamp}@example.test`,
  operator: `perf-operator-${stamp}@example.test`,
  invited: `perf-invited-${stamp}@example.test`,
};

async function createUser(email, businessName) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { business_name: businessName },
  });
  if (error) throw error;
  return data.user;
}

async function signInClient(email) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error || new Error(`No session for ${email}`);
  return client;
}

async function rpc(client, fn, args = {}) {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
}

async function loginCookie(email, next = "/app") {
  const form = new URLSearchParams({ email, password, next });
  const response = await fetch(new URL("/auth/signin", baseURL), {
    method: "POST",
    body: form,
    redirect: "manual",
  });
  const setCookies = response.headers.getSetCookie?.() || [];
  if (!setCookies.length) throw new Error(`No auth cookie returned for ${email}; status=${response.status}`);
  return setCookies.map((value) => value.split(";", 1)[0]).join("; ");
}

await createUser(emails.due, "Performance DueToday");
await createUser(emails.tad, "Performance TAD Hybrid");
await createUser(emails.operator, "Performance Operator");
await createUser(emails.invited, "Performance Invitee");

const due = await signInClient(emails.due);
await rpc(due, "provision_my_business", { p_business_name: "Performance DueToday", p_assessment_token: null });
const dueBusinesses = await rpc(due, "list_accessible_businesses");
const dueBusinessId = dueBusinesses[0].id;

const tad = await signInClient(emails.tad);
await rpc(tad, "provision_my_business", { p_business_name: "Performance TAD Hybrid", p_assessment_token: null });
const tadBusinesses = await rpc(tad, "list_accessible_businesses");
const tadBusinessId = tadBusinesses[0].id;
await rpc(tad, "set_business_platform", { p_business_id: tadBusinessId, p_platform_key: "tad" });
await rpc(tad, "activate_all_tad_departments", { p_business_id: tadBusinessId, p_delivery_mode: "self_service" });
await rpc(tad, "set_tad_department_mode", {
  p_business_id: tadBusinessId,
  p_department: "invoice",
  p_delivery_mode: "managed",
  p_enabled: true,
});

const operator = await signInClient(emails.operator);
const operatorCookie = await loginCookie(emails.operator, "/hq");
const operatorClaim = await fetch(new URL("/hq", baseURL), {
  headers: { cookie: operatorCookie },
  redirect: "manual",
});
if (![200, 307].includes(operatorClaim.status)) throw new Error(`Operator claim failed with ${operatorClaim.status}`);
const operatorAllowed = await rpc(operator, "is_current_tad_operator");
if (!operatorAllowed) throw new Error("Operator claim route did not grant operator access");

const managed = await rpc(operator, "create_managed_business", {
  p_name: "Performance Managed Client",
  p_industry: "services",
  p_contact_name: "Performance Client",
  p_contact_email: emails.invited,
  p_department: "client",
  p_service_level: "managed",
});
const managedBusinessId = managed.business_id;

const invitation = await rpc(tad, "create_workspace_invitation", {
  p_business_id: tadBusinessId,
  p_email: emails.invited,
  p_role: "viewer",
});

const answers = {};
for (const job of ["acquire", "convert", "deliver", "collect", "control", "improve", "lead"]) {
  for (const dimension of ["process", "documented", "accountable", "measured", "reviewed"]) {
    answers[`${job}.${dimension}`] = 50;
  }
}
const assessmentResponse = await fetch(new URL("/api/assessment", baseURL), {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    answers,
    industry: "services",
    team_size: "2-5",
    lead: { full_name: "Performance Test", email: `perf-report-${stamp}@example.test`, company: "Performance" },
  }),
});
if (!assessmentResponse.ok) throw new Error(`Assessment fixture failed: ${assessmentResponse.status} ${await assessmentResponse.text()}`);
const { token: reportToken } = await assessmentResponse.json();

const cookies = {
  duetoday: await loginCookie(emails.due, "/app"),
  tad: await loginCookie(emails.tad, "/app"),
  operator: operatorCookie,
};

const fixtures = {
  routes: {
    "/app/departments/[department]": "/app/departments/invoice",
    "/invite/[token]": `/invite/${invitation.token}`,
    "/ops/client/[businessId]": `/ops/client/${managedBusinessId}`,
    "/report/[token]": `/report/${reportToken}`,
  },
  profiles: {
    public: { cookie: "" },
    duetoday: { cookie: cookies.duetoday },
    tad: { cookie: cookies.tad },
    operator: { cookie: cookies.operator },
  },
  routeProfiles: {
    "/app/account": "tad",
    "/app/departments": "tad",
    "/app/departments/[department]": "tad",
    "/app/service": "tad",
    "/app/team": "tad",
    "/portal": "tad",
    "/hq": "operator",
    "/operator": "operator",
    "/ops": "operator",
    "/ops/applications": "operator",
    "/ops/denied": "operator",
    "/ops/workflows": "operator",
    "/ops/client/[businessId]": "operator"
  },
  prefixes: {
    "/app": "duetoday",
    "/start": "duetoday"
  },
  expectedStatuses: {
    "/_not-found": [404]
  },
  metadata: { dueBusinessId, tadBusinessId, managedBusinessId },
};

mkdirSync("tests/performance", { recursive: true });
writeFileSync("tests/performance/generated-fixtures.json", `${JSON.stringify(fixtures, null, 2)}\n`);
console.log(JSON.stringify({ dueBusinessId, tadBusinessId, managedBusinessId, reportToken, invitationToken: invitation.token }));
