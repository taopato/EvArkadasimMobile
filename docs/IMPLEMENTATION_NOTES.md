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
- Main navigation contains exactly four tabs.
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

## Verification

- `npm test`
- `npm run doctor`
- `npm run web:build`
- `npm run test:e2e:web`
- `npx expo export --platform android`
- `npx expo export --platform ios`
- `dotnet build EvArkadasim.API/EvArkadasim.API.csproj --no-restore`

The E2E flow signs in, checks the four-tab navigation, opens quick expense,
bills, settings, debt summary, household members, house notes and pending
payments, verifies no horizontal overflow and fails on browser runtime errors
or API responses with status 500.
