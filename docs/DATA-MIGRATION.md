# Data Migration Guide

This guide explains how to migrate data from JSON files to PostgreSQL for the OpenTCG backend.

## Overview

The OpenTCG backend supports two storage modes:
- **Development/Test**: File-based storage using JSON files in the `data/` directory
- **Staging/Production**: PostgreSQL database storage

This migration script allows you to migrate existing JSON data to PostgreSQL when moving to staging or production environments.

## Prerequisites

Before running the migration:

1. **Docker and PostgreSQL running**
   ```bash
   docker-compose ps
   # Both opentcg-postgres and opentcg-app should be running
   ```

2. **Environment variables configured**
   - Ensure `.env.staging` exists with database credentials
   - The migration script runs on your **host machine** (not inside Docker)
   - It connects to PostgreSQL via `localhost:5432` (the exposed Docker port)
   - Default values: localhost:5432, user: postgres, password: postgres, db: opentcg

   **Note**: The `.env.staging` file has `DB_HOST=postgres` for the Docker app, but the migration script automatically uses `localhost` when running on the host machine.

3. **Dependencies installed**
   ```bash
   npm install
   ```

4. **Data files present**
   - Files should be in `data/` directories: matches, tournaments, decks, cards, sets

## Migration Command

### Basic Migration

```bash
npm run migrate:data
```

This will:
- Connect to PostgreSQL using credentials from `.env.staging`
- Read all JSON files from `data/` directories
- Insert data into PostgreSQL tables
- Show a summary of migrated records

### Dry Run (Preview Only)

Test the migration without writing to the database:

```bash
npm run migrate:data -- --dry-run
```

### Verbose Output

See detailed information about each migrated record:

```bash
npm run migrate:data -- --verbose
```

### Skip Existing Records

Skip records that already exist in the database (idempotent migration):

```bash
npm run migrate:data -- --skip-existing
```

### Combine Options

```bash
npm run migrate:data -- --dry-run --verbose
```

## Migration Order

The script migrates entities in this order to respect foreign key dependencies:

1. **Sets** (no dependencies)
2. **Cards** (depends on Sets via setName)
3. **Tournaments** (no dependencies)
4. **Decks** (depends on Cards and Tournaments)
5. **Matches** (depends on Tournaments and Decks)

## Data Mapping

### Sets

```
data/sets/*.json → sets table
```

JSON structure:
```json
{
  "metadata": {
    "setName": "base-set",
    "series": "pokemon",
    "dateReleased": "1999-01-09",
    "totalCards": 103
  }
}
```

### Cards

```
data/cards/*.json → cards table
```

Cards are grouped by set in JSON files. Each file contains an array of cards or an object with a `cards` array.

### Tournaments

```
data/tournaments/*.json → tournaments table
```

Tournaments include complex rules stored as JSONB (deckRules, startGameRules, setBannedCards).

### Decks

```
data/decks/*.json → decks table
```

Decks reference cards and tournaments. Card lists are stored as JSONB.

### Matches

```
data/matches/*.json → matches table
```

Matches contain complex game state stored as JSONB.

## Verification

After migration, verify the data was migrated correctly:

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d opentcg

# Check record counts
SELECT 'matches' as table, COUNT(*) FROM matches
UNION ALL
SELECT 'tournaments', COUNT(*) FROM tournaments
UNION ALL
SELECT 'decks', COUNT(*) FROM decks
UNION ALL
SELECT 'sets', COUNT(*) FROM sets
UNION ALL
SELECT 'cards', COUNT(*) FROM cards;

# View specific records
SELECT * FROM tournaments;
SELECT * FROM sets;

# Exit
\q
```

## Rollback

If you need to rollback the migration:

### Option 1: Drop and Recreate Database

```bash
docker-compose down -v  # ⚠️ This deletes ALL data
docker-compose up -d
```

### Option 2: Delete Specific Records

```bash
docker-compose exec postgres psql -U postgres -d opentcg

-- Delete all records from specific table
DELETE FROM matches;
DELETE FROM decks;
DELETE FROM cards;
DELETE FROM tournaments;
DELETE FROM sets;
```

## Troubleshooting

### Connection Errors

**Error**: `ENOTFOUND postgres` or `getaddrinfo ENOTFOUND postgres`

**Cause**: The migration script runs on your host machine and tries to connect to hostname `postgres` (Docker network name).

**Solution**: This is now automatically handled. The script uses `localhost` by default. If you still see this error:
1. Verify PostgreSQL container is running: `docker-compose ps postgres`
2. Check that port 5432 is exposed: `docker-compose ps` should show `0.0.0.0:5432->5432/tcp`
3. Override the host if needed: `MIGRATION_DB_HOST=localhost npm run migrate:data`

**Error**: `ECONNREFUSED` or `connection refused`

**Solution**:
1. Verify PostgreSQL is running: `docker-compose ps postgres`
2. Verify the container is healthy: look for "(healthy)" status
3. Test connection: `docker-compose exec postgres pg_isready -U postgres`
4. Check if port 5432 is available: `lsof -i :5432` (macOS/Linux)

### Migration Fails Midway

**Error**: Foreign key constraint violation

**Solution**:
- The migration respects dependency order (Sets → Cards → Tournaments → Decks → Matches)
- If migration fails, check the error message for which entity failed
- You may need to clean up partial data before re-running

### Duplicate Key Errors

**Error**: `duplicate key value violates unique constraint`

**Solution**:
- Use `--skip-existing` flag to skip duplicate records
- Or manually delete existing records before re-migrating

### TypeORM Errors

**Error**: `Data type not supported` or `Column not found`

**Solution**:
- Ensure all ORM entities match the expected JSON structure
- Check that enum values in JSON match enum definitions in code
- Verify JSONB fields are valid JSON objects

## Example Output

```
🚀 Starting data migration to PostgreSQL...

📡 Connecting to database...
✅ Database connected

📦 Migrating Sets...
✅ Sets migrated: 1

🃏 Migrating Cards...
✅ Cards migrated: 103

🏆 Migrating Tournaments...
✅ Tournaments migrated: 2

📚 Migrating Decks...
✅ Decks migrated: 0

⚔️  Migrating Matches...
✅ Matches migrated: 1

==================================================
📊 MIGRATION SUMMARY
==================================================

Sets:        1 ✅ 0 ❌ 0 ⊘
Cards:       103 ✅ 0 ❌ 0 ⊘
Tournaments: 2 ✅ 0 ❌ 0 ⊘
Decks:       0 ✅ 0 ❌ 0 ⊘
Matches:     1 ✅ 0 ❌ 0 ⊘

TOTAL:       107 ✅ 0 ❌ 0 ⊘

✨ Migration completed successfully!

📡 Database connection closed
```

## Post-Migration

After successful migration:

1. **Verify data integrity** using SQL queries
2. **Test the application** in staging mode
3. **Backup the database**
   ```bash
   docker-compose exec postgres pg_dump -U postgres opentcg > backup.sql
   ```
4. **Monitor application logs** for any issues

## Environment Switching

### Development (File-based)
```bash
NODE_ENV=dev npm run start:dev
```
- Uses file-based repositories
- Data stored in `data/` directories
- No database connection required

### Staging (PostgreSQL)
```bash
NODE_ENV=staging npm start
```
- Uses TypeORM repositories
- Data stored in PostgreSQL
- Requires database connection

## Support

For issues or questions:
1. Check the error message in migration output
2. Review PostgreSQL logs: `docker-compose logs postgres`
3. Verify data file formats match expected structure
4. Check ORM entity definitions in `src/modules/*/infrastructure/persistence/entities/`

## Related Documentation

- [Staging Setup](./STAGING-SETUP.md) - Docker and staging environment setup
- [Repository Strategy](./REPOSITORY-STRATEGY.md) - File-based vs PostgreSQL repositories
- [Docker Quick Start](./DOCKER-QUICK-START.md) - Docker commands and troubleshooting

