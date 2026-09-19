<p align="center">
    <img src="src/assets/papra-logo.png" width="220" title="Papra logo">
</p>

# Papra Mobile

Papra Mobile is a cross-platform client for [Papra](https://github.com/papra-hq/papra), a self-hosted document management server. It provides a focused mobile workflow for connecting to a Papra server, browsing documents, scanning pages, uploading files, searching, tagging, and managing the trash.

The application is built with Vue 3 and Capacitor, so the same frontend runs in the browser, Android, and iOS.

## Features

- Email/password and API-key authentication
- Optional Cloudflare Access service-token support
- Document browsing, search, tags, and trash management
- Camera-based document scanning with crop, rotate, and image enhancement tools
- File upload and PDF generation
- Light and dark themes
- Native Android and iOS projects

## Requirements

- Node.js 22 or newer
- npm
- A running Papra server for end-to-end use
- Android Studio and an Android SDK for Android builds
- macOS with Xcode and CocoaPods for local iOS builds

The web application can be developed on Windows, macOS, or Linux. Xcode cannot run on Windows or Linux; use the included GitHub Actions workflow for a hosted macOS simulator build when a Mac is not available.

## Getting started

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

The app does not include a Papra backend. On first launch, enter the address of your own Papra server and authenticate with either your account or an API key.

## Production web build

```bash
npm run build
npm run preview
```

The production files are written to `dist/`.

## Android

Open the Android project in Android Studio:

```bash
npm run cap:android
```

Build a debug APK from the command line:

```bash
npm run android:build
```

Build the release variant:

```bash
npm run android:release
```

Release builds still need the appropriate Android signing configuration before distribution.

## iOS

Local iOS development requires macOS, Xcode, and CocoaPods:

```bash
npm run cap:ios
```

This opens the generated Xcode workspace at `ios/App/App.xcworkspace`. The project uses an iOS 14 deployment target.

The local simulator build command is:

```bash
npm run ios:build
```

A device or TestFlight build requires an Apple Developer account, signing certificates, and provisioning profiles configured in Xcode.

### Building iOS without a Mac

`.github/workflows/ios-build.yml` runs an unsigned iOS Simulator build on a hosted macOS runner. After pushing the repository to GitHub:

1. Open the repository's **Actions** tab.
2. Select **iOS build**.
3. Choose **Run workflow**.
4. Download the `papra-ios-simulator` artifact when the job completes.

This workflow produces a simulator `.app`. It does not produce a signed device or TestFlight `.ipa`; those require Apple signing credentials.

## Project structure

```text
src/                 Vue application source
src/pages/           Route-level screens
src/components/      Shared UI components
src/stores/          Pinia state stores
src/api/             Papra API client
src/utils/           PDF, scan, and formatting utilities
android/             Capacitor Android project
ios/                 Capacitor iOS project
resources/            App icon source and generated assets
.github/workflows/   CI workflows
```

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production web build |
| `npm run cap:sync` | Build and sync all Capacitor platforms |
| `npm run cap:android` | Sync and open Android Studio |
| `npm run cap:ios` | Sync and open Xcode |
| `npm run android:build` | Build an Android debug APK |
| `npm run android:release` | Build an Android release APK |
| `npm run ios:build` | Build an iOS Simulator app on macOS |

## Configuration

The native application identifier is `app.papra.mobile`. Capacitor configuration lives in `capacitor.config.json`; platform-specific settings are maintained in `android/` and `ios/`.

The app communicates with the Papra server entered by the user. Credentials are stored locally through Capacitor Preferences and are never sent anywhere other than the configured server and its optional Cloudflare Access proxy.

## License and attribution

Papra Mobile is an independent client for Papra and is not affiliated with or endorsed by the Papra project unless explicitly stated by the maintainers. Refer to the upstream Papra project for server licensing and contribution information.
