# Cricket Chronicle - Frontend

React Progressive Web Application for Cricket Chronicle.

## Technology Stack

- **Framework:** React 18+
- **Language:** TypeScript
- **State Management:** Redux Toolkit / Zustand
- **UI Library:** Material-UI / Tailwind CSS
- **Build Tool:** Vite
- **PWA:** Workbox
- **Local Database:** Dexie.js (IndexedDB)
- **Testing:** Jest, React Testing Library, Cypress

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure your .env file with backend API URL

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173` (or the port specified).

## Project Structure

```
frontend/
├── public/              # Static assets
│   ├── icons/          # PWA icons
│   ├── manifest.json   # PWA manifest
│   └── sw.js           # Service worker
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── features/       # Feature-specific modules
│   │   ├── auth/
│   │   ├── scoring/
│   │   ├── officials/
│   │   └── ...
│   ├── store/          # Redux store configuration
│   ├── services/       # API service layer
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Helper functions
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Root component
│   └── main.tsx        # Entry point
├── tests/              # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example        # Environment variable template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run E2E tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# API
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000

# App
VITE_APP_NAME=Cricket Chronicle
VITE_APP_VERSION=1.0.0

# Features
VITE_ENABLE_OFFLINE=true
```

## PWA Features

This application is a Progressive Web App with:

- **Offline Support:** Service Worker caches assets and API responses
- **Installable:** Can be installed as a standalone app
- **Background Sync:** Syncs data when connection is restored
- **Push Notifications:** Real-time match updates (optional)

### Testing PWA Features

1. Build the application: `npm run build`
2. Preview the build: `npm run preview`
3. Open DevTools → Application → Service Workers
4. Test offline mode by checking "Offline" in DevTools

## Testing

### Unit Tests
```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage
```

### E2E Tests
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed
```

## Routing

The application uses React Router for navigation:

- `/` - Home/Dashboard
- `/login` - Login page
- `/register` - Registration page
- `/matches` - Match list
- `/matches/:id` - Match details
- `/score/:id` - Scoring interface
- `/scorecard/:id` - Public scorecard view
- `/officials` - Officials management
- `/teams` - Team management
- `/players` - Player management
- `/statistics` - Statistics and reports

## State Management

### Redux Store Structure
```typescript
{
  auth: {
    user: User | null,
    token: string | null,
    isAuthenticated: boolean
  },
  scoring: {
    currentMatch: Match | null,
    syncStatus: 'synced' | 'pending' | 'failed',
    offlineQueue: Delivery[]
  },
  // ... other slices
}
```

## Offline Functionality

The app uses IndexedDB for offline storage:

1. **Match Data**: Stored locally during scoring
2. **Sync Queue**: Pending deliveries to sync
3. **User Data**: Cached for offline access

```typescript
// Example: Accessing offline data
import { db } from './services/db';

const match = await db.matches.get(matchId);
const deliveries = await db.deliveries.where('matchId').equals(matchId).toArray();
```

## Contributing

See the main [README](../README.md) for contributing guidelines.

---

**Last Updated:** 2026-02-01
