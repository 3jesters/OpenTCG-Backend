# OpenTCG

An open-source Trading Card Game platform with backend API and frontend application.

## Project Structure

This is a monorepo containing multiple applications:

```
OpenTCG/
├── apps/
│   ├── backend/     # NestJS backend API
│   └── frontend/    # Frontend application (coming soon)
├── cursor-global-rules.md
└── RULES-SETUP.md
```

## Applications

### Backend

A NestJS backend API following clean architecture principles, TDD practices, and dependency injection patterns.

**Location:** `apps/backend/`

**Technologies:**
- NestJS (Node.js framework)
- TypeScript
- Clean Architecture
- Test-Driven Development (TDD)

**Getting Started:**
```bash
cd apps/backend
npm install
npm run start:dev
```

See `apps/backend/README.md` for detailed documentation.

### Frontend

Coming soon. See frontend documentation for planning and integration:
- `docs/FRONTEND-APP.md` - Complete frontend application guide
- `docs/FRONTEND-QUICK-REFERENCE.md` - Quick API reference for developers
- `docs/FRONTEND-COMPONENT-GUIDE.md` - UI component specifications

## Documentation

### Project Documentation
- `cursor-global-rules.md` - Global project rules and guidelines
- `RULES-SETUP.md` - Setup and configuration rules

### Backend Documentation
- `apps/backend/README.md` - Backend-specific documentation
- `docs/API.md` - REST API documentation

### Frontend Documentation
- `docs/FRONTEND-APP.md` - Complete frontend application guide
- `docs/FRONTEND-QUICK-REFERENCE.md` - Quick API reference
- `docs/FRONTEND-COMPONENT-GUIDE.md` - UI component guide

## Project Philosophy

This project follows:
- **Clean Architecture**: Business logic isolated from framework dependencies
- **Test-Driven Development**: Tests written before implementation
- **Dependency Injection**: All dependencies abstracted and injected
- **Domain-Driven Design**: Organized by business domains, not technical layers

## License

UNLICENSED

