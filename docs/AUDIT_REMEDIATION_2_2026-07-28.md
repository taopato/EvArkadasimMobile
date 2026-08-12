# Roomora Re-audit Remediation 2

Date: 28.07.2026

This document records the changes made after the independent re-audit in
`CLAUDE_REAUDIT_2026-07-27.md`.

## Backend

- RE-001: Increased the default local JWT key to 79 UTF-8 bytes.
- RE-001: Added an explicit 64-byte HS512 key guard in both API startup and
  `JwtHelper`. A misconfigured environment now fails immediately at startup
  with a clear message instead of failing on the first login request.
- Production and staging key lengths were checked remotely without printing
  their values. Both are 128 bytes.
- RE-002: Added explicit creditor checks to the `ApprovePayment` and
  `RejectPayment` controller actions. The existing handler checks remain as
  defense in depth.
- RE-003: Added `ForbiddenAccessException`. Authenticated authorization
  failures now return HTTP 403, while missing/invalid authentication remains
  HTTP 401. Payment delete, payment approve/reject, house leave/member removal,
  and house delete permission failures use the new exception.

## Mobile

- RE-004: Dashboard failures are now tracked per source: expenses, debt,
  pending payments, and scheduled charges.
- Home blocks financial summaries only when expense or debt data fails.
- Expenses and Expense Summary react only to expense failures.
- Bills reacts only to expense or scheduled-charge failures.
- Failed summary sources display an em dash instead of a misleading zero.
- RE-005: Removed the unreachable legacy `Odemeler.js` screen.
- RE-006: Removed the unused conflicting `premiumTheme.js` and duplicate
  TypeScript `Button`/`Card` implementations.
- Canonical, premium, common, date, primary-action, hero, input, and main-tab
  rounded rectangular surfaces now use `theme.radius.sm` (8 px).
- Privacy copy now includes retention, deletion/anonymization behavior, and a
  support contact. The internal user-facing legal-review warning was removed.

## Verification

- `dotnet build EvArkadasim.sln --no-restore`: passed, 0 warnings, 0 errors.
- Local Docker API rebuilt and is healthy on port 5118.
- Default local configuration reaches login normally; invalid credentials
  return 401 instead of an HS512 key-size failure.
- Short-key container startup test: rejected immediately with
  `TokenOptions:SecurityKey must be at least 64 bytes for HS512`.
- `npm test`: passed.
- `npm run doctor`: 20/20 checks passed.
- Android Expo export: passed.
- iOS Expo export: passed.
- `git diff --check`: no whitespace errors (line-ending notices only).

## Remaining Release Decision

The app still needs the real legal operator/data-controller identity and
address in the Privacy Policy and Terms. Those facts cannot be inferred safely
from source code. The final legal text must be reviewed before store
submission. This is the only known release blocker from the re-audit that
requires owner/legal input rather than an engineering change.
