# Billing Logic Specification & Edge-Case Compendium

*Behavioral spec for the Syn billing module — a playbook of business rules, state transitions, and pitfalls discovered during development. Use as a reference before writing the same module for Ratio.*

---

## Part 1 — Core Design Principles

These hold throughout the entire module. Build everything else on top.

### 1.1 — Hybrid, not pure-embedded, not pure-portal

| Concern | Where it lives |
|---|---|
| Source of truth for subscription state | **Chargebee** (we mirror to our DB via webhooks) |
| Source of truth for usage / quota / consumption | **Our DB** (Chargebee doesn't know our domain) |
| UI for first-time checkout | **Chargebee Hosted Page** (redirect-out, redirect-back) |
| UI for everything afterward | **Our app, embedded** (own design, no portal) |

**Rule:** never let users see the Chargebee Self-Service Portal. It is generic and uncustomizable. Embed everything, use Chargebee API directly.

### 1.2 — Every money-touching action requires explicit confirmation

**When-If rule:**
> *If* an action will cause an immediate charge OR change a scheduled future charge OR cancel/pause/resume a subscription,
> *then* the user must see a confirmation modal showing the financial consequence (amount, effective date, net/VAT/total breakdown) and click a button containing the price.

No exceptions. Plan-click never charges. Pause-click never pauses. Modal is mandatory.

This is also a legal requirement in DE (§312j BGB "Buttonsuart-Compliance"): the button that triggers payment must contain the words "kostenpflichtig" + amount.

### 1.3 — Status-driven UI, never option-driven

**When-If rule:**
> *If* a feature is unavailable in the current subscription state,
> *then* hide it OR show a contextual banner explaining what to do — never show a generic "this didn't work" error after the click.

The user shouldn't be able to click "Pause" if the sub is `unpaid`. Plan-switcher cards shouldn't be tappable if the sub is `paused`-but-readonly. Pre-compute permissibility from status; gray things out proactively.

### 1.4 — Webhook is eventually-consistent. Mirror, don't trust.

**When-If rule:**
> *If* you receive a webhook,
> *then* (a) dedupe by `event_id`, (b) re-fetch the resource from Chargebee API rather than trusting payload fields, (c) compute the DB write from the freshly-fetched object.

Spoofed/replayed/out-of-order webhooks happen. Treat payload as a "you should look at this resource now" hint, not as truth.

### 1.5 — Optimistic UI updates allowed, but only the user-visible state

**When-If rule:**
> *If* a user-initiated action succeeds at the Chargebee API,
> *then* write the obvious state to our DB synchronously (e.g. `status = non_renewing` after cancel) and reload the UI; *but* defer all derived fields to the webhook.

Optimistic write avoids 1–3s flicker. Webhook later corrects anything we got wrong.

### 1.6 — Locale-aware everything

**When-If rule:**
> *If* a price, date, or number is rendered,
> *then* use `Intl.NumberFormat`/`Intl.DateTimeFormat` keyed off the user's locale. Never `.toFixed()`, never hand-formatted strings.

DE uses `3.360,00 €`, EN uses `€3,360.00`. Both must work without code changes per-locale.

---

## Part 2 — Subscription Lifecycle Rules

### 2.1 — Status taxonomy (Chargebee-native)

| Status | Means | Quota-applicable? | Mutable? |
|---|---|---|---|
| `future` | Scheduled to start later | no | limited |
| `in_trial` | Active trial, may convert | yes | yes |
| `active` | Paid, current, renewing | yes | yes |
| `non_renewing` | Cancelled but term not yet ended | yes | yes (incl. resume) |
| `paused` | Temporarily suspended | no | resume only |
| `unpaid` | Payment failed, in dunning | no (frozen) | payment-method only |
| `cancelled` | Fully terminated | no | re-checkout only |

### 2.2 — Two derived UI flags

```
hasActiveSub       = status in {active, in_trial, non_renewing}   → grants base quota
hasManageableSub   = status in {active, in_trial, non_renewing, paused, unpaid}  → routes to PlanSwitcher
```

**When-If rule:**
> *If* `hasManageableSub` is true, render the management UI (PlanSwitcher, banners, action row).
> *If* false, render the Plan-Picker (initial-checkout flow).

This was a bug in Syn: we conflated these two flags, and a paused user saw the Plan-Picker as if they had no subscription. Two separate flags fix it.

### 2.3 — Transition matrix

```
inactive ──checkout──> in_trial ──trial_end──> active

active ──cancel(end_of_term)──> non_renewing ──term_end──> cancelled
non_renewing ──resume_cancel──> active

active ──pause(end_of_term)──> active (until term_end) ──term_end──> paused
paused ──resume_date──> active (auto)
paused ──resume_now──> active

active ──payment_fails──> unpaid ──dunning_succeeds──> active
unpaid ──dunning_exhausted──> cancelled
```

### 2.4 — Status-transition rules (when-if)

**When-If:** *If* user clicks Cancel during `active`, *then* schedule cancel for `current_term_end`. Sub stays `active` until then. Status flips to `non_renewing` at end-of-term (via webhook).

**When-If:** *If* user clicks Pause during `active`, *then* schedule pause for `current_term_end`. Sub stays `active` until then. Status flips to `paused` at end-of-term.

**Rule of thumb:** every "schedule X for end of term" leaves the sub in its current state UNTIL Chargebee fires the corresponding webhook. Don't optimistically flip status to the eventual state — the user hasn't paid for that yet.

---

## Part 3 — Plan Changes (Upgrade / Downgrade / Cycle-Switch)

This is the hairiest area. Read carefully.

### 3.1 — Three change types, each with different mechanics

| Type | Trigger | Mechanics | Charge |
|---|---|---|---|
| **Tier-Upgrade** | new tier > current tier (e.g. Basic→Pro) | immediate (`end_of_term=false`), prorated | difference for remaining period |
| **Tier-Downgrade** | new tier < current tier (e.g. Pro→Basic) | scheduled (`end_of_term=true`) | none today, new plan starts next period |
| **Cycle-Switch up** | same tier, monthly→yearly | immediate, prorated | difference, basically full yearly minus credit for unused monthly |
| **Cycle-Switch down** | same tier, yearly→monthly | scheduled (end_of_term=true) | none today, monthly starts next period |

**When-If for direction detection:**
```
direction = !currentPlan                          → "upgrade"     (first checkout, not really)
          : sameTier && cycle === "yearly"        → "upgrade"     (cycle-up)
          : sameTier && cycle === "monthly"       → "downgrade"   (cycle-down)
          : newPriceEur > currentPriceEur         → "upgrade"
          : newPriceEur < currentPriceEur         → "downgrade"
```

**The bug we hit:** initial implementation classified cycle-switches at the same tier as `same` (no-op), and the modal body rendered blank. Treating any cycle switch at same tier as an upgrade-or-downgrade is the fix.

### 3.2 — Preview-before-execute pattern

**When-If rule:**
> *If* the user clicks a plan card,
> *then* (a) fetch a Chargebee estimate via `estimate.updateSubscriptionForItems` to compute exact proration, (b) open a confirmation modal showing direction, amount, effective date, and (c) require an explicit click on a price-containing button before executing.

The preview endpoint never touches Chargebee state. The execute endpoint requires `confirmedDirection` in the payload — if it doesn't match what the server computes (because of a stale UI), reject with 409 "direction mismatch — please reload". Defense against UI race conditions.

### 3.3 — Scheduled-downgrade tracking

When a downgrade is scheduled, Chargebee remembers it but doesn't show the future state in the standard `subscription.retrieve` response. We mirror it locally:

```
subscriptions.scheduled_plan_item_price_id  (the future plan)
subscriptions.scheduled_change_at           (when it kicks in, = current_term_end)
```

**Webhook cleanup rule:** when a `subscription_renewed`/`subscription_changed` webhook fires AND the new `plan_item_price_id` equals the previously-stored `scheduled_plan_item_price_id`, null out both scheduled fields. The downgrade is applied.

### 3.4 — Plan-switch × cancel/pause interaction (THE EDGE CASES)

**Case A:** User has a pending downgrade. User clicks Cancel.

**Rule:** Before scheduling the cancel in Chargebee, call `chargebee.subscription.removeScheduledChanges()`. Then schedule the cancel. The downgrade is dropped — cancel takes priority. Also null out our local `scheduled_plan_item_price_id`.

**Why:** if you leave both scheduled, Chargebee will apply the downgrade first (at term-end) and then the cancel. So at term-end the user is briefly on Basic, then it's cancelled. Confusing and incorrect from user perspective.

**Case B:** User cancelled (`non_renewing`). User then clicks a different plan card to upgrade/switch.

**Rule:** Before calling `updateForItems`, call `chargebee.subscription.removeScheduledCancellation()`. Then do the plan-switch normally. User implicitly reactivated.

**Why:** otherwise `updateForItems` either errors out (Chargebee refuses to upgrade a cancelling sub) or queues a change for a sub that's about to be cancelled.

**Case C:** User has a pending downgrade. Banner says "Downgrade scheduled". User cancels. Now status is `non_renewing` AND scheduled-fields point to the (now-aborted) downgrade plan.

**UI rule:** banner-priority is `non_renewing > scheduled-downgrade`. Show only the cancellation banner. Suppress the scheduled-downgrade banner when status is `non_renewing`.

**Case D:** User upgrades successfully. They had a pending downgrade.

**Rule:** Same as Case A — `removeScheduledChanges` first, then `updateForItems(end_of_term=false)`. The upgrade replaces both the current plan AND the pending downgrade.

### 3.5 — Downgrade limit warning

**When-If rule:**
> *If* the direction is `downgrade` AND `current_slots_in_use > new_plan.included_sessions`,
> *then* in the confirmation modal show a yellow warning: "You've already used X sessions this period. The new plan only includes Y/month. You'll need extras for additional sessions once the downgrade takes effect."

Soft warning, not blocking. The user might know what they're doing.

---

## Part 4 — Quota & Extras

### 4.1 — Period-based reset, no cron job

**Rule:** `session_consumptions` rows reference the specific `period_start` they were consumed in. The quota query filters by `period_start = sub.current_term_start`. When Chargebee renews the sub, `current_term_start` shifts forward, and all the old consumption rows naturally fall out of the query.

No nightly cron, no transactional reset. The reset emerges from the data model.

### 4.2 — Base-first, then FIFO credits

**When-If rule for consuming a session:**
```
if base_quota_remaining > 0:
    consume from base, increment base_used
else:
    pick the oldest non-expired purchased_extras row (ORDER BY expires_at ASC)
    decrement its quantity_used
    link the consumption to that credit_id
```

This means base quota burns first (use what you paid for monthly), then extras (longest-expiring first to prevent waste).

### 4.3 — Extras-bought via separate one-time charge

**When-If:** *If* user clicks "Buy 5 extras", *then* immediately Chargebee-charge them at the per-overage rate × quantity × 1.19 (VAT). Show a confirmation modal first with full breakdown.

Extras are valid 12 months from purchase (`expires_at = created_at + 365 days`). NOT tied to billing period. Even if the sub is cancelled, extras remain usable until they expire.

### 4.4 — Extras survive cancel

**Rule:** the quota loader checks `extras_available` independently of subscription status. A cancelled-with-extras user can still create sessions until extras run out.

This requires `canCreateSession` logic to check `total_quota` (= base + extras) rather than `hasActiveSub`.

### 4.5 — First-message semantics for slot allocation

**When-If rule:**
> *If* a session is created (draft), it does NOT consume a quota slot.
> *If* the user sends the first message in that session, *then* atomically (`WHERE first_message_at IS NULL`) mark the session as "started" and allocate a quota slot.

Why: users create-then-abandon sessions all the time. Charging them per-creation would be hostile. Charge on first-message = first real use.

Atomic update prevents double-allocation when the user double-clicks.

---

## Part 5 — Cancel / Resume / Pause / Reactivate

### 5.1 — Cancel logic

```
POST /api/billing/cancel
  if sub.scheduled_plan_item_price_id:
      chargebee.subscription.removeScheduledChanges(subId)
  chargebee.subscription.cancelForItems(subId, end_of_term=true)
  db.update: status="non_renewing", scheduled_plan_item_price_id=null, scheduled_change_at=null
```

### 5.2 — Resume cancel logic (undo cancel before term-end)

```
POST /api/billing/resume-cancel
  if status != "non_renewing": reject 409
  chargebee.subscription.removeScheduledCancellation(subId)
  db.update: status="active"
```

### 5.3 — Pause logic

**Important Chargebee setting:** "Pause Subscription" feature must be explicitly enabled in Chargebee admin. Otherwise the API returns `error_code: pause_feature_not_enabled`. Surface this as a clear user-facing message, not the raw error.

```
POST /api/billing/pause (months: 1|2|3)
  if status != "active": reject 409
  termEnd = sub.current_term_end (unix)
  resumeAt = termEnd + months × 30 days
  chargebee.subscription.pause(subId, pause_option="end_of_term", resume_date=resumeAt)
  return { pausesAt: termEnd_iso, resumesAt: resumeAt_iso }
```

**Why `end_of_term` instead of `immediately`:** the user already paid for the current period. Pausing immediately would waste it. End-of-term means: "use what you've paid for, then pause."

**Why resume_date is calculated from termEnd, not from now:** Chargebee rejects `resume_date < pause_date`. If pause_date is end-of-term and you computed `now + N months`, the offset is wrong for users in the middle of their period.

### 5.4 — Resume from pause

```
POST /api/billing/resume-pause
  if status != "paused": reject 409
  chargebee.subscription.resume(subId, resume_option="immediately")
  db.update: status="active"
```

Auto-resume also happens via Chargebee's scheduler at `resume_date`. The button is a manual override.

### 5.5 — Cancel button toggle

**When-If UI rule:**
> *If* status is `non_renewing`, *then* the action-row button shows "Reactivate" (primary color, calls resume-cancel).
> *Else*, shows "Cancel subscription" (rose, opens cancel-confirm modal).

Don't show both at once.

### 5.6 — Account-delete vs. subscription

**When-If rule:**
> *If* user requests account deletion AND `status in {active, in_trial}`, *then* reject with "Please cancel your subscription first." Show this proactively in the settings UI — disable the delete button, show an info banner with a link to /billing.
> *If* `status == non_renewing`, *then* allow deletion but inform the user that the account is preserved until `current_term_end`.
> *If* `status in {cancelled, paused, unpaid, inactive}`, *then* allow deletion normally.

This prevents users from deleting their account mid-sub and then complaining when their next renewal still gets charged.

---

## Part 6 — Failed Payments / Dunning

### 6.1 — Detection

A subscription enters `status=unpaid` when Chargebee's dunning retries are exhausted. Before that, the sub is still `active` but has an invoice with `status=payment_due` or `status=not_paid`.

### 6.2 — UI rules

**When-If:** *If* `sub.status === "unpaid"` OR `any invoice.status not in {paid, voided}`, *then* show a red "Payment failed" banner at the top of /billing with two buttons:
- "Update payment method" (opens the embedded card modal)
- Per outstanding invoice: a "Pay now" button that calls `chargebee.invoice.collectPayment(invoiceId)`

### 6.3 — IDOR protection for collect-payment

**Rule:** Before calling `collectPayment(invoiceId)`, server-side verify that the invoice's `customer_id` equals the requesting user's `chargebee_customer_id`. Otherwise users could trigger charges on other customers' invoices.

```
const inv = await chargebee.invoice.retrieve(invoiceId)
if inv.invoice.customer_id !== sub.chargebeeCustomerId: return 403
await chargebee.invoice.collectPayment(invoiceId)
```

### 6.4 — Lock plan changes when in unpaid

**Rule:** while `status == unpaid`, the PlanSwitcher cards are non-clickable. Show a red note: "Please update your payment method first." Reason: Chargebee will refuse plan changes on unpaid subs, and we don't want the user to chase a Chargebee error.

### 6.5 — Pause stays allowed during dunning?

**Decision:** no. Pause requires `status=active`. While unpaid, only the payment-method-update path is open.

---

## Part 7 — Invoices / Purchases Display

### 7.1 — Unified history list

**Rule:** Don't show "Invoices" and "Purchase history" as separate sections. Merge into one chronological "Purchases & Invoices" list. Each row gets a type-specific label:
- Subscription invoice: *"Subscription Pro · monthly · Period: 22 May – 22 June 2026 · €178.50 · Paid · [PDF]"*
- Extras purchase: *"5 sessions purchased · Valid until 22 May 2027 · €208.25 · Paid · [PDF]"*

### 7.2 — Linking extras to invoices

When an extras purchase happens, store the resulting `chargebee_invoice_id` on the `purchased_extras` row. UNIQUE constraint on that column (where not null). When rendering the unified list, left-join: any invoice with a matching `purchased_extras` row is rendered as an extras-type row; the rest are subscription invoices.

### 7.3 — Period detection for subscription invoices

Chargebee invoice line items contain `entity_id` (the price ID) and `date_from`/`date_to`. Use those to render the period. Build a `priceId → {planId, cycle}` lookup once and apply.

---

## Part 8 — Billing-Info & VAT

### 8.1 — Chargebee VAT field is finicky (the hard-won learning)

**Rule:** `vat_number` is ONLY accepted via `POST /customers/{id}/update_billing_info` as a **top-level** parameter (not nested inside `billing_address`). All other endpoints silently drop it.

```ts
// CORRECT
await chargebee.customer.updateBillingInfo(customerId, {
  vat_number: "DE143454214",
  billing_address: { line1, city, zip, country, ... }
})

// WRONG — silently drops VAT
await chargebee.customer.update(customerId, { vat_number: "..." })

// ALSO WRONG — silently drops VAT
await chargebee.customer.updateBillingInfo(customerId, {
  billing_address: { vat_number: "...", ... }
})
```

After the correct call, Chargebee returns `vat_number_status` as one of: `valid`, `invalid`, `not_validated`, `undetermined`. This is VIES validation result.

### 8.2 — Reverse Charge

If `vat_number_status === "valid"` AND the customer's billing country is different from your business entity's country, Chargebee automatically applies EU Reverse Charge — invoice is generated without VAT and includes the standard exemption note.

This requires "Enable VAT Number validation" + "Generate VIES VAT Consultation Number" toggles in Chargebee Tax settings.

### 8.3 — UI rule for VAT status

**When-If:** *If* `vat_number_status === "valid"` after save, *then* show a green checkmark next to the field. *If* `invalid`, show a red warning with the option to retry. *If* `not_validated`, show a neutral note "Validation pending — will retry shortly".

---

## Part 9 — Edge Cases We Encountered (the full chronicle)

These are real bugs from the dev process. Don't fall into them again.

### Edge Case #1 — `NEXT_PUBLIC_*` vars missing at build time
**Symptom:** Modal says "Chargebee not configured" despite env vars set in container.
**Root cause:** Next.js inlines `NEXT_PUBLIC_*` at BUILD time, not runtime. Multi-stage Dockerfile didn't pass them to the builder.
**Fix:** Add `ARG NEXT_PUBLIC_*` + `ENV` in the builder stage of Dockerfile. Pass via `build.args` in docker-compose.

### Edge Case #2 — CSP blocks Chargebee.js
**Symptom:** Chargebee.js fails to load, "modules not loaded" error in console.
**Root cause:** Strict CSP excluded chargebee domains.
**Fix:** Add to CSP: `script-src + https://js.chargebee.com`, `connect-src + https://*.chargebee.com`, `frame-src https://*.chargebee.com https://js.chargebee.com`.

### Edge Case #3 — Hand-rolled Chargebee.js mount has DOM race
**Symptom:** "modules not loaded" intermittent, then 500.
**Root cause:** Our manual `card.createField().at("#cb-card-number")` could fire before the DOM element existed, depending on React render timing.
**Fix:** Use the official `@chargebee/chargebee-js-react-wrapper` package. It handles mount timing properly.

### Edge Case #4 — Chargebee silently drops unknown/unsupported fields
**Symptom:** Setting `vat_number` returned `null` on subsequent reads. No error.
**Root cause:** PC 2.0 + wrong endpoint = field dropped without warning.
**Lesson:** After any Chargebee write, re-read and verify the field actually persisted. Logging errors is not enough — Chargebee returns 200 OK on silent drops.

### Edge Case #5 — Browser cache poisons 307 redirects
**Symptom:** User clicks "Admin" in topbar, URL stays on `/app/admin` and shows the wrong sub-page.
**Root cause:** Some Chromium build cached a 307 with a stale target.
**Fix:** Topbar link should go directly to the final URL (`/app/admin/analytics`), bypassing the redirect entirely.

### Edge Case #6 — Slow external query blocks Server Component render
**Symptom:** Analytics page loaded for 20+ seconds. Filter changes also took 20s. React Error #418 (hydration mismatch).
**Root cause:** A `LIKE '%token%'` query on n8n's `execution_data` triggered a sequential scan. Server Component awaited it synchronously, blocking the entire page response.
**Fix:** Wrap the slow part in a Suspense boundary. Show a skeleton. Cache aggressively (Redis, 10-minute TTL).

### Edge Case #7 — Plan-switch cycle-only counts as "same"
**Symptom:** Switch from Pro-monthly to Pro-yearly opened the confirm modal but with empty body.
**Root cause:** Direction detection compared `basePriceEur`. Same tier = same price, fell into the "same" branch, which had no UI for it.
**Fix:** Cycle changes at the same tier are upgrades (mo→yr) or downgrades (yr→mo). Handle explicitly.

### Edge Case #8 — Optimistic status flip on scheduled pause
**Symptom:** User clicks Pause, UI immediately showed "Paused" — but Chargebee still says active until term-end.
**Root cause:** We were optimistically writing `status = paused` to DB. Webhook then overwrote it back to `active` (because Chargebee hadn't actually paused yet). UI flickered.
**Fix:** Don't optimistic-flip status when the action is scheduled. Wait for the webhook.

### Edge Case #9 — Scheduled downgrade + cancel = ghost banner
**Symptom:** After canceling a sub that had a pending downgrade, the "Downgrade scheduled" banner was still visible alongside "Subscription ending".
**Root cause:** Cancel didn't clear `scheduled_plan_item_price_id` in DB.
**Fix:** Cancel handler explicitly nulls scheduled fields + calls `removeScheduledChanges` on Chargebee side. UI also de-prioritizes the downgrade banner when status is `non_renewing`.

### Edge Case #10 — Webhook race after checkout-return
**Symptom:** After Chargebee redirects back from checkout, user lands on /billing and sees "no active plan".
**Root cause:** `subscription_created` webhook hadn't arrived yet at the moment of redirect. Our DB had no sub row, so UI rendered the no-sub state.
**Fix:** On `?status=success` query param, the page makes its own `chargebee.subscription.list({customer_id})` call to force-sync. Bridges the 1–3s webhook gap.

### Edge Case #11 — Modal flashes-then-500
**Symptom:** PaymentMethodModal opened briefly, then global error boundary kicked in.
**Root cause:** An uncaught synchronous throw inside `chargebee.init()` call propagated up to React.
**Fix:** Wrap the whole init block in `try/catch`. Set `error` state. Never let async-init errors escape the component.

### Edge Case #12 — `direct register` bypasses invite-consumption
**Symptom:** Admin saw invitee in user list AND in "open invites" simultaneously.
**Root cause:** When users register via the whitelist flow (no invite token), the invite row is never marked `used_at`.
**Fix:** Register action should consume any matching pending invite for the same email after creating the user.

### Edge Case #13 — Account-delete with active sub
**Symptom:** User deleted their account, sub continued to renew, charged them after they left.
**Root cause:** Delete-action didn't check sub state.
**Fix:** Pre-check in delete action. If `status in {active, in_trial}`, reject with "cancel first" message. UI also disables the delete button proactively.

### Edge Case #14 — Pause feature requires Chargebee setting
**Symptom:** "Pause subscription" button returned `error_code: pause_feature_not_enabled`.
**Root cause:** Pause-feature is gated in Chargebee admin, not on by default.
**Fix:** Surface this specific error code with a clear message. Document in setup-checklist.

### Edge Case #15 — Card-update modal needs first/last name AND test-card hint
**Symptom:** Users in test mode didn't know what numbers to type.
**Fix:** When `site.includes("test")`, render an amber info-box with test card numbers + expiry + CVC. Required UX touch.

### Edge Case #16 — Locale-thousand-separator inconsistency
**Symptom:** Yearly prices rendered as "€3360" instead of "€3.360" or "€3,360" depending on locale.
**Fix:** Centralize through one `fmtEUR(n, locale, decimals)` helper. Replace every `.toFixed()` in money rendering.

### Edge Case #17 — Inverse-prefix VAT-number-prefix conflict
**Symptom:** Set `vat_number_prefix=DE` AND `vat_number=DE143454214`. Chargebee got confused.
**Fix:** Don't send `vat_number_prefix` separately when the VAT number already contains a country prefix. Just send `vat_number` to the right endpoint.

### Edge Case #18 — Chargebee customer ID length limits on sub-endpoints
**Symptom:** `POST /customers/{uuid}/entity_identifiers/add` returned "size > 50".
**Root cause:** Some sub-resource endpoints have stricter ID-length rules than the parent endpoint.
**Workaround:** Use UUIDs for customer IDs but be prepared that some Chargebee sub-endpoints reject them.

### Edge Case #19 — Permanent-redirect (308) caches more aggressively than 307
**Symptom:** Trying to fix the topbar cache issue with `permanentRedirect()` made it WORSE.
**Lesson:** 308 is cached harder than 307. Use 307 (`redirect`) for routes that may change.

### Edge Case #20 — Confirmation modal must contain price in button text (German law)
**Rule:** The button that triggers payment must contain "kostenpflichtig" or equivalent + the exact amount. Otherwise §312j BGB is violated and the contract isn't enforceable.

Example button labels:
- OK: *"Jetzt zahlungspflichtig — €178,50"*
- OK: *"Pay €178.50 & upgrade"*
- BAD: *"Confirm"* (no amount)
- BAD: *"Upgrade"* (no amount, no obligation indicator)

### Edge Case #21 — Email-changes via Chargebee don't sync back
**Symptom:** User changes billing-email in our modal. Our user-record email stays unchanged.
**Decision:** This is intentional. The billing-email at Chargebee is separate from the login-email in our DB. Document this clearly.

### Edge Case #22 — VIES validation can be slow
**Symptom:** Save with VAT-ID took 4–8 seconds.
**Root cause:** VIES (EU VAT service) is government-run and not fast.
**Fix:** Show a spinner during save. If timeout occurs server-side, save with `not_validated` status; Chargebee will retry asynchronously.

### Edge Case #23 — Sub-state `future` is a thing
**Decision:** Treat `future` like `active` for now (it's a sub that will activate later). If you ever build delayed-start checkout, revisit.

### Edge Case #24 — Webhook duplicates from Chargebee retries
**Rule:** UNIQUE constraint on `event_id` is mandatory. Otherwise a single failed-then-retried Chargebee delivery applies the same state change twice.

### Edge Case #25 — `chargebee.customer.update` with empty string vs undefined
**Rule:** Sending `email: ""` overwrites with empty. Sending `email: undefined` keeps the existing value. Strip empty strings to undefined before calling Chargebee, unless you genuinely want to clear the field.

---

## Part 10 — Pre-Production Checklist

Before going live with billing in any new app:

```
[ ] Chargebee live-site separate from test-site
[ ] All plans/items created with correct item_price_ids (matching code constants)
[ ] Webhook endpoint configured with Basic Auth
[ ] "Pause subscription" feature toggled on
[ ] EU VAT tax region configured (countries + rates + VIES validation)
[ ] Brand Styles uploaded (logo, colors)
[ ] Publishable Key created
[ ] Allowed Origins includes production domain
[ ] Tax inclusive vs exclusive setting matches your pricing model
[ ] App env: API_KEY, SITE, PUBLISHABLE_KEY (both server + NEXT_PUBLIC_), WEBHOOK_USER, WEBHOOK_PASS
[ ] Dockerfile builder stage receives NEXT_PUBLIC_ vars as ARG/ENV
[ ] CSP headers in reverse proxy allow Chargebee origins
[ ] All DB migrations applied
[ ] BGB-312j-compliant button text in every payment-triggering modal
[ ] AGB/Terms mention auto-renewal, cancellation method, refund policy
```

```
[ ] Test full lifecycle: checkout -> upgrade -> downgrade -> pause -> resume -> cancel -> reactivate -> re-checkout
[ ] Test failed-payment flow with 4000 0000 0000 0341
[ ] Test 3DS flow with 4100 0000 0000 0019
[ ] Test EU VAT with a real valid VAT-ID (e.g. SAP DE143454214)
[ ] Verify webhook receives + processes each lifecycle event
[ ] Verify scheduled-downgrade survives a sub-renewal
[ ] Verify quota resets at period boundary (no manual cron)
```

---

## Part 11 — Things That Are Specifically NOT Solved Yet

Honest list of known gaps:

- **VAT exemption certificates upload** — not built
- **Multi-currency** — EUR only
- **Team/Seat subscriptions** — single-user only
- **Refunds via UI** — must be done in Chargebee admin manually
- **Customer-initiated subscription transfer** — not supported
- **Tax-jurisdiction outside EU** — not configured (US sales tax, AU GST, etc.)
- **Dunning customization** — using Chargebee defaults
- **Invoice email customization** — Chargebee templates only
- **Manual payment methods** (bank transfer / invoice) — not enabled

Each is a deliberate scope cut. Re-evaluate when business need arises.

---

This document is meant to be read end-to-end before writing code. The when-if rules are non-negotiable; the edge cases are warnings about specific pitfalls. Both lists exist because we hit them on Syn and want Ratio to avoid them.
