# Repository Strategy Documentation

## Overview

The Match module uses an environment-based repository strategy that automatically selects the appropriate persistence layer based on `NODE_ENV`.

## Repository Implementations

### FileSystemMatchRepository
- **Environments**: `dev`, `test`
- **Storage**: JSON files in `data/matches/` directory
- **Use Case**: Local development and testing
- **Benefits**: 
  - No database setup required
  - Fast for development
  - Easy to inspect/debug match data
  - Isolated test data

### TypeOrmMatchRepository
- **Environments**: `staging`, `production` (any value other than `dev`/`test`)
- **Storage**: PostgreSQL database
- **Use Case**: Staging and production deployments
- **Benefits**:
  - Scalable and performant
  - ACID transactions
  - Efficient querying with indexes
  - JSONB support for complex gameState queries

## Environment Detection

The repository selection happens automatically in `MatchModule`:

```typescript
{
  provide: IMatchRepository,
  useClass:
    process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'test'
      ? FileSystemMatchRepository
      : TypeOrmMatchRepository,
}
```

## Database Schema

### Match Table Structure

- **Primary Key**: `id` (UUID)
- **Indexes**: 
  - `tournamentId`
  - `player1Id`
  - `player2Id`
  - `state`
- **JSONB Column**: `gameState` - stores complete game state as JSONB for efficient querying
- **Timestamps**: `createdAt`, `updatedAt` (automatically managed)

### GameState Storage

The `gameState` is stored as PostgreSQL JSONB, allowing:
- Efficient storage and retrieval
- Indexing on JSONB paths
- Querying nested fields
- Partial updates

## Migration Path

### From File-Based to Database

When moving from dev to staging:
1. No data migration needed - they're separate storage systems
2. Staging starts fresh with PostgreSQL
3. Development continues using file-based storage

### Data Export/Import

To migrate data from files to database:
1. Read matches from `data/matches/*.json`
2. Use `MatchMapper.toDomain()` to convert JSON to domain entities
3. Use `TypeOrmMatchRepository.save()` to persist to database

## Testing Strategy

All tests use `FileSystemMatchRepository` automatically:
- `NODE_ENV=test` is set in test configuration
- No database setup required for tests
- Tests remain fast and isolated
- Unit tests mock `IMatchRepository` interface (no changes needed)

## Configuration

### Development (`NODE_ENV=dev`)
- Uses file-based storage
- No database configuration needed
- Data stored in `data/matches/` directory

### Staging (`NODE_ENV=staging`)
- Uses PostgreSQL via Docker
- Configure via `.env.staging`:
  ```env
  DB_HOST=postgres
  DB_PORT=5432
  DB_USERNAME=postgres
  DB_PASSWORD=your_password
  DB_DATABASE=opentcg
  ```

### Production (`NODE_ENV=production`)
- Uses PostgreSQL (external or managed)
- Configure via environment variables
- Database migrations should be used (synchronize disabled)

## Clean Architecture Compliance

Both repositories:
- Implement the same `IMatchRepository` interface (domain layer)
- Are located in the infrastructure layer
- Use mappers to convert between domain and persistence representations
- Keep domain entities framework-agnostic
- Follow dependency inversion principle

