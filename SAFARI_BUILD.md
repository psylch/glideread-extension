# GlideRead — Safari Extension Build Guide

This guide explains how to convert the GlideRead web extension into a native Safari extension that runs on **iOS (iPhone/iPad)** and **macOS**.

## Prerequisites

- **macOS 13 (Ventura)** or later
- **Xcode 15** or later (free from Mac App Store)
- An **Apple Developer account** (free account works for personal use / sideloading)

## Step 1: Convert with Xcode Tool

Apple provides a command-line tool that wraps any Chrome/Firefox extension into a native Xcode project.

Open Terminal and run:

```bash
xcrun safari-web-extension-converter /path/to/glideread-extension \
  --app-name "GlideRead" \
  --bundle-identifier com.yourname.glideread \
  --ios-only
```

Options:
- Remove `--ios-only` if you also want macOS Safari support
- Replace `com.yourname.glideread` with your own bundle identifier

This generates a new Xcode project containing:
- A minimal iOS app (the container app required by Apple)
- The Safari Web Extension target with all GlideRead files

## Step 2: Configure in Xcode

1. Open the generated `.xcodeproj` in Xcode
2. Select the project in the sidebar, go to **Signing & Capabilities**
3. Set your **Team** (Apple Developer account)
4. Ensure the **Deployment Target** is iOS 16.4 or later (required for MV3 support)
5. In the Extension target → **Info.plist**, verify `NSExtension` → `NSExtensionPointIdentifier` is `com.apple.Safari.web-extension`

## Step 3: Build & Run

### On Simulator
1. Select an iPhone simulator from the device dropdown
2. Press **Cmd + R** to build and run
3. Open **Settings → Safari → Extensions** on the simulator and enable GlideRead

### On Physical iPhone
1. Connect your iPhone via USB
2. Select it as the build target
3. Press **Cmd + R**
4. On your iPhone, go to **Settings → Safari → Extensions** and enable GlideRead
5. Open Safari, visit a site in your site list, and verify it works

## Step 4: Enable the Extension

After installing, the extension must be manually enabled:

1. **Settings** → **Safari** → **Extensions**
2. Toggle **GlideRead** on
3. Set permissions to **"Allow"** or **"Ask"** for websites

## iOS-Specific Notes

- **No keyboard shortcuts**: The `Alt+G` shortcut is desktop-only. On iOS, use the extension popup to toggle GlideRead
- **Permissions**: Safari on iOS handles host permissions differently. The extension will prompt for site access on first use
- **Storage sync**: `browser.storage.sync` falls back to local storage on Safari — settings won't sync across devices via iCloud, but will persist locally
- **Popup UI**: On iOS, the popup appears as a sheet from the bottom when you tap the extension icon in Safari's address bar

## Distributing

### TestFlight (Recommended for testing)
1. Archive the project: **Product → Archive**
2. Upload to App Store Connect
3. Add testers via TestFlight

### App Store
1. Archive and submit for review
2. Safari extensions are distributed as regular iOS apps

### Sideloading (Free, personal use)
1. Build directly to your device from Xcode
2. The app expires after 7 days (free account) or 1 year (paid account)
3. Re-build from Xcode to renew

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not appearing in Safari | Go to Settings → Safari → Extensions and enable it |
| "Extension blocked" warning | Grant permissions in Safari settings |
| Content script not injecting | Ensure the site is in your preset/custom site list and extension is enabled |
| Fonts look different on iOS | iOS Safari uses system fonts; the extension's font scaling still applies |
