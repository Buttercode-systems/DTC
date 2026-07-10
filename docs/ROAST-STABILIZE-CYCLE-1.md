# DTC Roast + Stabilize Cycle 1

Date: 2026-07-09

## Current verdict

DTC is the strongest DueToday product base because it already has the full loop:

```text
landing
→ assessment
→ saved report
→ signup/auth
→ business provisioning
→ Today app
→ lead/quote/invoice records
→ action engine
→ daily clearable list
```

DueToday-Core remains useful as the framework/lab/reference, but DTC is closer to a product someone can actually use.

## What is strong

1. **Money-first positioning**

   The landing page leads with the painful problem: money lost because nobody followed up today. This is stronger than abstract framework language.

2. **35-question assessment**

   Seven jobs × five dimensions is clearer than a loose quiz. Each answer option is concrete and behavior-based.

3. **Assessment-to-product bridge**

   A report can lead into signup, and signup can provision a business from the assessment token.

4. **Actual Today product**

   The `/app` route runs a real action engine and shows open actions due today.

5. **Action engine is real**

   It derives actions from leads, quotes, invoices, recurring invoices, supplier approvals and payment promises. It also reconciles stale/snoozed actions.

6. **No service-role key in the app**

   Public assessment and provisioning use narrow RPC functions with Supabase RLS/security boundaries.

## Main risks

1. **No stability scripts before this cycle**

   The repo had `dev`, `build`, `start`, and `lint`, but no explicit `typecheck` or one-command verification script.

2. **No CI workflow committed**

   A CI workflow should run typecheck, lint and build on every PR. Creation of `.github/workflows/ci.yml` was blocked from this environment, so it must be added manually if desired.

3. **Engine writes on page load**

   `/app` runs the engine whenever the Today page opens. This is acceptable for MVP, but long-term it should become an explicit refresh/server action or scheduled job.

4. **Manual data entry bottleneck**

   The product works only after leads, quotes, invoices, customers and promises are captured. Onboarding/import is the next conversion risk.

5. **RPC/migration dependency needs verification**

   The app depends heavily on `submit_assessment`, `get_assessment`, and `provision_my_business`. These should be reviewed against the Supabase project before major traffic.

6. **No automated smoke tests**

   The critical path is currently not protected by tests:

   ```text
   assessment → report → signup → business provisioning → /app Today list
   ```

## Stabilization applied in this cycle

- Added `npm run typecheck`.
- Added `npm run verify` to run typecheck, lint and build.
- Added `.env.example` so the environment contract is explicit.
- Documented the current product verdict, risks and next hardening steps.

## Manual CI workflow to add later

If GitHub allows workflow commits manually, add this file:

```text
.github/workflows/ci.yml
```

With this content:

```yaml
name: DTC Verify

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    name: Typecheck, lint and build
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
      NEXT_PUBLIC_SUPABASE_ANON_KEY: test-anon-key
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
```

## Next stabilization cycle

1. Run `npm run verify` locally or in CI.
2. Fix any TypeScript, lint or build failures.
3. Review Supabase migrations/RPCs line by line.
4. Add smoke tests for the assessment-to-app path.
5. Improve onboarding so the first Today list does not feel empty.
6. Move engine writes off page load once the MVP behavior is proven.
