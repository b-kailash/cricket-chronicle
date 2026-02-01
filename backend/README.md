# Cricket Chronicle - Backend

Node.js/Express backend API for Cricket Chronicle PWA.

## Technology Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL 14+
- **Authentication:** JWT
- **Real-time:** Socket.io
- **Testing:** Jest

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure your .env file with database credentials

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npm run seed

# Start development server
npm run dev
```

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/          # Database models (if not using Prisma exclusively)
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   ├── middleware/      # Express middleware (auth, error handling, etc.)
│   ├── utils/           # Helper functions
│   └── config/          # Configuration files
├── tests/               # Test files
├── prisma/              # Prisma schema and migrations
│   ├── schema.prisma
│   └── migrations/
├── .env.example         # Environment variable template
├── package.json
└── tsconfig.json
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npx prisma migrate dev` - Run database migrations
- `npx prisma studio` - Open Prisma Studio (database GUI)

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cricket_chronicle?schema=public"

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Email (optional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Other
LOG_LEVEL=debug
```

## API Documentation

API documentation is available at `/api-docs` when the server is running.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Database

### Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Prisma Studio

```bash
# Open Prisma Studio
npx prisma studio
```

## Contributing

See the main [README](../README.md) for contributing guidelines.

---

**Last Updated:** 2026-02-01
