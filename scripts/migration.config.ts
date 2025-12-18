import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.staging
config({ path: join(process.cwd(), '.env.staging') });

/**
 * Migration Configuration
 * Provides database connection details and file paths for migration
 * 
 * Note: The migration script runs on the host machine, not inside Docker.
 * Therefore, we use 'localhost' to connect to the PostgreSQL container
 * (which is exposed on port 5432 from the host machine).
 */
export const migrationConfig = {
  // Database connection
  database: {
    type: 'postgres' as const,
    // Use localhost for host machine access, override with MIGRATION_DB_HOST if needed
    host: process.env.MIGRATION_DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'opentcg',
  },

  // Data file paths
  dataPaths: {
    matches: join(process.cwd(), 'data', 'matches'),
    tournaments: join(process.cwd(), 'data', 'tournaments'),
    decks: join(process.cwd(), 'data', 'decks'),
    cards: join(process.cwd(), 'data', 'cards'),
    sets: join(process.cwd(), 'data', 'sets'),
  },

  // Migration options
  options: {
    dryRun: process.argv.includes('--dry-run'),
    verbose: process.argv.includes('--verbose'),
    skipExisting: process.argv.includes('--skip-existing'),
  },
};

