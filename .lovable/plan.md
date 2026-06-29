Plan: Wrap the existing Lovable web app as a native mobile app using Capacitor and publish to App Store / Google Play.

## Overview

The project is already a responsive web app (React + TanStack Start). The fastest path to a real native app is Capacitor: it wraps the web app in a native WebView, exposes native APIs, and produces iOS/Android projects that can be signed and submitted to the stores.

## High-level steps

1. Add Capacitor core + iOS + Android packages.
2. Build the web app for production.
3. Initialize Capacitor with the app ID, name, and webDir pointing at the build output.
4. Add native platform projects (`npx cap add ios`, `npx cap add android`).
5. Configure app metadata (bundle ID, display name, icons, splash screens, deep links, allowed origins).
6. Replace any web-only features with native-safe alternatives (OAuth redirect, file downloads, push if needed).
7. Test locally on emulator / physical device.
8. Build signed release binaries and submit to App Store Connect / Google Play Console.

## Technical details

### Capacitor project setup

```bash
bun add @capacitor/core @capacitor/ios @capacitor/android
bun add -D @capacitor/cli
```

Create `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.aisyria.lms',
  appName: 'SAAE LMS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['saae.lovable.app', 'www.aisyria.org', 'aisyria.org'],
  },
  bundledWebRuntime: false,
};

export default config;
```

Run:

```bash
npx cap add ios
npx cap add android
```

### Web build

The existing Vite build must produce a static `dist/` folder. Capacitor loads `index.html` from that folder and the app runs as a SPA inside the native WebView. If the app uses TanStack Start SSR, we need a static export or a server-hosted fallback. The simplest route for Capacitor is to point the WebView at the published URL (`https://saae.lovable.app`) instead of a bundled build, but that requires an internet connection and careful CORS/Auth handling. Recommended first approach: bundle a static production build in the app.

### Icons / splash screens

Generate a full icon/splash set from a single 1024x1024 source using `@capacitor/assets`:

```bash
bun add -D @capacitor/assets
```

Place source images in `resources/icon.png` and `resources/splash.png`, then run:

```bash
npx capacitor-assets generate
```

### Native-specific considerations

- **Auth / OAuth**: Google/Apple OAuth inside a WebView can be blocked by providers. Use Capacitor Browser plugin (`@capacitor/browser`) for system-browser OAuth, then handle the callback via a custom URL scheme (`org.aisyria.lms://auth/callback`).
- **Status bar / safe areas**: Use `@capacitor/status-bar` and CSS `env(safe-area-inset-*)` to handle notches.
- **Keyboard**: `@capacitor/keyboard` to avoid input hiding.
- **Push notifications**: If needed later, add `@capacitor/push-notifications` and configure FCM / APNs.
- **Payments**: Keep existing web payment flow or replace with native in-app purchases if required by store policies.

### Testing

```bash
npx cap open ios      # opens Xcode
npx cap open android  # opens Android Studio
```

Run on emulators, then on real devices with provisioning / signing configured.

### Publishing

- iOS: Archive in Xcode, upload to App Store Connect, fill App Store listing, submit for review.
- Android: Generate signed AAB in Android Studio, upload to Google Play Console, submit for review.

## Deliverables

- `capacitor.config.ts` in project root.
- `ios/` and `android/` native project folders.
- Updated build script to produce `dist/` then sync with Capacitor.
- Documentation for local run and store submission.

## Open questions before implementation

1. Should the app load the live web URL (`https://saae.lovable.app`) or bundle a static build? Loading the live URL is faster to update but requires internet. Bundling is more "store-like" and works offline after initial load.
2. What bundle ID should be used? Suggested: `org.aisyria.lms`.
3. Do you need push notifications from the start?
4. Do you have Apple Developer ($99/year) and Google Play ($25 one-time) accounts ready?

## Milestones

1. Capacitor setup + local iOS/Android build.
2. Auth via system browser + custom URL scheme.
3. Icons / splash + safe-area polish.
4. Signed release builds + store submission.
