# Migration Architecture

## Overview

The data migration system allows you to migrate data from JSON files to PostgreSQL when transitioning from development (file-based) to staging/production (database-based) environments.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Host Machine                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Migration Script (ts-node)                        │    │
│  │  scripts/migrate-to-postgres.ts                    │    │
│  │                                                     │    │
│  │  - Reads: data/matches/*.json                      │    │
│  │  - Reads: data/tournaments/*.json                  │    │
│  │  - Reads: data/decks/*.json                        │    │
│  │  - Reads: data/cards/*.json                        │    │
│  │  - Reads: data/sets/*.json                         │    │
│  │                                                     │    │
│  │  Connects via: localhost:5432 ────────────────┐    │    │
│  └────────────────────────────────────────────────┼────┘    │
│                                                   │         │
└───────────────────────────────────────────────────┼─────────┘
                                                    │
                         Port Mapping (5432:5432)   │
                                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Container (opentcg-postgres)             │  │
│  │  - Internal hostname: postgres                       │  │
│  │  - External access: localhost:5432                   │  │
│  │                                                       │  │
│  │  Tables:                                             │  │
│  │  - matches (JSONB: gameState)                       │  │
│  │  - tournaments (JSONB: deckRules, startGameRules)   │  │
│  │  - decks (JSONB: cards)                             │  │
│  │  - sets                                             │  │
│  │  - cards (JSONB: attacks, ability, etc.)           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  NestJS App Container (opentcg-app)                  │  │
│  │  - Uses: DB_HOST=postgres (Docker network)          │  │
│  │  - TypeORM repositories connect internally          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Host Machine Execution

**Why**: The migration script runs on the host machine (not inside Docker) because:
- Easier access to local `data/` directory files
- No need to rebuild Docker images for migration
- Simpler debugging and logging
- Can use local development tools (ts-node)

**Connection**: Uses `localhost:5432` to access the PostgreSQL container via Docker's port mapping.

### 2. Separate Hostname Configuration

**App vs Migration**:
- **NestJS App** (inside Docker): Uses `DB_HOST=postgres` (Docker network hostname)
- **Migration Script** (on host): Uses `MIGRATION_DB_HOST=localhost` (port-mapped access)

This is handled automatically in `scripts/migration.config.ts`:
```typescript
host: process.env.MIGRATION_DB_HOST || 'localhost',
```

### 3. Migration Order

Entities are migrated in dependency order to respect foreign key constraints:

```
1. Sets           (no dependencies)
2. Cards          (foreign key: setName → sets.id)
3. Tournaments    (no dependencies)
4. Decks          (foreign keys: tournamentId, references cards)
5. Matches        (foreign keys: tournamentId, player1DeckId, player2DeckId)
```

### 4. JSONB Strategy

Complex nested objects are stored as JSONB rather than normalized tables:

**Why JSONB**:
- ✅ Matches domain model structure (less impedance mismatch)
- ✅ Flexible schema for game state evolution
- ✅ PostgreSQL provides excellent JSONB query and indexing support
- ✅ Simpler migrations (no complex JOIN queries)
- ✅ Atomic updates of entire state objects

**JSONB Fields**:
- `matches.gameState` - Complete game state (players, zones, cards in play)
- `tournaments.deckRules` - Deck construction rules
- `tournaments.startGameRules` - Initial hand validation rules
- `tournaments.setBannedCards` - Per-set card bans
- `decks.cards` - Card list with quantities
- `cards.attacks` - Attack definitions with effects
- `cards.ability` - Ability definition
- `cards.evolvesFrom`, `cards.evolvesTo` - Evolution chains
- `cards.weakness`, `cards.resistance` - Combat modifiers

### 5. Repository Pattern

Both storage mechanisms (files and PostgreSQL) implement the same repository interfaces:

```typescript
// Domain layer (interface)
interface IMatchRepository {
  findById(id: string): Promise<Match | null>;
  findAll(): Promise<Match[]>;
  save(match: Match): Promise<Match>;
  // ...
}

// Infrastructure layer (implementations)
class FileSystemMatchRepository implements IMatchRepository { /* ... */ }
class TypeOrmMatchRepository implements IMatchRepository { /* ... */ }
```

**Benefits**:
- Clean architecture compliance
- Testability (mock repositories in tests)
- Environment switching without code changes
- Migration script can reuse domain logic

### 6. Environment-Based Selection

Repository selection is automatic based on `NODE_ENV`:

```typescript
const nodeEnv = process.env.NODE_ENV || 'dev';

providers: [
  {
    provide: IMatchRepository,
    useClass: nodeEnv === 'dev' || nodeEnv === 'test'
      ? FileSystemMatchRepository
      : TypeOrmMatchRepository,
  },
]
```

## Migration Script Components

### 1. Configuration (`scripts/migration.config.ts`)

- Loads environment variables from `.env.staging`
- Provides database connection details
- Defines data file paths
- Parses command-line options

### 2. Migration Script (`scripts/migrate-to-postgres.ts`)

- Initializes TypeORM DataSource manually
- Reads JSON files from `data/` directories
- Creates ORM entities from JSON data
- Saves to PostgreSQL using TypeORM
- Tracks success/failure statistics
- Provides detailed logging

### 3. ORM Entities

Each domain entity has a corresponding ORM entity:
- `MatchOrmEntity` - Maps `Match` domain entity to database
- `TournamentOrmEntity` - Maps `Tournament` domain entity
- `DeckOrmEntity` - Maps `Deck` domain entity
- `SetOrmEntity` - Maps `Set` domain entity
- `CardOrmEntity` - Maps `Card` domain entity

### 4. Mappers

Mappers convert between domain entities and ORM entities:
- `MatchOrmMapper` - Handles complex `gameState` JSONB
- `TournamentOrmMapper` - Handles `deckRules` and `startGameRules` JSONB
- `DeckOrmMapper` - Handles `cards` array JSONB
- `SetOrmMapper` - Simple scalar field mapping
- `CardOrmMapper` - Handles multiple JSONB fields (attacks, ability, etc.)

## Data Flow

### Development Mode (Files)

```
User Action
    ↓
Controller
    ↓
Use Case
    ↓
FileSystemRepository (IRepository implementation)
    ↓
data/*.json files
```

### Staging/Production Mode (PostgreSQL)

```
User Action
    ↓
Controller
    ↓
Use Case
    ↓
TypeOrmRepository (IRepository implementation)
    ↓
TypeORM Mapper
    ↓
PostgreSQL Database
```

### Migration (Files → PostgreSQL)

```
Migration Script
    ↓
Read data/*.json files
    ↓
Parse JSON
    ↓
Create domain entities
    ↓
Convert to ORM entities via Mappers
    ↓
TypeORM.save()
    ↓
PostgreSQL Database
```

## Benefits of This Architecture

1. **Clean Separation**: Business logic remains independent of storage mechanism
2. **Testability**: Easy to mock repositories for unit tests
3. **Flexibility**: Can add new storage backends without changing domain logic
4. **Development Speed**: File-based storage allows rapid development without database setup
5. **Production Ready**: PostgreSQL provides ACID guarantees, indexing, and querying
6. **Migration Safety**: Dry-run mode allows previewing migrations without writes
7. **Idempotency**: `--skip-existing` flag allows safe re-runs

## Performance Considerations

1. **Bulk Insert**: Card repository uses chunked bulk inserts (100 at a time)
2. **JSONB Indexes**: PostgreSQL allows GIN indexes on JSONB fields for fast queries
3. **Connection Pooling**: TypeORM manages connection pools automatically
4. **Transaction Support**: Each entity type migrated in a single transaction

## Security Considerations

1. **Environment Variables**: Sensitive credentials loaded from `.env.staging` (gitignored)
2. **SQL Injection**: TypeORM parameterized queries prevent SQL injection
3. **Connection Encryption**: Can enable SSL for production PostgreSQL connections
4. **Least Privilege**: Database user should have only necessary permissions

## Extending the Migration

To add a new entity type:

1. Create ORM entity in `src/modules/[entity]/infrastructure/persistence/entities/`
2. Create mapper in `src/modules/[entity]/infrastructure/persistence/mappers/`
3. Create TypeORM repository implementing domain interface
4. Add entity to DataSource in `scripts/migrate-to-postgres.ts`
5. Add migration logic in appropriate order
6. Update module with conditional repository injection

## Related Documentation

- [Data Migration Guide](./DATA-MIGRATION.md) - Usage instructions
- [Staging Setup](./STAGING-SETUP.md) - Docker environment setup
- [Repository Strategy](./REPOSITORY-STRATEGY.md) - Repository pattern details

