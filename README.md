# Cricket Chronicle PWA

**Version:** 1.0.0
**Status:** In Development

A comprehensive Progressive Web Application for cricket match management, featuring real-time ball-by-ball scoring, organizational hierarchy management, officials management with payment processing, and public live scorecard viewing.

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Development Workflow](#development-workflow)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Cricket Chronicle PWA is designed to streamline cricket match administration from provincial bodies down to club teams. The system provides:

- **Hierarchical Organization Management**: Province → Club → Division → Team structure
- **Real-time Ball-by-Ball Scoring**: Offline-first scoring engine with automatic sync
- **Officials Management**: Appointments, availability tracking, performance reviews, and payment processing
- **Public Live Scorecards**: Real-time match viewing for fans
- **Comprehensive Statistics**: Player, team, and match statistics and reports

---

## Features

### Core Features (MVP)
- ✅ User authentication and role-based access control
- ✅ Organization hierarchy management (Province, Club, Division, Team)
- ✅ Player and official registration and management
- ✅ Match scheduling and management
- ✅ Ball-by-ball scoring with offline capability
- ✅ Live public scorecard viewing
- ✅ Official availability and appointment system
- ✅ Basic statistics and reports

### Advanced Features (Post-MVP)
- ⏳ Official payment and expense management
- ⏳ Performance reviews and quality tracking
- ⏳ Powerplay tracking for limited-overs formats
- ⏳ DLS calculations for rain-affected matches
- ⏳ Super over support
- ⏳ Advanced analytics and visualizations

---

## Technology Stack

### Frontend
- **Framework:** React 18+ with TypeScript
- **State Management:** Redux Toolkit / Zustand
- **UI Library:** Material-UI / Tailwind CSS
- **PWA:** Service Workers, Workbox
- **Local Database:** IndexedDB (Dexie.js)
- **Testing:** Jest, React Testing Library, Cypress

### Backend
- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js / Fastify
- **ORM:** Prisma / TypeORM
- **Authentication:** JWT with refresh tokens
- **Real-time:** Socket.io / WebSockets
- **API Docs:** OpenAPI/Swagger

### Database
- **Primary:** PostgreSQL 14+
- **Caching:** Redis
- **Search:** (Optional) Elasticsearch

### DevOps
- **Version Control:** Git with GitHub
- **CI/CD:** GitHub Actions
- **Code Quality:** ESLint, Prettier, Husky
- **Containerization:** Docker
- **Monitoring:** (To be determined)

---

## Project Structure

```
CricketChronical/
├── backend/                    # Node.js backend application
│   ├── src/
│   │   ├── controllers/       # API route controllers
│   │   ├── models/            # Database models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Express middleware
│   │   ├── utils/             # Utility functions
│   │   └── config/            # Configuration files
│   ├── tests/                 # Backend tests
│   ├── prisma/                # Prisma schema and migrations
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React PWA frontend
│   ├── public/                # Static files
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── features/          # Feature modules
│   │   ├── store/             # State management
│   │   ├── services/          # API services
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Utility functions
│   │   ├── types/             # TypeScript type definitions
│   │   └── App.tsx            # Root component
│   ├── tests/                 # Frontend tests
│   ├── package.json
│   └── tsconfig.json
│
├── Docs/                       # Project documentation
│   ├── CricketChronical-SRS.md  # Software Requirements Specification
│   ├── API.md                  # API documentation
│   ├── DatabaseSchema.md       # Database schema documentation
│   └── UserGuide.md            # User guide
│
├── ProjectManagement/          # SCRUM artifacts
│   ├── ProjectPlan.md          # Comprehensive project plan
│   ├── SprintIndex.md          # Sprint tracking index
│   ├── Sprints/                # Individual sprint documents
│   │   ├── Sprint-01.md
│   │   ├── Sprint-02.md
│   │   └── ...
│   └── Retrospectives/         # Sprint retrospectives
│
├── scripts/                    # Utility scripts
│   ├── seed-db.sh             # Database seeding
│   └── deploy.sh              # Deployment scripts
│
├── .gitignore
├── README.md
└── LICENSE
```

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis (optional, for caching)
- Git

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/cricket-chronicle.git
cd cricket-chronicle
```

#### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npx prisma migrate dev

# Seed database (optional)
npm run seed

# Start backend server
npm run dev
```

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env with backend API URL

# Start frontend development server
npm run dev
```

#### 4. Access the Application
- **Frontend:** http://localhost:5173 (or specified port)
- **Backend API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api-docs

---

## Documentation

Comprehensive documentation is available in the `/Docs` directory:

- **[Software Requirements Specification (SRS)](Docs/CricketChronical-SRS.md)**: Complete system requirements and specifications
- **[Project Plan](ProjectManagement/ProjectPlan.md)**: Product backlog, sprint planning, and roadmap
- **[Sprint Index](ProjectManagement/SprintIndex.md)**: Sprint tracking and progress

Additional documentation will be added as the project develops:
- API Documentation (Swagger/OpenAPI)
- Database Schema Documentation
- User Guides
- Developer Guides

---

## Development Workflow

This project follows SCRUM methodology with session-based sprints:

### Sprint Structure
- **Duration:** 3 sessions per sprint
  - **Session 1:** Sprint Planning or Continuation Review
  - **Session 2:** Development
  - **Session 3:** Testing and Retrospective

### Branch Strategy
- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: Feature branches (e.g., feature/scoring-engine)
- **bugfix/**: Bug fix branches
- **hotfix/**: Production hotfixes

### Commit Convention
We follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Build process or auxiliary tool changes

Example:
```bash
git commit -m "feat: add ball-by-ball recording interface"
```

### Testing
- **Unit Tests:** Minimum 80% coverage
- **Integration Tests:** All API endpoints
- **E2E Tests:** Critical user flows

Run tests:
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests
cd frontend && npm run test:e2e
```

---

## Contributing

> **Note:** This is a proprietary project. All contributions are subject to the Contributor Agreement outlined in the [LICENSE](LICENSE) file. By submitting a contribution, you grant the Licensor perpetual rights to use and incorporate your work.

### For Authorized Team Members
1. Create a feature branch from `develop`
2. Implement feature following Definition of Done (see ProjectPlan.md)
3. Write tests (unit, integration, E2E as applicable)
4. Ensure all tests pass and linting is clean
5. Create pull request to `develop`
6. Address code review feedback
7. Merge after approval

### Code Quality Standards
- TypeScript strict mode enabled
- ESLint and Prettier configured
- Pre-commit hooks with Husky
- Minimum 80% test coverage
- All tests must pass
- No console.log in production code

---

## License

**Proprietary License - All Rights Reserved**

This software is proprietary and confidential. The source code is made available for transparency, evaluation, and educational purposes only.

**You MAY:**
- View and study the source code
- Run locally for personal, non-commercial evaluation
- Submit bug fixes (subject to Contributor Agreement)

**You MAY NOT (without a commercial license):**
- Use for any commercial purpose
- Copy, modify, or distribute the software
- Host or deploy for third-party use
- Create derivative works

**Commercial Licensing Available For:**
- Provincial/National Cricket Associations
- Cricket Clubs and Leagues
- Sports Management Organizations

See the [LICENSE](LICENSE) file for complete terms.

**Licensing Inquiries:** [Contact Email]

---

## Contact & Support

**Project Maintainer:** Bala Kailash
**Email:** bala.kailash@gmail.com

For issues and feature requests, please use the GitHub Issues tracker.

---

## Acknowledgments

- Cricket scoring logic based on ICC playing conditions
- Built with modern web technologies and best practices
- Following SCRUM methodology for agile development

---

**Last Updated:** 2026-02-01
**Current Version:** 1.0.0 (In Development)
