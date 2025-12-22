#!/bin/bash
set -e

# npx expo prebuild --platform ios --clean
npx expo export --platform ios

# Ensure dependencies are installed
cd ios
pod install
cd ..

# Create build directory
mkdir -p build

# Build archive
xcodebuild \
  -workspace ./ios/FriendlyFediverse.xcworkspace \
  -scheme FriendlyFediverse \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath ./build/FriendlyFediverse.xcarchive \
  -allowProvisioningUpdates \
  archive

xcodebuild \
  -exportArchive \
  -archivePath ./build/FriendlyFediverse.xcarchive \
  -exportOptionsPlist ./ios/exportOptions.plist \
  -exportPath ./build