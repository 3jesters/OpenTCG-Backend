# OpenTCG Backend

An open-source Trading Card Game backend API built with NestJS, featuring clean architecture, comprehensive game mechanics, and AI player support.

> **⚠️ LEGAL DISCLAIMER**: This is an educational fan project based on Pokémon TCG. This project contains references to Pokémon characters, names, and game mechanics which are the intellectual property of Nintendo, The Pokémon Company, and Game Freak. This project is **not affiliated with, endorsed by, or associated with** Nintendo, The Pokémon Company, or Game Freak. All Pokémon-related trademarks and copyrights are the property of their respective owners. This project is intended for **educational and non-commercial purposes only**.

## Features

- 🎮 **Complete TCG Game Engine**: Full implementation of trading card game mechanics
- 🏗️ **Clean Architecture**: Domain-driven design with clear separation of concerns
- 🤖 **AI Player Support**: Built-in AI for single-player matches
- 🃏 **Card Management**: Create, edit, and manage card sets
- 🎯 **Match System**: Complete match lifecycle with turn-based gameplay
- 🏆 **Tournament Support**: Multi-player tournament management
- 📦 **Deck Builder**: Deck creation and validation
- 🧪 **Test-Driven Development**: Comprehensive test coverage (80%+)
- 🔌 **REST API**: Well-documented HTTP endpoints
- 🐳 **Docker Ready**: Easy deployment with Docker Compose

## Prerequisites

- **Node.js**: v20 or higher
- **npm**: v9 or higher
- **PostgreSQL**: v15 or higher (for production/staging)
- **Docker** (optional): For containerized deployment

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/OpenTCG-Backend.git
cd OpenTCG-Backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your settings (defaults work for local development).

### 4. Start Development Server

**Option A: Development Mode (JSON file storage)**
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

**Option B: With PostgreSQL (Docker)**
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run migrations
npm run migrate:data

# Start in staging mode
NODE_ENV=staging npm run start:dev
```

### 5. Verify Installation

Visit `http://localhost:3000` - you should see the API welcome message.

## Project Structure

```
OpenTCG-Backend/
├── src/
│   ├── modules/
│   │   ├── card/           # Card management module
│   │   ├── deck/           # Deck builder module
│   │   ├── match/          # Match gameplay module
│   │   ├── set/            # Card set module
│   │   └── tournament/     # Tournament module
│   ├── shared/             # Shared utilities and infrastructure
│   └── main.ts             # Application entry point
├── test/                   # E2E tests
├── data/                   # Card data and game assets
├── docs/                   # Documentation
├── scripts/                # Utility scripts
└── docker-compose.yml      # Docker configuration
```

### Module Architecture

Each module follows clean architecture principles:

```
module/
├── domain/                 # Business entities and rules
│   ├── entities/
│   ├── value-objects/
│   ├── repositories/       # Repository interfaces
│   └── services/           # Domain services
├── application/            # Use cases and application logic
│   ├── use-cases/
│   └── dto/
├── infrastructure/         # External dependencies
│   ├── persistence/        # Database implementations
│   └── external/           # Third-party integrations
├── presentation/           # HTTP layer
│   ├── controllers/
│   └── dto/
└── docs/                   # Module documentation
```

## Available Scripts

```bash
# Development
npm run start:dev           # Start with hot-reload
npm run start:debug         # Start with debugger

# Production
npm run build               # Build for production
npm run start:prod          # Start production server

# Testing
npm test                    # Run unit tests
npm run test:watch          # Run tests in watch mode
npm run test:cov            # Run tests with coverage
npm run test:e2e            # Run end-to-end tests

# Code Quality
npm run lint                # Lint and fix code
npm run format              # Format code with Prettier

# Database
npm run migrate:data        # Migrate JSON data to PostgreSQL
```

## API Documentation

### Available Endpoints

- **Cards API**: `/api/v1/cards` - Card management and queries
- **Sets API**: `/api/v1/sets` - Card set management
- **Decks API**: `/api/v1/decks` - Deck builder
- **Matches API**: `/api/v1/matches` - Game matches
- **Tournaments API**: `/api/v1/tournaments` - Tournament system

For detailed API documentation, see:
- [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md) - Complete API reference
- [`docs/CARD-EDITOR-API-SUMMARY.md`](docs/CARD-EDITOR-API-SUMMARY.md) - Card editor API

## Docker Deployment

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

Services:
- **API**: `http://localhost:3000`
- **PostgreSQL**: `localhost:5432`

## Testing

This project follows Test-Driven Development (TDD) practices:

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:cov

# Run E2E tests
npm run test:e2e
```

**Test Coverage Goals**:
- Domain layer: 100%
- Application layer: 100%
- Infrastructure: 70%+
- Overall: 80%+

## Project Philosophy

### Clean Architecture
- Business logic isolated from framework dependencies
- Dependencies point inward (outer layers depend on inner layers)
- Domain entities are framework-agnostic

### Test-Driven Development
- Tests written before implementation
- High test coverage maintained
- All business logic is testable

### Dependency Injection
- All dependencies abstracted behind interfaces
- Repository pattern for data access
- Easy to mock and test

### Domain-Driven Design
- Organized by business domains, not technical layers
- Rich domain models with business logic
- Ubiquitous language throughout

## Documentation

### Core Documentation
- [`LICENSE`](LICENSE) - MIT License with educational disclaimer
- [`CONTRIBUTING.md`](CONTRIBUTING.md) - Contribution guidelines (coming soon)
- [`docs/BUSINESS-LOGIC.md`](docs/BUSINESS-LOGIC.md) - Business rules and logic
- [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md) - API documentation

### Development Documentation
- [`cursor-global-rules.md`](cursor-global-rules.md) - Development guidelines
- [`RULES-SETUP.md`](RULES-SETUP.md) - IDE setup instructions
- [`MIGRATION-VALIDATION.md`](MIGRATION-VALIDATION.md) - Database migration guide

### Module Documentation
Each module has its own `docs/` folder with:
- `business-rules.md` - Domain rules and constraints
- `use-cases.md` - Application workflows
- `domain-model.md` - Entity relationships

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes following our coding standards
4. Write tests for your changes
5. Ensure all tests pass: `npm test`
6. Commit with conventional commits: `git commit -m "feat: add new feature"`
7. Push to your fork: `git push origin feature/my-feature`
8. Open a Pull Request

## Technologies

- **Framework**: [NestJS](https://nestjs.com/) v11
- **Language**: [TypeScript](https://www.typescriptlang.org/) v5
- **Database**: [PostgreSQL](https://www.postgresql.org/) v15 + [TypeORM](https://typeorm.io/)
- **Testing**: [Jest](https://jestjs.io/) + [Supertest](https://github.com/visionmedia/supertest)
- **Validation**: [class-validator](https://github.com/typestack/class-validator)
- **Documentation**: [Swagger/OpenAPI](https://swagger.io/)

## Roadmap

- [ ] Swagger/OpenAPI documentation UI
- [ ] Authentication and authorization
- [ ] WebSocket support for real-time gameplay
- [ ] GraphQL API
- [ ] Frontend application
- [ ] Multiplayer matchmaking
- [ ] Card trading system
- [ ] Leaderboards and rankings

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Important**: The MIT License applies to the code and architecture of this project. Pokémon-related content (characters, names, artwork, game mechanics) remains the intellectual property of Nintendo, The Pokémon Company, and Game Freak. This project is for educational purposes only and is not intended for commercial use.

## Acknowledgments

- Pokémon TCG rules and mechanics by The Pokémon Company
- Built with [NestJS](https://nestjs.com/)
- Inspired by the Pokémon Trading Card Game

## Support

- 📫 **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/OpenTCG-Backend/issues)
- 📖 **Documentation**: See `docs/` folder
- 💬 **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/OpenTCG-Backend/discussions)

---

**Made with ❤️ for the Pokémon TCG community**