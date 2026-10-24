# OTI-TECH Mobile

Android-first Expo + React Native app source. The app consumes the existing public API; it does not share the website DOM or present local sample listings as live inventory.

## Local setup

Local Android builds require Node.js 22.13 or newer, npm, Android Studio with Android SDK Platform 37 and platform tools, Java, and an emulator or device. For the first installable APK, use the configured EAS cloud build profiles instead; cloud builds do not require a local Android SDK. They still require npm registry access, an Expo account, the EAS CLI, and an Android device for review. This machine has Node.js 26.5 and npm 11.17, but its package fetches fail with `EACCES`; Android Studio/SDK paths and Java/adb were not found in the usual locations or PATH.

1. Copy `.env.example` to `.env`. Its development URL targets the local API through the Android emulator (`10.0.2.2:3000`). For a physical phone, replace that host with the computer's LAN address; `localhost` on the phone points to the phone.
2. Install packages with `npm install`, align SDK-managed packages with `npx expo install --fix`, and run `npx expo-doctor`.
3. For a standalone internal APK, set the `preview` environment's `EXPO_PUBLIC_API_BASE_URL` to staging and run `npx eas-cli build --platform android --profile preview`. For live reload, build the `development` profile and start Metro with `npm start`. Expo Go may not yet support this SDK. `npm run android` can launch an available emulator when the Android SDK is installed.
4. Run `npm run typecheck` after dependencies are installed.

The current baseline is Expo SDK 58, React Native 0.88, and React 19.3. Expo documents Node.js 22.13 as the minimum and Android SDK 37 for compilation (target API 36). See the [SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/) and [Android environment setup](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android). The development profile includes the SDK-matched `expo-dev-client` dependency. Dependency installation and compatibility checks are pending: this environment's npm cache only knows SDK 57, while direct registry requests fail with `EACCES`.

## Android build profiles

`eas.json` defines a development-client APK, an internal preview APK, and a production profile for Google Play (AAB by default). After installing dependencies, logging in, and linking the project with EAS, create an installable preview APK with `npx eas-cli build --platform android --profile preview`; EAS runs the Android build remotely. The development profile creates a dev client for Metro-based iteration.

The EAS profiles select the `development`, `preview`, or `production` environment and set `EXPO_PUBLIC_APP_ENV` accordingly. Configure `EXPO_PUBLIC_API_BASE_URL` in the matching EAS environment before cloud builds. Development defaults to the Android emulator's local API. For an EAS development APK installed on a physical phone, configure a development API host reachable from that phone; `10.0.2.2` only targets an Android emulator. Preview can browse using the production public API fallback, but enquiry submission stays disabled until a separate non-production API URL is configured. Production defaults to the production API. Do not point preview or development at production to test enquiry submission.

The API base URL is public configuration, not a secret. Never add API keys, passwords, signing credentials, or user tokens to this file or the app bundle. The `com.otitech.mobile` Android package identifier is provisional and must be confirmed before the first Play Store release.

## Android App Links

`app.json` declares verified-link intent filters for the current property and project detail URLs on `otitech.com` and `www.otitech.com`. Android will only verify these links after the website serves `/.well-known/assetlinks.json` with the app's actual signing-certificate fingerprint. Do not publish a placeholder fingerprint. Once an installable build and `adb` are available, test a detail URL with:

```powershell
adb shell am start -a android.intent.action.VIEW -d "https://otitech.com/pages/property-details.html?slug=ikeja-residential-plot" com.otitech.mobile
```

## Current implementation

- Public property browsing with API-backed type, purpose, location, availability, and NGN price filters.
- Project browsing with API-backed category, status, location, and year filters.
- Native Services screen covering building design, construction, real estate, and project support; keep `src/serviceCatalog.ts` synchronized with `../pages/services.html` until a public services API exists.
- Property and project detail views backed by public API endpoints.
- Public enquiry submission and contact links populated from public site settings.
- On-demand service readiness check from the Contact screen, using the configured API environment's `/health/ready` route.
- Result pagination, share sheets, and initial routing for existing website detail URLs. Android App Link verification still needs the signed app fingerprint published on the website.
- Android launcher, adaptive, and monochrome themed icons are rendered from the existing OTI-TECH favicon; review them on device before release.
- A bounded in-memory cache for public API responses, with a 15-minute lifetime and an availability warning when showing the last loaded listing data. The cache resets when the app process closes.
- No account or seller functionality yet; those are planned after the public discovery flow.
