# Roomora Audit Remediation - 2026-07-27

This document records the changes made after `CLAUDE_UI_UX_AUDIT.md`.
The backend repository is `C:\EvArkadasimProje\GitHubRepos\EvArkadasimBackend`.
The mobile repository is `C:\EvArkadasimProje\GitHubRepos\EvArkadasimMobile`.

## A. Fixed Before Store Release

### Backend security and financial integrity

- Removed the unauthenticated `CryptoDemoController` and its demo secret/user-write surface.
- Removed `POST /api/Payments/AddPaymentWithAllocations` and its mobile fallback.
- `CreatePayment` now requires the JWT user to be the debtor and both parties to be active members of the house.
- Payment amount must be positive, the parties must differ, and a standard payment cannot exceed the open debt.
- Payment approval revalidates the remaining debt before applying FIFO allocations.
- Ledger, allocation, and payment approval changes are now persisted in one EF Core commit.
- Added SQL Server row-version concurrency tokens to `Payments` and `LedgerLines`.
- Added migration `AddFinancialConcurrencyTokens`.
- Added `ROOMORA_HTTP_PORT` support so a second local API instance can be tested without stopping the normal 5118 process.
- Concurrent financial updates return HTTP 409 with a retry message.
- Payment list, pending-payment list, payment deletion, house, member, debt, and ledger endpoints now derive identity from JWT and enforce house membership/ownership.
- Removed the public authenticated `GetAllUsers` directory endpoint.

### Mobile flow and UI

- The authenticated invitation route is present in the active stack.
- Removed the insecure direct-allocation payment fallback from `src/services/api.js`.
- Payment reporting now blocks submission when no open debt exists and still supports partial payment up to the remaining debt.
- The expense split summary now subtracts personal items before calculating the equal per-person amount.
- Added a saving lock and disabled state to `DuzenliGiderEkle` to prevent duplicate submissions.
- Notes remember the selected list and active/history view per house with AsyncStorage.
- `GrupListesi` now shows an explicit retryable error instead of silently presenting an empty state.
- Dashboard-backed Home, Expenses, Bills, and Expense Summary show a retryable error when any required data source fails; failed debt data is no longer silently presented as zero.
- Bills now exposes scheduled-payment member status and payer actions. Aggregate collection progress was intentionally removed.
- `BrandMark` now supports `variant="mark"` and automatically uses `mark-white.png` in dark mode.
- Splash background was aligned to `#F7F9FC`.
- Canonical shared cards/buttons use the 8 px radius token; financial hero colors moved into LIGHT/DARK theme tokens.
- The iOS app icon remains 1024x1024 but is now fully opaque (`Format24bppRgb`, sampled alpha minimum 255).

## B. Candidates For After v1.0

- Convert long `ScrollView + map` financial lists to `FlatList` after profiling on low-end Android devices.
- Complete an application-wide accessibility pass for labels, hints, dynamic text sizing, and screen-reader order.
- Remove or consolidate legacy theme and screen modules only after confirming no production route imports them.
- Add dedicated backend integration/security test projects. The current solution has no discovered VSTest test assembly.

## C. Product Or Legal Decisions

- Do not invent social-note features solely to match a Stitch concept. The current shared checklist remains the source-of-truth behavior until product scope changes.
- Privacy Policy and Terms content must be reviewed with the real company/contact/data-retention details. Placeholder legal copy cannot be declared production-ready by an engineering audit.
- Keep the existing Expo slug while the current EAS project is active; changing it is a release migration, not a UI cleanup.

## Verification Performed

- `dotnet build EvArkadasim.sln --no-restore`: passed with 0 errors and 0 warnings.
- EF migration generation and idempotent migration script generation: passed.
- Local migration application and API startup on port 5199: passed.
- Swagger JSON generation: HTTP 200. Removed CryptoDemo, GetAllUsers, and AddPaymentWithAllocations routes are absent.
- `npm run test`: passed.
- `npx expo-doctor`: 20/20 checks passed.
- Android Expo export: passed.
- iOS Expo export: passed.
- `git diff --check`: passed (line-ending notices only).
