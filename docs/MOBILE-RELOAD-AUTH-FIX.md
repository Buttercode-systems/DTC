# Mobile Reload Auth Fix

Date: 2026-07-09

## Problem

On mobile Chrome, switching between mobile and desktop site can reload the current route. After sign-in, the browser may briefly or historically reload `/auth/signin`.

Before this fix, `/auth/signin` only supported POST. A GET reload returned `405 Method Not Allowed`, which Chrome surfaced as a generic:

```text
This page is not working
```

## Fix

`/auth/signin` now supports GET safely:

- if the user has a valid session, redirect to `/app` or the safe `next` path
- if the user has no session, redirect to `/login?next=/app`

This makes desktop/mobile view switching safe even if the browser reloads the auth endpoint.

## Related fixes

- PR #7 fixed Supabase auth cookies being attached to redirect responses.
- PR #8 fixed the mobile app shell and duplicate mobile navigation.
