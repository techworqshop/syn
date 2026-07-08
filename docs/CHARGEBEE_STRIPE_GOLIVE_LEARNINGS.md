# Chargebee + Stripe Go-Live: Failure Log & Fixes

**Context:** This document captures every real problem we hit taking a Next.js SaaS
(Syn / asksyn.com) from a **working Chargebee _test_ site** to a **live** Chargebee
site with a real Stripe gateway — and then migrating the whole PROD stack to a
dedicated server with its own n8n instance. Nothing here is theoretical; each item
actually broke in production or in end-to-end testing.

**Audience:** Johannes, for the Ratio setup (same stack: Next.js app + Chargebee
billing + Stripe gateway + n8n workflow backend behind a Caddy reverse proxy).

**TL;DR of the meta-lesson:** *A working test environment proves almost nothing about
live.* Test gateways are permissive, test sites share config, and half the failure
modes (3DS/SCA, CSP, real webhook auth, build-time public keys, sender verification,
tax compliance) only appear against the live gateway and a real bank. Budget a full
end-to-end test **on live** with a real card, and expect to fix things after the
"it works on test" milestone.

---

## A. Environment parity: test vs. live (build-time vs. run-time)

### A1. Public keys are baked at build time — not runtime
- **Symptom:** Card-entry fields (Chargebee hosted fields / Stripe.js) silently dead in
  production, though the same code worked in dev.
- **Root cause:** `NEXT_PUBLIC_*` env vars (e.g. `NEXT_PUBLIC_CHARGEBEE_SITE`,
  `NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY`) are inlined into the JS bundle **at build
  time**. They must be passed as Docker **build args**, not just runtime env. Our prod
  compose file was missing the `args:` block, so the bundle shipped with empty values.
- **Fix:** Add build args to the prod service and pass them through the Dockerfile
  (`ARG` → `ENV`). Verify by grepping the built bundle:
  `docker exec app sh -c "grep -rl 'live_...' /app/.next/static/chunks | head"`.
- **Lesson:** For any secret/config used in the browser, confirm it's a build arg and
  actually present in the compiled bundle. Runtime env is invisible to client code.

### A2. Billing silently disabled because server env was incomplete
- **Symptom:** No checkout possible on PROD; logs showed `billing disabled`.
- **Root cause:** The server-side Chargebee vars (`CHARGEBEE_SITE`, `CHARGEBEE_API_KEY`,
  webhook basic-auth creds) existed only in the dev env file, never in prod.
- **Fix:** Full env parity check — diff the *key names* of dev vs prod env files, not
  just eyeball them. Every key present in dev must be consciously present-or-omitted in
  prod, with a reason.
- **Lesson:** Do a `diff <(keys dev) <(keys prod)` as a required pre-go-live step.

### A3. Shared test site → cross-environment webhook poisoning
- **Symptom:** After wiring prod to the **same** Chargebee test site as dev, prod threw
  DB foreign-key errors and Chargebee entered a webhook **retry loop**.
- **Root cause:** Both environments received **all** events from the shared site. A
  subscription event for a dev-only customer hit prod, whose handler blindly tried to
  write a row referencing a non-existent user → FK violation → 500 → Chargebee retries
  forever.
- **Fix:** Guard the webhook handler: look up the customer/user locally first; if
  unknown, log and return 200 (skip), never 5xx. (Once each environment has its own
  live/test site this can't happen — but the guard is correct defensive code regardless.)
- **Lesson:** Webhook handlers must be **idempotent and tolerant of unknown entities**,
  and must return 2xx for "not my event" so the sender doesn't retry-storm you.

---

## B. Chargebee live-site activation (only the account owner can do these)

### B1. Payment gateway does NOT transfer with "copy configuration"
- **Symptom:** Live checkout returned `no_gateway_configured` / "You haven't configured
  any gateway", even though we used Chargebee's "transfer configuration from test to
  live" feature.
- **Root cause:** Gateway connections (Stripe/Mollie/…) are **never** part of a config
  transfer. They must be connected fresh on the live site.
- **Fix:** On the live site: Settings → Payment Gateways → connect Stripe via OAuth.
- **Lesson:** After any test→live config transfer, treat "connect gateway" and "verify
  payment methods" as separate mandatory steps.

### B2. Two live API keys are needed, plus a domain allowlist
- Full-access key (server), publishable key (browser). Different purposes, both required.
- **Domain allowlist:** The app's domain must be whitelisted in Chargebee for hosted
  fields / hosted pages to load. Missing this = fields won't render. UI-only setting.

### B3. Gateway payment-method config
- Enable **only Cards** for launch; enable **3D Secure** (mandatory in EU / SCA).
- Do NOT enable async methods (SEPA Direct Debit, iDEAL, Bancontact, SEPA Credit
  Transfer) at launch: they confirm days later and can bounce weeks later, but Chargebee
  activates the subscription immediately → the customer consumes paid resources before
  money is guaranteed. Only enable after the quota/entitlement logic is tested against
  the pending-payment state.
- Wallets (Apple/Google Pay) need extra live-mode activation + domain registration in
  Stripe — add them as a fast-follow, not in the first launch test.

---

## C. Payment method change on LIVE Stripe (the 3DS saga)

This was the single biggest rabbit hole. Four layered failures, each hidden behind the
previous one.

### C1. Tokenize-only card save fails on live
- **Symptom:** "Update payment method" → `payment source create failed`.
- **Root cause:** On the test gateway, saving a card via a temp token works. **Live
  Stripe requires 3D Secure / SCA authorization** — a tokenize-only flow with no
  challenge is rejected.
- **Fix:** Use a zero-amount **Payment Intent** + client-side `authorizeWith3ds` (the
  Chargebee JS/React wrapper), then create the payment source from the authorized
  intent. This runs the bank's 3DS challenge inline.

### C2. CSP blocks the gateway script
- **Symptom:** After switching to the 3DS flow: "Error loading gateway script".
- **Root cause:** Our own Content-Security-Policy allowed `js.chargebee.com` but not
  Stripe. The 3DS handler dynamically loads **Stripe.js** and calls Stripe's API and
  3DS challenge iframe.
- **Fix:** Add to CSP: `script-src ... https://js.stripe.com`,
  `connect-src ... https://api.stripe.com`,
  `frame-src ... https://js.stripe.com https://hooks.stripe.com`.
- **Lesson:** When the payment provider chains to a second provider's SDK, your CSP
  needs the second provider's origins too. Test the *card-change* flow, not just checkout
  (checkout used a hosted page and hid this).

### C3. Chargebee's legacy hosted "manage payment sources" renders as the old portal
- **Symptom:** After making the button open a Chargebee hosted page, the user landed in
  the generic customer-portal look, not the branded checkout look.
- **Root cause:** On PC 2.0 sites with an active portal, both `managePaymentSources` and
  `updatePaymentMethod` legacy hosted pages route into the portal UI.
- **Final decision:** Build the card update **in-app** in our own design using the 3DS
  payment-intent flow (C1). No redirect. This is the robust end state.

---

## D. Payment UX & billing-logic bugs (found only in live E2E)

### D1. Post-checkout sync race
- **Symptom:** After paying, user is redirected back to the plan-picker page; the new
  subscription only appears after a manual reload.
- **Root cause:** The Chargebee redirect returns to the app **before** the
  `subscription_created` webhook has been processed. The page rendered off stale local
  state (no subscription row yet).
- **Fix:** On the `?status=success` return, actively fetch the latest subscription from
  Chargebee's API and upsert it, instead of waiting for the webhook. (Webhook still runs;
  this just removes the race for the returning user.)
- **Lesson:** Never rely on webhook-before-redirect ordering. The success-return handler
  must self-heal by pulling state directly.

### D2. Proration shown as "negative VAT"
- **Symptom:** Upgrade confirmation modal showed a negative VAT line, confusing.
- **Root cause:** The modal derived VAT as (total − net) and stuffed the old-plan
  proration **credit** into the tax line.
- **Fix:** Read the estimate's real fields separately: net charge for the new plan, real
  tax, and a distinct **credit line** ("credit for unused old plan", shown negative in
  green). Now it reads: new plan prorated + VAT − credit = charged today.
- **Lesson:** Parse Chargebee estimate line items explicitly (`amount_due`, `sub_total`,
  `tax`, `credits_applied`); never back-compute tax from a total.

### D3. Per-second proration looks "wrong" but is correct
- Proration is time-exact (to the second), not per-day. An upgrade 90 minutes into a
  billing period charges ~99.8% of the plan difference. Not a bug — but make the modal
  copy say "for the remaining time of the period" (not "days"), or you'll get support
  tickets.

### D4. Bank declines surface as raw errors
- **Symptom:** Upgrade failed with `{"error":"switch failed"}` shown to the user.
- **Root cause:** Chargebee returned `payment_processing_failed` / `card_declined` (the
  bank declined the proration charge), passed through untranslated.
- **Fix:** Map `type: payment` / `payment_processing_failed` → friendly 402 message
  ("your bank declined … check the card or use another"). Same mapping on buy-extras.

### D5. Scheduled-change conflicts surface as 502
- **Symptom:** Trying to pause while a downgrade is already scheduled → raw 502.
- **Root cause:** Chargebee rejects a pause when a subscription change is scheduled;
  the error bubbled up as a generic gateway failure.
- **Fix:** Detect "scheduled" in the CB error → friendly 409 ("you have a scheduled
  change, revert it first"). Also added a **revert-scheduled** endpoint + a button in the
  "downgrade scheduled" banner, because there was no way to undo a scheduled change.

### D6. Stale scheduled fields never cleared
- **Symptom:** "Downgrade scheduled" banner stuck forever after the change was reverted
  in Chargebee.
- **Root cause:** Neither the webhook handler nor the reconcile cron cleared the local
  `scheduled_plan_item_price_id` when Chargebee reported `has_scheduled_changes: false`.
- **Fix:** Both paths now clear scheduled fields when CB reports none.
- **Lesson:** Local mirror of subscription state must be reconciled on **every** relevant
  event, including "the thing that was scheduled is gone".

### D7. Credit notes missing from the billing history
- **Symptom:** "Purchases & Invoices" showed invoices only; refunds/proration credits
  (credit notes) were invisible.
- **Fix:** Merge `creditNote.list` into the history, with a distinct badge and negative
  amount, and a separate credit-note PDF route.
- **Security bonus caught here:** the invoice-PDF route had **no ownership check** — any
  logged-in user could fetch any invoice PDF by ID (IDOR). Added a `customer_id` match
  before serving. **Audit every "fetch document by id" route for ownership.**

---

## E. Invoice & tax compliance (Germany — adapt per jurisdiction)

Legally required on a German B2B invoice with VAT; none were on the default template:

- **E1. Merchant VAT ID (USt-IdNr.):** NOT taken from Chargebee's "Business Profile".
  It must be set under Settings → Taxes → (region) → tax registration number. For a
  non-VAT-MOSS merchant: answer the MOSS question "No", then edit the country row
  (e.g. Germany) and enter the VAT ID there. Then it prints on invoices AND credit notes.
- **E2. Billing address required at checkout** — needed for a valid B2B invoice and for
  EU tax logic. Make it mandatory in checkout settings.
- **E3. Invoice number format** — decide the scheme (e.g. `SYN-YYYY-NNNN`) **before** real
  customers; changing it later fragments the sequence.
- **E4. Footer with legal identity** — managing directors, court + commercial-register
  number (HRB), registered seat. Set in Settings → Invoices → default notes/footer.
- **E5. VIES validation "cannot be determined"** — the EU VIES service is frequently
  down; Chargebee retries automatically. Not an error on your side. Verify the number
  directly against the VIES REST API if in doubt.
- **Verification trick:** Chargebee re-renders PDFs on every fetch, so pulling an
  existing invoice's PDF via API after fixing the template confirms the change applies
  retroactively.

---

## F. Error-handling UX patterns (generalizable)

- **F1. Never show raw JSON.** We had `{"error":"..."}` leaking into the UI in multiple
  places. Centralize a `readErr(response)` helper that extracts the `error` field and
  falls back to a generic message; route every fetch through it.
- **F2. Make error banners self-reveal.** A top-of-page error banner is invisible if the
  user is scrolled down. On setting an error, `scrollIntoView({behavior:"smooth"})` the
  banner.
- **F3. Errors belong where the action happened.** An error from a modal action must
  render **inside the modal**, not in a page banner the user can't see behind the modal.

---

## G. Email / notifications

- **G1. Customer receipts were off by default.** Chargebee's "Payment succeeded",
  "Refund succeeded", "Payment failed", "Subscription cancelled" notifications are
  separate toggles and were disabled. Enable the money-events; attach the invoice PDF.
- **G2. Refund emails need the RIGHT toggle.** Credit-note "manually created"
  notifications do NOT fire for refund-generated credit notes — enable "Refund
  successful" specifically (not "initiated", which double-mails and can misfire).
- **G3. Sender verification blocks all mail.** Changing the from-address to a new domain
  address requires verifying that mailbox (or connecting SMTP/OAuth). Until verified,
  Chargebee silently suppresses customer mail. Check Chargebee → Email Logs when mail
  "doesn't arrive".
- **G4. Kill the generic "Thanks for signing up" mail** if your app has its own
  onboarding — the default one even leaked the internal customer UUID.
- **G5. Stripe's own merchant notifications** ("Payment of X from Y") go to the Stripe
  account owner, not the customer — decide whether you want that inbox noise (nice as a
  live "cash register" ping early on; filter later).

---

## H. Server-migration-specific (n8n backend behind Caddy)

Relevant because Ratio uses the same n8n-backed architecture. These bit us when moving
PROD to a dedicated server + fresh n8n.

- **H1. Migrated DB credentials keep the OLD password.** We rotated the Postgres
  password on the new box, but the n8n **credential** (encrypted in the DB dump) still
  held the old one → workflow nodes failed with `password authentication failed`.
  Fix: `n8n export:credentials --decrypted`, rewrite the password, `n8n
  import:credentials` (same id → workflows unaffected). Don't hand-edit encrypted blobs.
- **H2. Webhooks not re-registered after an n8n restart.** The DB listed the webhooks as
  registered, but the runtime router returned 404 → sub-workflow calls failed. Fix:
  cycle every workflow (deactivate+activate) via the API after any n8n restart, then
  sweep-test each webhook path. **Make a post-restart webhook sweep a standard step.**
- **H3. Callback timeouts too short under load.** Internal HTTP callback nodes had a 15s
  timeout. Under parallel image-generation load the app responded slower than 15s, so
  the *caller* aborted even though the callback eventually succeeded. Raised to 60s.
- **H4. Reverse-proxy essentials for n8n ≥ 2.25:** set `N8N_PROXY_HOPS=1` (or the
  rate-limiter throws `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` and API calls die), and use
  `X-Frame-Options: SAMEORIGIN` (NOT `DENY`) on the n8n domain or the execution detail
  view (an iframe) never loads.
- **H5. Admin bypass masks quota tests.** Our quota gate bypasses admins by design.
  Testing "can I use the product without paying?" as an admin gives a false positive —
  always run the paywall test as a **non-admin** account.
- **H6. Kill the old environment once cutover is verified.** As long as the old prod
  stack + old workflows are still live, a missed stale reference *silently* keeps working
  against the old box, hiding the bug. We deliberately tore down the old PROD so that any
  overlooked old reference would fail loudly instead of quietly succeeding.

---

## I. Recommended go-live sequence (distilled)

1. Wire the app to the **test** site end-to-end (checkout, webhooks, quota) — this only
   proves plumbing, not live behavior.
2. Activate the **live** site: connect gateway, enable Cards + 3DS, whitelist domain,
   set up taxes (VAT ID!), invoice number format + footer, email notifications + sender.
3. Copy product catalog to live (IDs identical so code needs no change) and create the
   live webhook endpoint (with basic auth).
4. Swap the 4 env values (site + 2 keys server-side, publishable key as build arg) and
   rebuild.
5. **Full E2E on live with a real card:** buy → upgrade → downgrade → revert → pause →
   resume → cancel → reactivate → buy extras → change card (3DS!) → check invoices +
   credit notes + PDFs + emails. Refund everything after.
6. Keep signup closed until all of the above is green; opening signup is the very last
   flip.

---

## J. Code-level migration traps (hardcoded refs & type-safety)

These are pure code/definition issues (not config) that specifically bit us during the
server migration and the payment build-out. They're the ones most likely to *silently*
survive a migration or block a build.

### J1. Hardcoded old-environment fallbacks in the code
- **Symptom / risk:** After migration, some flows can silently talk to the **old** host
  even when everything looks correct.
- **Root cause:** Base-URL lookups written as
  `const base = process.env.PUBLIC_BASE_URL || "https://old-host.example"`. We had **12**
  such fallbacks across billing (`checkout`, `payment-update`, `portal`), the n8n
  `callback` route, `message`, `verify-email`, `forgot-password`, etc. If the env var is
  ever unset/misnamed on the new box, the code cheerfully uses the hardcoded old host —
  no error, wrong target.
- **Fix / rule for Ratio:** (a) Grep the whole repo for the old hostname before AND after
  migration — it must return **zero** hits in shipped code paths. (b) Prefer failing loud
  over a hardcoded fallback: `const base = requireEnv("PUBLIC_BASE_URL")` that throws at
  boot if missing, instead of `|| "https://old-host"`. A missing env should crash the
  container, not silently downgrade to the previous environment.

### J2. Hardcoded absolute hosts inside workflow (n8n) definitions
- **Symptom:** After migrating n8n, round execution hung / callbacks went to the old box
  even though the app was fully on the new host.
- **Root cause:** Workflow JSON embeds **absolute URLs**: the Gateway node had a callback
  fallback `... || 'https://old-host/api/n8n/callback'`, and RunRound's internal
  fan-out called sub-workflow webhooks at `https://old-n8n-host/webhook/...`. These live
  inside the node parameters, not in env, so an env swap doesn't touch them.
- **Fix:** After importing workflows to the new instance, scan every workflow's node JSON
  for the old host and rewrite (host + webhook paths), then **deactivate+activate** so the
  worker reloads the definition. Verify with a DB query:
  `SELECT name FROM workflow_entity WHERE nodes::text LIKE '%old-host%'` → must be empty.
- **Rule for Ratio:** Treat workflow definitions as code that contains environment
  coupling. A cross-environment promote MUST transform embedded hosts/paths, not just IDs.

### J3. Type-safety casts that mask required SDK fields → build breaks
- **Symptom:** `next build` failed (twice) during the 3DS work with e.g.
  `Argument of type 'Record<string, unknown>' is not assignable to parameter of type
  'CreateInputParam' … missing amount, currency_code` and later `… missing customer_id`.
- **Root cause:** We wrapped Chargebee SDK calls as
  `chargebee.paymentIntent.create({...} as unknown as Record<string, unknown>)`. The
  `as unknown as Record<string,unknown>` cast **erases the SDK's typed signature**, and on
  a strict build TypeScript then complains the object doesn't satisfy the real param type.
- **Fix:** Drop the cast and pass the object directly so the SDK's own types apply. Only
  cast individual fields when genuinely necessary — never blanket-cast a whole SDK payload
  through `unknown`.
- **Lesson:** Blanket `as unknown as X` casts are a smell; they defer errors to build or
  (worse) runtime. Let the library types do their job.

### J4. Handlers not threaded through nested component props
- **Symptom:** Build failed: `Cannot find name 'revertScheduled'`.
- **Root cause:** A new action handler was defined in the parent billing component, but the
  button lived in a nested sub-component (`PlanSwitcher`). The handler wasn't passed down as
  a prop, so the child couldn't see it.
- **Fix:** Thread the callback through the component's prop type + call site
  (`onRevertScheduled={revertScheduled}` → destructure in the child).
- **Lesson:** When adding an action to a nested presentational component, wire the prop
  chain (type → parent call site → child destructure) in the same change, or the build
  catches you.

### J5. Worker caches workflow definitions (n8n queue mode)
- **Symptom:** A fixed/edited workflow kept running its **old** behavior after the change
  was saved to the DB.
- **Root cause:** In n8n **queue mode**, the worker process caches the workflow definition;
  a DB write (or `patchNodeField`) doesn't reload it.
- **Fix:** After any workflow edit, **deactivate + activate** the workflow (re-publish) so
  the worker reloads. After an n8n **restart**, also re-cycle workflows and **sweep-test
  every webhook path** — the runtime router can report 404 while the DB says "registered".

_Last updated: 2026-07-06. Source: Syn (asksyn.com) go-live + server migration._
