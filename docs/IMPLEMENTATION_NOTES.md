# Roomora MVP implementation notes

## Implemented

- The four primary tabs now render dedicated React Native screens based on the
  selected Stitch canonical layouts instead of the previous dashboard layouts.
- Home, expenses, bills, settings, authentication, household, payments,
  balances, receipts and detail flows are connected to live API data and
  include loading and empty states.
- The home balance card uses live debt, receivable and pending-payment data.
- Expense and bill lists use live records, category filtering and existing
  detail/create routes.
- Receipt scanning was moved below the quick expense form so it does not slow
  down the primary daily-entry workflow.
- Canonical sky palette is the first-run default.
- Light and dark themes share semantic tokens.
- Hanken Grotesk is bundled with the application.
- Main navigation contains five tabs in the requested order: Home, Expenses,
  Notes, Bills and Settings.
- Payments, balance details, receipt flows and household management use the
  canonical inner-screen header and remain outside the bottom navigation.
- Quick expense choices are user-editable and persisted locally.
- Profile photo, Turkish mobile formatting and Turkish IBAN validation remain
  connected to the existing profile API.
- Bills, scheduled rent collection, partial payments, receipts and house notes
  use the existing authenticated backend endpoints.
- Privacy, terms, notification preferences, security and about screens are
  available inside the application.
- The old expense detail, member list, expense summary, receipt history,
  password recovery, verification, debt/receivable and payment screens are no
  longer mounted by navigation. Their routes now use canonical Stitch-based
  implementations.
- L29-L41 finance screens share one API-backed component family, including
  partial payment reporting and pending-payment approval.
- Receipt OCR retains image zoom, item assignment, editing and conversion while
  using the canonical header and page shell.
- Raw OCR text is not rendered to the user. Parsed receipt rows remain editable
  by name, quantity and amount before saving or converting to an expense.
- The expense form supports multi-select participants and automatically
  represents all household members as the shared-house option.
- Expense history initially renders the latest 10 records and supports period
  filters and progressive loading.
- Payment reporting shows debt and receivable context, supports full or partial
  settlement and previews the remaining balance.
- Person detail includes pair-specific expenses and sent/received payment
  history.
- Recurring fixed charges appear in personal debt views only during the five
  days before their due date and close after the due date.
- House notes are a primary tab. House cover images and member profile photos
  are rendered anywhere that household identity is shown.
- IBAN management has its own validated screen and no longer opens profile
  editing.
- Expense detail editing now supports changing the payer, participants and
  participant-specific personal items. Personal items are disabled for members
  who are not selected in the expense.
- Native sessions use secure refresh-token storage and silent token rotation,
  so reopening Roomora does not require signing in again. Explicit logout
  revokes the refresh token.
- Mobile environments use `api.takosware.com` for production and
  `testapi.takosware.com` for preview/development.
- The app icon was regenerated from the Roomora mark with corrected optical
  scale; the login screen uses the same canonical asset.

## Verification

- `npm test`
- `npm run doctor`
- `npm run web:build`
- `npm run test:e2e:web`
- `npx expo export --platform android`
- `npx expo export --platform ios`
- `dotnet build EvArkadasim.API/EvArkadasim.API.csproj --no-restore`

The E2E flow signs in, checks the five-tab navigation, opens quick expense,
bills, settings, debt summary, household members, house notes and pending
payments, verifies no horizontal overflow and fails on browser runtime errors
or API responses with status 500.
# 2026-07-31 - iOS form and expense editing hardening

- Added a shared `KeyboardAwareScreen` for iOS and Android form flows.
- Migrated login, expense create/edit, house notes, IBAN, invitation, password reset, and house creation flows so focused inputs remain above the keyboard.
- Fixed the premium input wrapper to forward native refs and all `TextInput` props. This restores keyboard type, return key, autofill, password manager, and automatic scroll behavior.
- Updated login to use the real Roomora icon at a larger size, labeled fields, password visibility control, and a keyboard-safe layout aligned with the canonical Stitch source.
- Kept payer, participant, and personal-item editing in expense details. Non-participants remain disabled for personal items.
- Removed manual shared-amount arithmetic from expense editing. Shared amount is now derived from total minus selected personal items before the backend recalculates shares and ledger lines.

Verification:

- `npm run test`
- `npm run doctor` (20/20)
- `npx tsc --noEmit`
- `npm run export:ios`

# 2026-08-06 - Stitch batch 30 bill and expense screens

- Adapted the final Stitch `Fatura Detayı`, `Faturayı Düzenle`, `Düzenli Gider
  Ekle`, `Taksitli Gider Ekle` and `Harcama Detayı` designs to the existing
  React Native navigation and API contracts.
- Kept bill create/edit in one `FaturaEkle` screen and fixed/instalment plans in
  one `DuzenliGiderEkle` screen to avoid duplicate routes and API logic.
- Bill details now render real API shares and only expose payment reporting when
  the signed-in member has a share owed to another payer. The payment screen
  remains the source of truth for the current net balance.
- Expense details now render participant-specific personal items and retain
  editing for payer, participants and personal amounts.
- Instalment plans now require a useful expense name, accept the remaining total
  and remaining instalment count, and calculate the displayed per-person amount
  from the monthly instalment rather than the whole remaining balance.
- Scheduled plan month selection now covers the next 12 months, including the
  following calendar year.
- Bill forms include a whole-house participant shortcut and label the previewed
  equal split as approximate; persisted share rows continue to come from the
  backend's cent-accurate calculation.

Verification:

- `npm test` (passed)
- `npx expo export --platform android --output-dir .codex-export-ui-check` (passed)
- `npx expo export --platform ios --output-dir .codex-export-ui-check-ios` (passed)
- `npx expo-doctor` (19/20; six Expo packages have newer expected patch releases)
