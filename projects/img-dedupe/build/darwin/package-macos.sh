#!/usr/bin/env bash
#
# Build the macOS .app bundle and a .dmg. Run this ON macOS — the Wails macOS
# webview is CGO/WebKit and cannot be cross-compiled from Linux.
#
#   VERSION=1.2.3 ./build/darwin/package-macos.sh
#
set -euo pipefail

VERSION="${VERSION:-dev}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIST="$ROOT/dist"
APP="$DIST/img-dedupe.app"

echo ">> building macOS binaries (version $VERSION)"
mkdir -p "$DIST"
( cd "$ROOT" && go build -tags 'desktop production' -ldflags "-w -s -X main.version=$VERSION" -o "$DIST/imgdedupe-gui" ./desktop )
( cd "$ROOT" && go build -ldflags "-X main.version=$VERSION" -o "$DIST/imgdedupe" ./cmd )

echo ">> assembling $APP"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
sed "s/__VERSION__/$VERSION/g" "$ROOT/build/darwin/Info.plist" > "$APP/Contents/Info.plist"
cp "$DIST/imgdedupe-gui" "$APP/Contents/MacOS/imgdedupe-gui"
cp "$DIST/imgdedupe"     "$APP/Contents/MacOS/imgdedupe"
chmod +x "$APP/Contents/MacOS/"*

echo ">> generating icon.icns from build/appicon.png"
ICONSET="$(mktemp -d)/icon.iconset"; mkdir -p "$ICONSET"
for s in 16 32 64 128 256 512; do
  sips -z "$s" "$s"          "$ROOT/build/appicon.png" --out "$ICONSET/icon_${s}x${s}.png"    >/dev/null
  sips -z "$((s*2))" "$((s*2))" "$ROOT/build/appicon.png" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/icon.icns"

echo ">> creating dmg"
hdiutil create -volname "img-dedupe" -srcfolder "$APP" -ov -format UDZO \
  "$DIST/imgdedupe-${VERSION}-macos.dmg"

echo ">> done: $DIST/imgdedupe-${VERSION}-macos.dmg"
