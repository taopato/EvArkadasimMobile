# Roomora Privacy Data Inventory

Use this inventory when completing Google Play Data Safety and Apple App Privacy. Re-check it against the final production backend and every added SDK before submission.

## Collected Data

| Data | Required | Linked to user | Purpose |
| --- | --- | --- | --- |
| Name and email | Yes | Yes | Account creation, login, invitations, shared-home identity |
| Internal user ID | Yes | Yes | Authentication, authorization, record ownership |
| Phone number | Optional | Yes | Profile and roommate contact convenience |
| IBAN | Optional | Yes | Let roommates send money outside Roomora |
| Profile photo | Optional | Yes | Profile personalization |
| House membership and invitations | Feature dependent | Yes | Shared-home collaboration |
| Expenses, bills, balances, payments | Feature dependent | Yes | Core expense-sharing service |
| Receipt/invoice images and extracted text | Optional | Yes | Receipt scan and expense creation |
| House notes and user-entered descriptions | Optional | Yes | Shared-home organization |
| Authentication and limited security logs | Yes | Yes or pseudonymous | Account security, abuse prevention, troubleshooting |

## Third Parties

- Apple and Google receive authentication data only when the user chooses their login method.
- A configured OCR provider may receive a receipt image for text/amount extraction when the user starts receipt scanning.
- No advertising SDK, cross-app tracking SDK, or data broker integration is currently included.
- Data is not sold and is not used for targeted advertising.

## Permissions

- Camera: optional; receipt capture or taking a profile photo.
- Photo library: optional; selecting a receipt or profile photo.
- No location, contacts, microphone, Bluetooth, health, or background tracking permission is required.

## Retention And Deletion

- Account/profile data is retained while the account is active.
- In-app deletion is at Settings -> Delete My Account.
- External deletion requests are available at `/account-deletion.html`.
- Deletion removes profile/contact data, profile image, verification codes, invitations, and active memberships.
- Previously shared financial records may remain linked to an anonymized inactive user to preserve other household members' balances and record integrity. This is disclosed in the privacy policy.

## Store Form Guidance

- Google Play: declare data collection for personal info, financial info, photos, app activity/user content, and account identifiers as applicable. Mark optional fields and optional receipt scanning accurately.
- Apple: declare the same data types as linked to the user's identity when stored with the Roomora account. Do not declare tracking unless the implementation changes.
- Both stores: include SDK-side collection, even if Roomora does not read that data directly.
- Production transport must use HTTPS; do not claim encryption in transit until the public TLS endpoint is working.
