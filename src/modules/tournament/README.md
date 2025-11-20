# Tournament Module

## Overview

The Tournament module manages tournament configurations, rules, and deck restrictions for the OpenTCG backend system. It follows clean architecture principles with clear separation between domain logic, application use cases, infrastructure, and presentation layers.

## Features

- ✅ Tournament creation and management (CRUD operations)
- ✅ Flexible set management (blacklist-based with default allow-all)
- ✅ Individual card banning per set
- ✅ Card-specific copy restrictions
- ✅ Customizable deck construction rules
- ✅ Tournament lifecycle management (DRAFT, ACTIVE, COMPLETED, CANCELLED)
- ✅ JSON file-based persistence
- ✅ RESTful API endpoints
- ✅ Comprehensive unit tests
- ✅ Full TypeScript type safety

## Architecture

```
tournament/
├── domain/               # Business logic & entities (framework-agnostic)
│   ├── entities/        # Tournament aggregate root
│   ├── value-objects/   # DeckRules, RestrictedCard
│   ├── enums/           # TournamentStatus
│   └── repositories/    # Repository interfaces
├── application/         # Use cases & DTOs
│   ├── use-cases/       # Business workflows
│   └── dto/             # Data transfer objects
├── infrastructure/      # External concerns
│   └── persistence/     # JSON file repository & mappers
├── presentation/        # HTTP layer
│   ├── controllers/     # REST controllers
│   └── dto/             # Response DTOs
├── docs/                # Documentation
│   ├── domain-model.md
│   ├── business-rules.md
│   └── use-cases.md
└── tournament.module.ts # NestJS module configuration
```

## Quick Start

### Creating a Tournament

```typescript
POST /api/v1/tournaments
Content-Type: application/json

{
  "id": "my-tournament",
  "name": "My Tournament",
  "version": "1.0",
  "description": "A custom tournament",
  "author": "organizer-name",
  "deckRules": {
    "minDeckSize": 60,
    "maxDeckSize": 60,
    "exactDeckSize": true,
    "maxCopiesPerCard": 4,
    "minBasicPokemon": 1
  }
}
```

### Retrieving Tournaments

```typescript
// Get all tournaments
GET /api/v1/tournaments

// Get specific tournament
GET /api/v1/tournaments/default-tournament
```

### Updating a Tournament

```typescript
PUT /api/v1/tournaments/my-tournament
Content-Type: application/json

{
  "status": "ACTIVE",
  "bannedSets": ["unwanted-set"],
  "setBannedCards": {
    "base-set": ["overpowered-card-1", "overpowered-card-2"]
  }
}
```

### Deleting a Tournament

```typescript
DELETE /api/v1/tournaments/my-tournament
```

## Default Tournament

A default tournament configuration is automatically available:

- **ID**: `default-tournament`
- **Rules**: Standard Pokémon TCG rules (60-card deck, max 4 copies)
- **Sets**: All sets allowed
- **Format**: Standard
- **Status**: ACTIVE

Load it using: `GET /api/v1/tournaments/default-tournament`

## Key Concepts

### Set Management

By default, **all sets are allowed**. Use `bannedSets` to exclude specific sets:

```json
{
  "bannedSets": ["unwanted-set-1", "unwanted-set-2"]
}
```

### Card Banning

Ban individual cards within sets using `setBannedCards`:

```json
{
  "setBannedCards": {
    "base-set": ["alakazam-base-1"],
    "fossil": ["moltres-fossil-12"]
  }
}
```

### Card Restrictions

Limit specific cards to fewer copies than the default:

```json
{
  "deckRules": {
    "maxCopiesPerCard": 4,
    "restrictedCards": [
      {
        "setName": "base-set",
        "cardId": "charizard-base-4",
        "maxCopies": 1
      }
    ]
  }
}
```

### Validation Hierarchy

When checking if a card is allowed:

1. **Set banned?** → Card banned (max copies = 0)
2. **Card banned?** → Card banned (max copies = 0)
3. **Card restricted?** → Use restricted max copies
4. **Otherwise** → Use default `maxCopiesPerCard`

## Domain Rules

### Deck Construction Rules

```typescript
interface DeckRules {
  minDeckSize: number;        // Minimum cards (typically 60)
  maxDeckSize: number;        // Maximum cards (typically 60)
  exactDeckSize: boolean;     // Must be exact size?
  maxCopiesPerCard: number;   // Default max copies (typically 4)
  minBasicPokemon: number;    // Minimum basic Pokémon (typically 1)
  restrictedCards: Array<{    // Cards with special limits
    setName: string;
    cardId: string;
    maxCopies: number;
  }>;
}
```

### Tournament Lifecycle

```
DRAFT → ACTIVE → COMPLETED
   ↓
CANCELLED
```

- **DRAFT**: Being configured
- **ACTIVE**: Currently running
- **COMPLETED**: Finished
- **CANCELLED**: Archived

## Testing

```bash
# Run unit tests
npm test -- tournament

# Run specific test file
npm test -- tournament.entity.spec.ts

# Test coverage
npm test -- --coverage tournament
```

## Data Storage

Tournaments are stored as JSON files in `data/tournaments/`:

```
data/tournaments/
├── default-tournament.json
├── classic-tournament.json
└── my-tournament.json
```

Each file contains the complete tournament configuration.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tournaments` | Create tournament |
| GET | `/api/v1/tournaments` | List all tournaments |
| GET | `/api/v1/tournaments/:id` | Get tournament by ID |
| PUT | `/api/v1/tournaments/:id` | Update tournament |
| DELETE | `/api/v1/tournaments/:id` | Delete tournament |

## Future Enhancements

- [ ] Deck validation against tournament rules
- [ ] Match creation within tournament context
- [ ] Tournament standings and rankings
- [ ] Player registration
- [ ] Swiss pairing system
- [ ] Bracket generation (single/double elimination)
- [ ] Tournament reporting and statistics

## Dependencies

- NestJS (framework)
- class-validator (DTO validation)
- class-transformer (DTO transformation)
- TypeScript (type safety)

## Related Modules

- **Card Module**: Provides card data that tournaments reference
- **Set Module**: Manages card sets that can be allowed/banned
- **Deck Module** (future): Will validate decks against tournament rules
- **Match Module** (future): Will create matches within tournaments

## Documentation

- [Domain Model](./docs/domain-model.md) - Entities, value objects, relationships
- [Business Rules](./docs/business-rules.md) - Detailed business logic
- [Use Cases](./docs/use-cases.md) - Application workflows

## Contributing

When modifying the Tournament module:

1. Update domain entities for business logic changes
2. Add/update use cases for new workflows
3. Update DTOs for API changes
4. Add unit tests for new functionality
5. Update documentation (especially if business rules change)
6. Follow clean architecture principles

## License

Part of the OpenTCG Backend project.

