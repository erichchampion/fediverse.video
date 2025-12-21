# Fediverse Video - React Native

A native iOS application for Fediverse.video built with React Native and Expo.

## Status

**Phase 0: Foundation & Setup - COMPLETE** ✅

This is the React Native implementation of the Fediverse.video iOS app, migrating from the WebView-based approach to a fully native solution.

## Project Structure

```
mastodon-rn/
├── app/                          # Expo Router screens
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Landing/auth check screen
│   ├── (auth)/                  # Authentication flow
│   │   ├── login.tsx
│   │   └── instance-selector.tsx
│   ├── (tabs)/                  # Main app tabs
│   │   ├── feed/[id].tsx        # Feed screen (home, public, etc.)
│   │   ├── search.tsx
│   │   ├── profile.tsx
│   │   └── settings.tsx
│   └── modals/                  # Modal screens
│       ├── compose.tsx
│       └── image-viewer.tsx
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── base/               # Base components (Button, Card, etc.)
│   │   ├── feed/               # Feed components
│   │   ├── media/              # Media components
│   │   ├── post/               # Post components
│   │   └── ui/                 # UI utilities
│   ├── contexts/               # React contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Core libraries
│   │   ├── api/               # API client
│   │   ├── storage/           # Storage layer
│   │   └── utils/             # Utilities
│   ├── types/                  # TypeScript types
│   ├── theme/                  # Theme and styles
│   └── config/                 # Configuration
├── assets/                     # Images, fonts, etc.
├── package.json
├── tsconfig.json
├── app.json                    # Expo configuration
└── README.md
```

## Setup

### Prerequisites

- Node.js 20.x LTS
- Xcode 16.4+ (for iOS development)
- iOS Simulator or physical iOS device
- Expo CLI (optional, but recommended)

**Note**: This project uses Expo SDK 54, React Native 0.81, and React 19. Ensure your development environment supports these versions.

### Installation

1. **Navigate to the React Native project:**
   ```bash
   cd ios/mastodon-rn
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server:**
   ```bash
   npm start
   # or
   yarn start
   # or
   npx expo start
   ```

4. **Run on iOS:**
   - Press `i` in the terminal to open iOS simulator
   - Or scan the QR code with Expo Go app on your iPhone

### Development Commands

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check
```

## Implementation Phases

This project follows the roadmap defined in `/ios/REACT_NATIVE_MIGRATION_ROADMAP.md`:

### ✅ Phase 0: Foundation & Setup (COMPLETE)
- [x] Project initialization with Expo
- [x] TypeScript configuration
- [x] ESLint and Prettier setup
- [x] Folder structure
- [x] Basic routing with Expo Router
- [x] Context providers (Auth, Theme)
- [x] Configuration files

### ✅ Expo SDK 54 Upgrade (COMPLETE)
- [x] Upgraded from Expo SDK 51 to SDK 54
- [x] Upgraded from React Native 0.74.5 to 0.81.5
- [x] Upgraded from React 18.2.0 to 19.1.0
- [x] Migrated from expo-av to expo-video
- [x] Updated react-native-reanimated to v4.1.1
- [x] Updated react-native-gesture-handler to v2.28.0
- [x] Updated @testing-library/react-native to v13.3.3
- [x] Updated @typescript-eslint packages to v8.47.0
- [x] All tests passing (431/431)
- [x] Type checking passing
- [x] React 19 compatibility verified

### ✅ Phase 1-8: Core Features (COMPLETE)
See `FINAL_APP_STATE.md` for complete feature list.

## Key Technologies

- **React Native**: 0.81.5
- **React**: 19.1.0
- **Expo**: ~54.0.0
- **Expo Router**: ~6.0.15 (file-based routing)
- **TypeScript**: ~5.9.2
- **React Query**: ^5.51.23 (server state management)
- **Zustand**: ^4.5.4 (client state management)
- **masto.js**: 7.4.0 (Mastodon API client)

## Features (Planned)

- ✅ Native iOS performance
- ✅ OAuth authentication with any Mastodon instance
- 🚧 Multiple timeline support (home, local, federated, lists, hashtags)
- 🚧 Grid and list view modes
- 🚧 Video playback with inline controls
- 🚧 Image carousel for multi-media posts
- 🚧 Like, boost, bookmark, reply interactions
- 🚧 Post composer with media upload
- 🚧 Search functionality
- 🚧 Dark mode support
- 🚧 Offline caching

## Configuration

### App Configuration

Edit `src/config/index.ts` to customize:
- API timeouts and retry behavior
- Cache TTL values
- Feed page sizes
- Video playback settings

### Expo Configuration

Edit `app.json` to customize:
- App name and slug
- Bundle identifier
- Icons and splash screens
- Permissions

## Testing

The project uses Jest and React Native Testing Library v13.3.3 for testing. All tests are compatible with React 19.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Test Status**: ✅ 431 tests passing, 14 skipped (445 total)

## Troubleshooting

### Common Issues

**1. Metro bundler won't start**
```bash
# Clear cache and restart
npx expo start -c
```

**2. iOS build fails**
```bash
# Clean and rebuild
cd ios && rm -rf Pods Podfile.lock
cd .. && npx expo prebuild --clean
```

**3. TypeScript ESLint warnings about unsupported version**
- The project uses `@typescript-eslint` v8.47.0 which supports TypeScript 5.9.3
- If you see warnings, ensure npm overrides are applied correctly

**3. Dependencies out of sync**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

**4. TypeScript ESLint warnings about unsupported version**
- The project uses `@typescript-eslint` v8.47.0 which supports TypeScript 5.9.3
- If you see warnings, ensure npm overrides are applied correctly

## Contributing

This project is in active development. See the roadmap for upcoming features and implementation phases.

## Documentation

- [Migration Roadmap](../REACT_NATIVE_MIGRATION_ROADMAP.md) - Complete migration plan
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Mastodon API Docs](https://docs.joinmastodon.org/api/)

## License

Same as parent project.

---

**Current Status**: Expo SDK 54 Upgrade Complete ✅
- Upgraded from Expo SDK 51 to SDK 54
- Upgraded from React Native 0.74.5 to 0.81.5
- Upgraded from React 18.2.0 to 19.1.0
- All tests passing (431/431)
- Type checking passing
- React 19 compatible

**Last Updated**: 2025-01-26
