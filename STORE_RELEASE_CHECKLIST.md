# Roomora Store Release Checklist

Last audited: 2026-07-15

## Release Gate

- [x] App name and native IDs: `Roomora`, `com.taopato.roomora`
- [x] EAS project is linked and `project:info` succeeds (legacy internal slug: `ev-arkadasim`)
- [x] Android production output is an AAB; preview output is an APK
- [x] iOS and Android build numbers use EAS remote auto-increment
- [x] Camera/photo permission explanations are present
- [x] Sign in with Apple capability is declared
- [x] Account deletion is available in Settings and from a public web flow
- [x] Privacy, account deletion, and support pages exist in the backend project
- [x] Default palette for a fresh install is Sky Blue
- [x] Domain tests, Expo Doctor, web export, and critical web flow pass locally
- [x] `https://api-roomora.takosware.com` and public legal pages are available over TLS from an external network
- [x] Production SMTP is configured for verification, password reset, invitation, and deletion emails
- [ ] BLOCKER: configure production OCR secret or disable receipt OCR before review
- [ ] Upgrade the build machine from Node `20.18.1` to a supported Node LTS (`>=20.19.4`; Node 22 LTS recommended)
- [ ] Complete real-device tests on at least one current iPhone and two Android screen sizes

The app must not be submitted while the production API or review account is unavailable. Apple explicitly tests the supplied account and backend during review.

## Production URLs

- Privacy policy: `https://api-roomora.takosware.com/privacy.html`
- Account deletion: `https://api-roomora.takosware.com/account-deletion.html`
- Support: `https://api-roomora.takosware.com/support.html`
- API: `https://api-roomora.takosware.com/api`

All four URLs must return a valid HTTPS response without VPN, local DNS, or a self-signed certificate.

## Google Play

- [ ] Create the Play Console app with package `com.taopato.roomora`.
- [ ] Verify the final AAB targets Android 15 / API 35 or newer.
- [ ] Upload the first AAB manually; later EAS Submit runs need a Google service account key.
- [ ] Add the privacy policy and account deletion URLs in Play Console.
- [ ] Complete Data Safety from `PRIVACY_DATA_INVENTORY.md`, including third-party SDK behavior.
- [ ] Complete content rating, target audience, ads declaration, app access, and financial features declarations accurately.
- [ ] Add phone/tablet screenshots, 512x512 icon, feature graphic, short description, and full description.
- [ ] If the personal developer account was created after 2023-11-13, run a closed test with at least 12 opted-in testers for 14 continuous days, then apply for production access.

Official references:

- https://support.google.com/googleplay/android-developer/answer/11926878
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/10144311

## App Store

- [ ] Enroll in the Apple Developer Program and accept the latest agreements.
- [ ] Register bundle ID `com.taopato.roomora` with Sign in with Apple enabled.
- [ ] Create the App Store Connect app and provide privacy policy and support URLs.
- [ ] Complete App Privacy using `PRIVACY_DATA_INVENTORY.md` for the app and every integrated SDK.
- [ ] Provide an active review account and the notes in `STORE_REVIEW_NOTES_TEMPLATE.md`.
- [ ] Keep the production backend and email services online for the entire review period.
- [ ] Test account creation, password reset, Apple login, profile update, expenses, bills, payments, receipt flow, and account deletion on TestFlight.
- [ ] Add iPhone screenshots for each required display size, app description, keywords, age rating, copyright, and contact information.
- [ ] Answer export compliance consistently; the app declares that it only uses exempt system encryption.

Official references:

- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/support/offering-account-deletion-in-your-app
- https://developer.apple.com/app-store/app-privacy-details/

## OAuth

Google login remains hidden in native production builds until both native client IDs exist. Email/password and Sign in with Apple remain available.

- [ ] Create Android OAuth client for `com.taopato.roomora` with the EAS/Play signing SHA-1.
- [ ] Create iOS OAuth client for `com.taopato.roomora`.
- [ ] Add `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` to EAS production/preview environments.
- [ ] Add the same accepted Google audiences to production backend configuration.
- [ ] Confirm Apple backend audience is `com.taopato.roomora`.

## Build And Submit

```powershell
npm ci
npm test
npx expo-doctor
npx eas-cli project:info
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

Upload Android to Internal Testing first and iOS to TestFlight first. Google Play requires the initial Android upload to be manual; after that, submission can use EAS Submit.

```powershell
npx eas-cli submit --platform android
npx eas-cli submit --platform ios
```

Expo references:

- https://docs.expo.dev/deploy/build-project/
- https://docs.expo.dev/deploy/submit-to-app-stores/
- https://docs.expo.dev/build-reference/app-versions/
